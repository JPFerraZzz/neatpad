<?php
/**
 * NeatPad — API pública de patch notes.
 *
 * GET /api/get_patch_notes.php              → lista todas (DESC)
 * GET /api/get_patch_notes.php?id=X       → detalhe
 * GET /api/get_patch_notes.php?limit=N    → limitar (max 100)
 * GET /api/get_patch_notes.php?carousel=1 → só entradas relevantes para o carrossel da homepage
 *
 * Endpoint público — não requer autenticação.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/security.php';

sendSecureHeaders();

/**
 * Patch notes visíveis no carrossel da homepage (utilizador final).
 * Inclui: feat, refactor; ou "other" com palavras-chave de impacto.
 * Exclui: fix e prefixos convencionais de manutenção (ci, chore, docs…).
 */
function patchNoteForCarousel(array $row): bool {
    $msg = mb_strtolower(trim((string)($row['commit_message'] ?? '')), 'UTF-8');
    $type = mb_strtolower(trim((string)($row['type'] ?? 'other')), 'UTF-8');

    if ($type === 'fix') {
        return false;
    }
    if (preg_match('/^(fix|ci|chore|docs|style|test|build|wip)(\([^)]*\))?:/iu', $msg)) {
        return false;
    }
    if ($type === 'feat' || $type === 'refactor') {
        return true;
    }

    $hay = $msg . ' ' . mb_strtolower((string)($row['title'] ?? ''), 'UTF-8')
        . ' ' . mb_strtolower((string)($row['summary'] ?? ''), 'UTF-8');
    $keywords = ['novo', 'nova', 'adiciona', 'melhora', 'redesign', 'launch'];
    foreach ($keywords as $kw) {
        if ($kw !== '' && mb_strpos($hay, $kw, 0, 'UTF-8') !== false) {
            return true;
        }
    }
    return false;
}

// Apenas leituras
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(false, null, 'Método não suportado', 405);
}

rateLimit('get_patch_notes:' . clientIp(), 120, 60);

// Cache-Control: a lista pode ser cacheada por 60s; detalhe por 5min
header('Cache-Control: public, max-age=60, stale-while-revalidate=300');

try {
    $db = getDB();

    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;

    if ($id !== null) {
        if ($id <= 0) {
            jsonResponse(false, null, 'ID inválido', 400);
        }

        $stmt = $db->prepare('SELECT * FROM patch_notes WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            jsonResponse(false, null, 'Patch note não encontrada', 404);
        }
        jsonResponse(true, _formatRow($row));

    } else {
        $carousel = isset($_GET['carousel']) && $_GET['carousel'] === '1';
        $limit     = min(100, max(1, (int)($_GET['limit'] ?? 50)));

        if ($carousel) {
            $fetchLimit = min(200, max($limit * 8, 40));
            $stmt = $db->prepare(
                'SELECT * FROM patch_notes ORDER BY created_at DESC LIMIT ?'
            );
            $stmt->bindValue(1, $fetchLimit, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll();
            $filtered = [];
            foreach ($rows as $r) {
                if (patchNoteForCarousel($r)) {
                    $filtered[] = _formatRow($r);
                    if (count($filtered) >= $limit) {
                        break;
                    }
                }
            }
            jsonResponse(true, $filtered);
        } else {
            $stmt = $db->prepare(
                'SELECT * FROM patch_notes ORDER BY created_at DESC LIMIT ?'
            );
            $stmt->bindValue(1, $limit, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll();
            jsonResponse(true, array_map('_formatRow', $rows));
        }
    }
} catch (PDOException $e) {
    error_log('[NeatPad get_patch_notes] DB error: ' . $e->getMessage());
    jsonResponse(false, null, 'Erro ao carregar patch notes', 500);
}

// ── Helper: formata uma linha para a resposta ─────────────────────
function _formatRow(array $row): array {
    $row['commit_url'] = 'https://github.com/JPFerraZzz/neatpad/commit/' . $row['commit_hash'];

    if (!empty($row['changes_list'])) {
        $decoded = json_decode($row['changes_list'], true);
        $row['changes'] = is_array($decoded) ? $decoded : [];
    } else {
        $row['changes'] = [];
    }
    unset($row['changes_list']);

    $row['title']    = $row['title']    ?? null;
    $row['summary']  = $row['summary']  ?? null;
    $row['impact']   = $row['impact']   ?? null;

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
