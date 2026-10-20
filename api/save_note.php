<?php
require_once __DIR__ . '/auth_check.php';
$uid = requireAuth();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/sanitize.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, null, 'Método não suportado', 405);
}

// Com debounce de 2,5 s um limite de 200/h cortava os saves ao fim de ~8 minutos de escrita
rateLimit('save_note:' . $uid, 1500, 3600);

$input = getInput();

if (empty($input['item_id'])) {
    jsonResponse(false, null, 'item_id é obrigatório', 400);
}

$itemId     = (int) $input['item_id'];
$content    = $input['content'] ?? null;
$savedBy    = $input['saved_by'] ?? 'autosave';
if (!in_array($savedBy, ['autosave', 'manual', 'manual_snapshot'], true)) {
    $savedBy = 'autosave';
}
$isSnapshot = ($savedBy === 'manual_snapshot');

if (!$isSnapshot && $content === null) {
    jsonResponse(false, null, 'content é obrigatório', 400);
}

// Sanitização de XSS no conteúdo rich-text antes de tocar na BD
if (!$isSnapshot && is_string($content)) {
    // Limite defensivo de tamanho (1 MiB) — evita abuso e payloads gigantes
    if (strlen($content) > 1048576) {
        jsonResponse(false, null, 'Conteúdo demasiado grande', 413);
    }
    // A sanitização HTML depende do tipo da categoria e faz-se depois de ler o item
}

try {
    $db = getDB();

    // A transação abre antes da leitura e o item fica bloqueado (FOR UPDATE): sem isto,
    // dois saves em paralelo liam o mesmo estado, geravam o mesmo número de versão
    // e um deles sobrescrevia o outro.
    $db->beginTransaction();

    // Verificar que o item pertence ao utilizador autenticado
    $stmt = $db->prepare("
        SELECT i.id, i.content, c.template_type FROM items i
        JOIN categories c ON c.id = i.category_id
        WHERE i.id = ? AND c.user_uid = ?
        FOR UPDATE
    ");
    $stmt->execute([$itemId, $uid]);
    $item = $stmt->fetch();

    if (!$item) {
        $db->rollBack();
        jsonResponse(false, null, 'Item não encontrado', 404);
    }

    // Só os cadernos guardam HTML; nos outros tipos o texto simples seria estragado
    if (!$isSnapshot && is_string($content) && $item['template_type'] === 'notebooks') {
        $content = neatpad_sanitize_html($content);
    }

    if ($isSnapshot) {
        if (empty($item['content'])) {
            $db->rollBack();
            jsonResponse(false, null, 'Item sem conteúdo para guardar como versão', 400);
        }
        $versionName = isset($input['version_name']) ? mb_substr(trim(strip_tags((string) $input['version_name'])), 0, 255) : null;
        if ($versionName === '') $versionName = null;

        $stmt = $db->prepare("SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM note_versions WHERE item_id = ?");
        $stmt->execute([$itemId]);
        $nextVersion = (int) $stmt->fetch()['next_version'];

        $stmt = $db->prepare("INSERT INTO note_versions (item_id, content, version, saved_by, version_name) VALUES (:item_id, :content, :version, :saved_by, :version_name)");
        $stmt->execute([
            'item_id' => $itemId,
            'content' => $item['content'],
            'version' => $nextVersion,
            'saved_by' => 'manual',
            'version_name' => $versionName,
        ]);

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

        // Só as versões automáticas são podadas; as manuais (com nome) ficam sempre.
        $stmt = $db->prepare("
            DELETE FROM note_versions
            WHERE item_id = ? AND saved_by = 'autosave'
            AND id NOT IN (
                SELECT id FROM (
                    SELECT id FROM note_versions WHERE item_id = ? AND saved_by = 'autosave' ORDER BY version DESC LIMIT 50
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
    error_log('[NeatPad save_note] ' . $e->getMessage());
    jsonResponse(false, null, NEATPAD_IS_PRODUCTION ? 'Erro ao guardar' : ('Erro ao guardar: ' . $e->getMessage()), 500);
}
