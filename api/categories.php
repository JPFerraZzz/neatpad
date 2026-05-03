<?php
require_once __DIR__ . '/auth_check.php';
$uid = requireAuth();

require_once __DIR__ . '/db.php';

$db     = getDB();
require_once __DIR__ . '/../np-gest/inc/app_last_seen.php';
neatpad_touch_last_seen($db, $uid);
$method = $_SERVER['REQUEST_METHOD'];
$input  = getInput();

if ($method === 'POST') {
    rateLimit('categories_create:' . $uid, 40, 3600);
}

// Sanitização: nome sem tags; cor restrita a #RRGGBB; icon e template a slugs simples
if (is_array($input)) {
    if (isset($input['name']) && is_string($input['name'])) {
        $input['name'] = trim(strip_tags($input['name']));
        if (mb_strlen($input['name']) > 100) $input['name'] = mb_substr($input['name'], 0, 100);
    }
    if (isset($input['icon']) && is_string($input['icon'])) {
        $input['icon'] = preg_replace('/[^a-z0-9_-]/i', '', $input['icon']) ?: 'folder';
    }
    if (isset($input['template_type']) && is_string($input['template_type'])) {
        $input['template_type'] = preg_replace('/[^a-z0-9_-]/i', '', $input['template_type']) ?: 'simple';
    }
    if (isset($input['color']) && is_string($input['color'])) {
        $input['color'] = preg_match('/^#[0-9a-f]{6}$/i', $input['color']) ? $input['color'] : '#3498db';
    }
}

try {
    switch ($method) {
        case 'GET':
            $stmt = $db->prepare("
                SELECT c.*, COUNT(i.id) AS item_count
                FROM categories c
                LEFT JOIN items i ON c.id = i.category_id
                WHERE c.user_uid = ?
                GROUP BY c.id
                ORDER BY c.created_at DESC
            ");
            $stmt->execute([$uid]);
            jsonResponse(true, $stmt->fetchAll());
            break;

        case 'POST':
            if (empty($input['name'])) {
                jsonResponse(false, null, 'Nome da categoria é obrigatório', 400);
            }
            $stmt = $db->prepare("
                INSERT INTO categories (user_uid, name, icon, color, template_type)
                VALUES (:user_uid, :name, :icon, :color, :template_type)
            ");
            $stmt->execute([
                'user_uid'      => $uid,
                'name'          => $input['name'],
                'icon'          => $input['icon']          ?? 'folder',
                'color'         => $input['color']         ?? '#3498db',
                'template_type' => $input['template_type'] ?? 'simple',
            ]);
            $id   = $db->lastInsertId();
            $stmt = $db->prepare("SELECT * FROM categories WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse(true, $stmt->fetch());
            break;

        case 'PUT':
            if (empty($input['id'])) {
                jsonResponse(false, null, 'ID da categoria é obrigatório', 400);
            }
            $stmt = $db->prepare("
                UPDATE categories
                SET name = :name, icon = :icon, color = :color, template_type = :template_type
                WHERE id = :id AND user_uid = :user_uid
            ");
            $stmt->execute([
                'id'            => $input['id'],
                'user_uid'      => $uid,
                'name'          => $input['name'],
                'icon'          => $input['icon'],
                'color'         => $input['color'],
                'template_type' => $input['template_type'],
            ]);
            $stmt = $db->prepare("SELECT * FROM categories WHERE id = ? AND user_uid = ?");
            $stmt->execute([$input['id'], $uid]);
            jsonResponse(true, $stmt->fetch());
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (empty($id)) {
                jsonResponse(false, null, 'ID da categoria é obrigatório', 400);
            }
            // Confirmar que a categoria pertence ao utilizador antes de apagar
            $chk = $db->prepare("SELECT id FROM categories WHERE id = ? AND user_uid = ?");
            $chk->execute([$id, $uid]);
            if (!$chk->fetch()) {
                jsonResponse(false, null, 'Categoria não encontrada', 404);
            }
            // Apaga registos dependentes explicitamente para garantir limpeza mesmo
            // que a instância MySQL não tenha as FK CASCADE activas.
            $db->prepare("
                DELETE nv FROM note_versions nv
                JOIN items i ON nv.item_id = i.id
                WHERE i.category_id = ?
            ")->execute([$id]);
            $db->prepare("
                DELETE s FROM subtasks s
                JOIN items i ON s.item_id = i.id
                WHERE i.category_id = ?
            ")->execute([$id]);
            $db->prepare("DELETE FROM items WHERE category_id = ?")->execute([$id]);
            $stmt = $db->prepare("DELETE FROM categories WHERE id = ? AND user_uid = ?");
            $stmt->execute([$id, $uid]);
            jsonResponse(true, ['message' => 'Categoria eliminada com sucesso']);
            break;

        default:
            jsonResponse(false, null, 'Método não suportado', 405);
    }
} catch (Exception $e) {
    error_log('[NeatPad categories] ' . $e->getMessage());
    jsonResponse(false, null, NEATPAD_IS_PRODUCTION ? 'Erro ao processar pedido' : $e->getMessage(), 500);
}
