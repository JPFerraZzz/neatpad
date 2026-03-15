<?php
require_once __DIR__ . '/auth_check.php';
$uid = requireAuth();

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, null, 'Método não suportado', 405);
}

$input = getInput();

if (empty($input['item_id'])) {
    jsonResponse(false, null, 'item_id é obrigatório', 400);
}

$itemId     = (int) $input['item_id'];
$content    = $input['content'] ?? null;
$savedBy    = $input['saved_by'] ?? 'autosave';
$isSnapshot = ($savedBy === 'manual_snapshot');

if (!$isSnapshot && $content === null) {
    jsonResponse(false, null, 'content é obrigatório', 400);
}

try {
    $db = getDB();

    // Verificar que o item pertence ao utilizador autenticado
    $stmt = $db->prepare("
        SELECT i.id, i.content FROM items i
        JOIN categories c ON c.id = i.category_id
        WHERE i.id = ? AND c.user_uid = ?
    ");
    $stmt->execute([$itemId, $uid]);
    $item = $stmt->fetch();

    if (!$item) {
        jsonResponse(false, null, 'Item não encontrado', 404);
    }

    $db->beginTransaction();

    if ($isSnapshot) {
        if (empty($item['content'])) {
            $db->rollBack();
            jsonResponse(false, null, 'Item sem conteúdo para guardar como versão', 400);
        }
        $stmt = $db->prepare("SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM note_versions WHERE item_id = ?");
        $stmt->execute([$itemId]);
        $nextVersion = (int) $stmt->fetch()['next_version'];

        $stmt = $db->prepare("INSERT INTO note_versions (item_id, content, version, saved_by) VALUES (:item_id, :content, :version, :saved_by)");
        $stmt->execute(['item_id' => $itemId, 'content' => $item['content'], 'version' => $nextVersion, 'saved_by' => 'manual']);

        $db->commit();
        jsonResponse(true, ['item_id' => $itemId, 'version' => $nextVersion, 'saved_at' => date('c'), 'message' => "Versão $nextVersion guardada"]);
        return;
    }

    if ($item['content'] === $content) {
        $db->rollBack();
        jsonResponse(true, ['item_id' => $itemId, 'unchanged' => true, 'message' => 'Conteúdo sem alterações']);
    }

    if (!empty($item['content'])) {
        $stmt = $db->prepare("SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM note_versions WHERE item_id = ?");
        $stmt->execute([$itemId]);
        $nextVersion = (int) $stmt->fetch()['next_version'];

        $stmt = $db->prepare("INSERT INTO note_versions (item_id, content, version, saved_by) VALUES (:item_id, :content, :version, :saved_by)");
        $stmt->execute(['item_id' => $itemId, 'content' => $item['content'], 'version' => $nextVersion, 'saved_by' => $savedBy]);

        $stmt = $db->prepare("
            DELETE FROM note_versions
            WHERE item_id = ?
            AND id NOT IN (
                SELECT id FROM (
                    SELECT id FROM note_versions WHERE item_id = ? ORDER BY version DESC LIMIT 50
                ) AS keep_versions
            )
        ");
        $stmt->execute([$itemId, $itemId]);
    }

    $stmt = $db->prepare("UPDATE items SET content = :content WHERE id = :id");
    $stmt->execute(['content' => $content, 'id' => $itemId]);

    $db->commit();
    jsonResponse(true, ['item_id' => $itemId, 'saved_at' => date('c'), 'saved_by' => $savedBy, 'message' => 'Conteúdo guardado com sucesso']);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    jsonResponse(false, null, 'Erro ao guardar: ' . $e->getMessage(), 500);
}
