<?php
require_once __DIR__ . '/auth_check.php';
$uid = requireAuth();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/sanitize.php';

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$input  = getInput();

// Sanitiza conteúdo rich-text quando o pedido vem com `content` HTML
if (is_array($input) && isset($input['content']) && is_string($input['content'])) {
    if (strlen($input['content']) > 1048576) {
        jsonResponse(false, null, 'Conteúdo demasiado grande', 413);
    }
    $input['content'] = neatpad_sanitize_html($input['content']);
}
// Sanitiza títulos e campos textuais simples (remove tags por completo)
foreach (['title'] as $textField) {
    if (isset($input[$textField]) && is_string($input[$textField])) {
        $input[$textField] = trim(strip_tags($input[$textField]));
    }
}

function ownedCategoryExists(PDO $db, int $categoryId, string $uid): bool {
    $stmt = $db->prepare("SELECT id FROM categories WHERE id = ? AND user_uid = ?");
    $stmt->execute([$categoryId, $uid]);
    return (bool) $stmt->fetch();
}

function ownedItemExists(PDO $db, int $itemId, string $uid): bool {
    $stmt = $db->prepare("
        SELECT i.id FROM items i
        JOIN categories c ON c.id = i.category_id
        WHERE i.id = ? AND c.user_uid = ?
    ");
    $stmt->execute([$itemId, $uid]);
    return (bool) $stmt->fetch();
}

try {
    switch ($method) {
        case 'GET':
            $categoryId = $_GET['category_id'] ?? null;

            if ($categoryId) {
                if (!ownedCategoryExists($db, (int)$categoryId, $uid)) {
                    jsonResponse(false, null, 'Categoria não encontrada', 404);
                }
                $stmt = $db->prepare("
                    SELECT i.*,
                           (SELECT COUNT(*) FROM subtasks WHERE item_id = i.id) AS subtask_count,
                           (SELECT COUNT(*) FROM subtasks WHERE item_id = i.id AND completed = 1) AS completed_subtasks
                    FROM items i
                    WHERE i.category_id = ?
                    ORDER BY i.created_at DESC
                ");
                $stmt->execute([$categoryId]);
                $items = $stmt->fetchAll();

                foreach ($items as &$item) {
                    $stmt2 = $db->prepare("SELECT * FROM subtasks WHERE item_id = ? ORDER BY id");
                    $stmt2->execute([$item['id']]);
                    $item['subtasks'] = $stmt2->fetchAll();
                    if ($item['metadata']) {
                        $item['metadata'] = json_decode($item['metadata'], true);
                    }
                }
                jsonResponse(true, $items);
            } else {
                $stmt = $db->prepare("
                    SELECT i.* FROM items i
                    JOIN categories c ON c.id = i.category_id
                    WHERE c.user_uid = ?
                    ORDER BY i.created_at DESC
                ");
                $stmt->execute([$uid]);
                jsonResponse(true, $stmt->fetchAll());
            }
            break;

        case 'POST':
            if (empty($input['category_id']) || empty($input['title'])) {
                jsonResponse(false, null, 'Categoria e título são obrigatórios', 400);
            }
            if (!ownedCategoryExists($db, (int)$input['category_id'], $uid)) {
                jsonResponse(false, null, 'Categoria não encontrada', 404);
            }
            $metadata = isset($input['metadata']) ? json_encode($input['metadata'], JSON_UNESCAPED_UNICODE) : null;
            $stmt = $db->prepare("
                INSERT INTO items (category_id, title, content, status, priority, due_date, metadata)
                VALUES (:category_id, :title, :content, :status, :priority, :due_date, :metadata)
            ");
            $stmt->execute([
                'category_id' => $input['category_id'],
                'title'       => $input['title'],
                'content'     => $input['content']  ?? '',
                'status'      => $input['status']   ?? 'pending',
                'priority'    => $input['priority'] ?? 'medium',
                'due_date'    => !empty($input['due_date']) ? $input['due_date'] : null,
                'metadata'    => $metadata,
            ]);
            $itemId = $db->lastInsertId();

            if (!empty($input['subtasks']) && is_array($input['subtasks'])) {
                $stmt = $db->prepare("INSERT INTO subtasks (item_id, description) VALUES (?, ?)");
                foreach ($input['subtasks'] as $subtask) {
                    if (!empty($subtask['description'])) {
                        $stmt->execute([$itemId, $subtask['description']]);
                    }
                }
            }
            $stmt = $db->prepare("SELECT * FROM items WHERE id = ?");
            $stmt->execute([$itemId]);
            jsonResponse(true, $stmt->fetch());
            break;

        case 'PUT':
            if (empty($input['id'])) {
                jsonResponse(false, null, 'ID do item é obrigatório', 400);
            }
            if (!ownedItemExists($db, (int)$input['id'], $uid)) {
                jsonResponse(false, null, 'Item não encontrado', 404);
            }
            $metadata = isset($input['metadata']) ? json_encode($input['metadata'], JSON_UNESCAPED_UNICODE) : null;
            $stmt = $db->prepare("
                UPDATE items
                SET title = :title, content = :content, status = :status,
                    priority = :priority, due_date = :due_date, metadata = :metadata
                WHERE id = :id
            ");
            $stmt->execute([
                'id'       => $input['id'],
                'title'    => $input['title'],
                'content'  => $input['content']  ?? '',
                'status'   => $input['status']   ?? 'pending',
                'priority' => $input['priority'] ?? 'medium',
                'due_date' => !empty($input['due_date']) ? $input['due_date'] : null,
                'metadata' => $metadata,
            ]);

            if (isset($input['subtasks'])) {
                $stmt = $db->prepare("DELETE FROM subtasks WHERE item_id = ?");
                $stmt->execute([$input['id']]);
                if (!empty($input['subtasks']) && is_array($input['subtasks'])) {
                    $stmt = $db->prepare("INSERT INTO subtasks (item_id, description, completed) VALUES (?, ?, ?)");
                    foreach ($input['subtasks'] as $subtask) {
                        if (!empty($subtask['description'])) {
                            $stmt->execute([
                                $input['id'],
                                $subtask['description'],
                                isset($subtask['completed']) ? ($subtask['completed'] ? 1 : 0) : 0,
                            ]);
                        }
                    }
                }
            }
            $stmt = $db->prepare("SELECT * FROM items WHERE id = ?");
            $stmt->execute([$input['id']]);
            jsonResponse(true, $stmt->fetch());
            break;

        case 'PATCH':
            // Actualização parcial: apenas os campos enviados são alterados.
            // Usado pelo editor mobile para guardar título sem re-enviar todos os campos.
            if (empty($input['id'])) {
                jsonResponse(false, null, 'ID do item é obrigatório', 400);
            }
            if (!ownedItemExists($db, (int)$input['id'], $uid)) {
                jsonResponse(false, null, 'Item não encontrado', 404);
            }
            $setParts = [];
            $params   = [];
            if (isset($input['title'])) {
                $setParts[] = 'title = :title';
                $params['title'] = $input['title'];
            }
            if (isset($input['priority'])) {
                $setParts[] = 'priority = :priority';
                $params['priority'] = $input['priority'];
            }
            if (empty($setParts)) {
                jsonResponse(false, null, 'Nenhum campo para actualizar', 400);
            }
            $params['id'] = $input['id'];
            $stmt = $db->prepare('UPDATE items SET ' . implode(', ', $setParts) . ' WHERE id = :id');
            $stmt->execute($params);
            $stmt = $db->prepare('SELECT * FROM items WHERE id = ?');
            $stmt->execute([$input['id']]);
            jsonResponse(true, $stmt->fetch());
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (empty($id)) {
                jsonResponse(false, null, 'ID do item é obrigatório', 400);
            }
            if (!ownedItemExists($db, (int)$id, $uid)) {
                jsonResponse(false, null, 'Item não encontrado', 404);
            }
            // Apaga registos dependentes explicitamente para garantir limpeza mesmo
            // que a instância MySQL não tenha as FK CASCADE activas (ex: bases de dados
            // criadas antes da migração).
            $db->prepare("DELETE FROM note_versions WHERE item_id = ?")->execute([$id]);
            $db->prepare("DELETE FROM subtasks WHERE item_id = ?")->execute([$id]);
            $stmt = $db->prepare("DELETE FROM items WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse(true, ['message' => 'Item eliminado com sucesso']);
            break;

        default:
            jsonResponse(false, null, 'Método não suportado', 405);
    }
} catch (Exception $e) {
    jsonResponse(false, null, $e->getMessage(), 500);
}
