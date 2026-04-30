<?php
/**
 * NeatPad — API pública de patch notes.
 *
 * GET /api/get_patch_notes.php          → lista todas as entradas (DESC)
 * GET /api/get_patch_notes.php?id=X     → detalhe de uma entrada
 * GET /api/get_patch_notes.php?limit=N  → limitar número de resultados (max 100)
 *
 * Endpoint público — não requer autenticação.
 */

require_once __DIR__ . '/db.php';

// Apenas leituras
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(false, null, 'Método não suportado', 405);
}

// Cache-Control: a lista pode ser cacheada por 60s; detalhe por 5min
header('Cache-Control: public, max-age=60, stale-while-revalidate=300');

try {
    $db = getDB();

    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;

    if ($id !== null) {
        // ── Detalhe de uma entrada ────────────────────────────────
        if ($id <= 0) jsonResponse(false, null, 'ID inválido', 400);

        $stmt = $db->prepare('SELECT * FROM patch_notes WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            jsonResponse(false, null, 'Patch note não encontrada', 404);
        }
        jsonResponse(true, _formatRow($row));

    } else {
        // ── Lista completa ────────────────────────────────────────
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 50)));

        $stmt = $db->prepare(
            'SELECT * FROM patch_notes ORDER BY created_at DESC LIMIT ?'
        );
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        jsonResponse(true, array_map('_formatRow', $rows));
    }

} catch (PDOException $e) {
    error_log('[NeatPad get_patch_notes] DB error: ' . $e->getMessage());
    jsonResponse(false, null, 'Erro ao carregar patch notes', 500);
}

// ── Helper: formata uma linha para a resposta ─────────────────────
function _formatRow(array $row): array {
    $row['commit_url'] = 'https://github.com/JPFerraZzz/neatpad/commit/' . $row['commit_hash'];
    // Data formatada em pt-PT para conveniência do frontend
    try {
        $dt = new DateTimeImmutable($row['created_at']);
        $months = [
            1  => 'janeiro', 2  => 'fevereiro', 3  => 'março',
            4  => 'abril',   5  => 'maio',       6  => 'junho',
            7  => 'julho',   8  => 'agosto',     9  => 'setembro',
            10 => 'outubro', 11 => 'novembro',   12 => 'dezembro',
        ];
        $row['date_formatted'] = $dt->format('j') . ' de ' .
            $months[(int)$dt->format('n')] . ' de ' . $dt->format('Y');
        $row['date_iso'] = $dt->format('c');
    } catch (Exception $e) {
        $row['date_formatted'] = $row['created_at'];
        $row['date_iso']       = $row['created_at'];
    }
    return $row;
}
