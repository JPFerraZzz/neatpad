<?php
require_once __DIR__ . '/auth_check.php';
$uid = requireAuth();

require_once __DIR__ . '/db.php';

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        // Apenas versões de itens do utilizador (apenas categorias do tipo cadernos)
        $stmt = $db->prepare("
            SELECT
                i.id AS item_id,
                i.title,
                i.priority,
                c.name AS category_name,
                c.template_type,
                c.color AS category_color,
                COUNT(nv.id) AS version_count,
                SUM(LENGTH(nv.content)) AS total_size,
                MAX(nv.created_at) AS last_version_at
            FROM note_versions nv
            JOIN items i ON i.id = nv.item_id
            JOIN categories c ON c.id = i.category_id
            WHERE c.user_uid = ? AND c.template_type = 'notebooks'
            GROUP BY nv.item_id
            ORDER BY last_version_at DESC
        ");
        $stmt->execute([$uid]);
        $items = $stmt->fetchAll();

        $totalVersions = 0;
        $totalSize     = 0;
        foreach ($items as &$item) {
            $item['total_size_kb'] = round($item['total_size'] / 1024, 1);
            $totalVersions += $item['version_count'];
            $totalSize     += $item['total_size'];
        }

        jsonResponse(true, [
            'items'          => $items,
            'total_versions' => $totalVersions,
            'total_size_kb'  => round($totalSize / 1024, 1),
        ]);

    } elseif ($method === 'DELETE') {
        $itemId   = isset($_GET['item_id']) ? (int) $_GET['item_id'] : 0;
        $singleId = isset($_GET['id'])      ? (int) $_GET['id']      : 0;

        if ($singleId) {
            // Verifica propriedade via JOIN antes de apagar
            $stmt = $db->prepare("
                DELETE nv FROM note_versions nv
                JOIN items i ON i.id = nv.item_id
                JOIN categories c ON c.id = i.category_id
                WHERE nv.id = ? AND c.user_uid = ?
            ");
            $stmt->execute([$singleId, $uid]);
            jsonResponse(true, ['deleted' => $stmt->rowCount(), 'message' => 'Versão apagada']);

        } elseif ($itemId) {
            $stmt = $db->prepare("
                DELETE nv FROM note_versions nv
                JOIN items i ON i.id = nv.item_id
                JOIN categories c ON c.id = i.category_id
                WHERE nv.item_id = ? AND c.user_uid = ?
            ");
            $stmt->execute([$itemId, $uid]);
            jsonResponse(true, ['deleted' => $stmt->rowCount(), 'message' => 'Todas as versões apagadas']);

        } else {
            jsonResponse(false, null, 'Especifica item_id ou id', 400);
        }

    } elseif ($method === 'POST') {
        $input  = getInput();
        $action = $input['action'] ?? '';

        if ($action === 'delete_all') {
            // Apaga apenas versões do utilizador autenticado
            $stmt = $db->prepare("
                DELETE nv FROM note_versions nv
                JOIN items i ON i.id = nv.item_id
                JOIN categories c ON c.id = i.category_id
                WHERE c.user_uid = ?
            ");
            $stmt->execute([$uid]);
            jsonResponse(true, ['deleted' => $stmt->rowCount(), 'message' => 'Todo o historial foi limpo']);
        } else {
            jsonResponse(false, null, 'Ação desconhecida', 400);
        }

    } else {
        jsonResponse(false, null, 'Método não suportado', 405);
    }
} catch (PDOException $e) {
    error_log('[NeatPad manage_versions] ' . $e->getMessage());
    jsonResponse(false, null, NEATPAD_IS_PRODUCTION ? 'Erro ao processar pedido' : ('Erro: ' . $e->getMessage()), 500);
}
