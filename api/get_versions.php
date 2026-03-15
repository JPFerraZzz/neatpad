<?php
require_once __DIR__ . '/auth_check.php';
$uid = requireAuth();

require_once __DIR__ . '/db.php';

$db     = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Verifica que o item pertence ao utilizador autenticado
function assertItemOwned(PDO $db, int $itemId, string $uid): void {
    $stmt = $db->prepare("
        SELECT i.id FROM items i
        JOIN categories c ON c.id = i.category_id
        WHERE i.id = ? AND c.user_uid = ?
    ");
    $stmt->execute([$itemId, $uid]);
    if (!$stmt->fetch()) {
        jsonResponse(false, null, 'Item não encontrado', 404);
    }
}

try {
    if ($method === 'GET') {
        $itemId = (int) ($_GET['item_id'] ?? 0);
        if (!$itemId) jsonResponse(false, null, 'item_id é obrigatório', 400);

        assertItemOwned($db, $itemId, $uid);

        $version = $_GET['version'] ?? null;

        if ($version !== null) {
            $stmt = $db->prepare("SELECT * FROM note_versions WHERE item_id = ? AND version = ?");
            $stmt->execute([$itemId, (int)$version]);
            $row = $stmt->fetch();
            if (!$row) jsonResponse(false, null, 'Versão não encontrada', 404);
            jsonResponse(true, $row);
        } else {
            $stmt = $db->prepare("
                SELECT id, item_id, version, saved_by, version_name, LENGTH(content) AS content_length, created_at
                FROM note_versions
                WHERE item_id = ?
                ORDER BY version DESC
                LIMIT 50
            ");
            $stmt->execute([$itemId]);
            jsonResponse(true, $stmt->fetchAll());
        }

    } elseif ($method === 'POST') {
        $input   = getInput();
        $itemId  = (int) ($input['item_id'] ?? 0);
        $version = (int) ($input['version'] ?? 0);

        if (!$itemId || !$version) jsonResponse(false, null, 'item_id e version são obrigatórios', 400);

        assertItemOwned($db, $itemId, $uid);

        $db->beginTransaction();

        $stmt = $db->prepare("SELECT content FROM note_versions WHERE item_id = ? AND version = ?");
        $stmt->execute([$itemId, $version]);
        $row = $stmt->fetch();
        if (!$row) { $db->rollBack(); jsonResponse(false, null, 'Versão não encontrada', 404); }

        $stmt = $db->prepare("SELECT content FROM items WHERE id = ?");
        $stmt->execute([$itemId]);
        $currentItem = $stmt->fetch();

        if ($currentItem && !empty($currentItem['content'])) {
            $stmt = $db->prepare("SELECT COALESCE(MAX(version), 0) + 1 AS nv FROM note_versions WHERE item_id = ?");
            $stmt->execute([$itemId]);
            $nv = (int) $stmt->fetch()['nv'];
            $stmt = $db->prepare("INSERT INTO note_versions (item_id, content, version, saved_by) VALUES (?, ?, ?, 'manual')");
            $stmt->execute([$itemId, $currentItem['content'], $nv]);
        }

        $stmt = $db->prepare("UPDATE items SET content = :content WHERE id = :id");
        $stmt->execute(['content' => $row['content'], 'id' => $itemId]);
        $db->commit();

        jsonResponse(true, ['item_id' => $itemId, 'restored_version' => $version, 'message' => 'Versão restaurada com sucesso']);

    } else {
        jsonResponse(false, null, 'Método não suportado', 405);
    }
} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    jsonResponse(false, null, 'Erro: ' . $e->getMessage(), 500);
}
