<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/inc/permissions.php';
require_once dirname(__DIR__) . '/inc/audit.php';
require_once dirname(__DIR__) . '/inc/user_repo.php';

header('Content-Type: application/json; charset=utf-8');

function gest_json_out(bool $ok, ?string $err = null, array $extra = []): void
{
    echo json_encode(array_merge(['success' => $ok, 'error' => $err], $extra), JSON_UNESCAPED_UNICODE);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    gest_json_out(false, 'Método inválido.');
    exit;
}

$raw  = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    gest_json_out(false, 'Pedido inválido.');
    exit;
}

$csrfHdr = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
$csrf    = is_string($csrfHdr) && $csrfHdr !== '' ? $csrfHdr : (string) ($data['csrf'] ?? '');
if (!gest_verify_csrf($csrf)) {
    http_response_code(403);
    gest_json_out(false, 'Pedido inválido.');
    exit;
}

$action = (string) ($data['action'] ?? '');
$uid    = trim((string) ($data['uid'] ?? ''));
if ($uid === '' || strlen($uid) > 128 || !preg_match('/^[a-zA-Z0-9._:-]+$/', $uid)) {
    http_response_code(400);
    gest_json_out(false, 'Identificador inválido.');
    exit;
}

try {
    $pdo = gest_pdo();
} catch (Throwable $e) {
    error_log('[np-gest] api/users: ' . $e->getMessage());
    http_response_code(503);
    gest_json_out(false, 'Serviço indisponível.');
    exit;
}

$gest = gest_user();
$gid  = (int) ($gest['id'] ?? 0);

try {
    switch ($action) {
        case 'silence':
            if (!gest_can_silence_suspend_softdelete()) {
                http_response_code(403);
                gest_json_out(false, 'Sem permissão.');
                exit;
            }
            $days = max(1, min(720, (int) ($data['days'] ?? 7)));
            $pdo->prepare(
                'INSERT INTO np_gest_user_meta (uid, email, display_name, status, silenced_until)
                 VALUES (?, \'\', \'\', \'silenced\', DATE_ADD(NOW(), INTERVAL ? DAY))
                 ON DUPLICATE KEY UPDATE status = \'silenced\', silenced_until = DATE_ADD(NOW(), INTERVAL ? DAY)'
            )->execute([$uid, $days, $days]);
            gest_audit_log($pdo, $gid, 'user_silence', $uid, json_encode(['days' => $days], JSON_UNESCAPED_UNICODE));
            gest_json_out(true);
            exit;

        case 'suspend':
            if (!gest_can_silence_suspend_softdelete()) {
                http_response_code(403);
                gest_json_out(false, 'Sem permissão.');
                exit;
            }
            $days = max(1, min(720, (int) ($data['days'] ?? 7)));
            $pdo->prepare(
                'INSERT INTO np_gest_user_meta (uid, email, display_name, status, suspension_end)
                 VALUES (?, \'\', \'\', \'suspended\', DATE_ADD(NOW(), INTERVAL ? DAY))
                 ON DUPLICATE KEY UPDATE status = \'suspended\', suspension_end = DATE_ADD(NOW(), INTERVAL ? DAY)'
            )->execute([$uid, $days, $days]);
            gest_audit_log($pdo, $gid, 'user_suspend', $uid, json_encode(['days' => $days], JSON_UNESCAPED_UNICODE));
            gest_json_out(true);
            exit;

        case 'soft_delete':
            if (!gest_can_silence_suspend_softdelete()) {
                http_response_code(403);
                gest_json_out(false, 'Sem permissão.');
                exit;
            }
            $pdo->prepare(
                'INSERT INTO np_gest_user_meta (uid, email, display_name, status, deleted_at)
                 VALUES (?, \'\', \'\', \'deleted\', NOW())
                 ON DUPLICATE KEY UPDATE status = \'deleted\', deleted_at = NOW()'
            )->execute([$uid]);
            gest_audit_log($pdo, $gid, 'user_soft_delete', $uid, null);
            gest_json_out(true);
            exit;

        case 'recover':
            if (!gest_can_silence_suspend_softdelete()) {
                http_response_code(403);
                gest_json_out(false, 'Sem permissão.');
                exit;
            }
            $meta = gest_user_get_meta($pdo, $uid);
            if (!$meta || ($meta['status'] ?? '') !== 'deleted' || empty($meta['deleted_at'])) {
                gest_json_out(false, 'Nada para recuperar.');
                exit;
            }
            $since = gest_days_since_deleted((string) $meta['deleted_at']);
            if ($since === null || $since > gest_recovery_days()) {
                http_response_code(403);
                gest_json_out(false, 'Fora do período de recuperação para o teu perfil.');
                exit;
            }
            $pdo->prepare(
                'UPDATE np_gest_user_meta SET status = \'active\', deleted_at = NULL,
                 silenced_until = NULL, suspension_end = NULL WHERE uid = ?'
            )->execute([$uid]);
            gest_audit_log($pdo, $gid, 'user_recover', $uid, json_encode(['days_since_delete' => $since], JSON_UNESCAPED_UNICODE));
            gest_json_out(true);
            exit;

        case 'hard_delete':
            if (!gest_can_hard_delete()) {
                http_response_code(403);
                gest_json_out(false, 'Sem permissão.');
                exit;
            }
            $phrase = trim((string) ($data['phrase'] ?? ''));
            if ($phrase !== 'ELIMINAR PERMANENTEMENTE') {
                gest_json_out(false, 'Confirmação incorrecta.');
                exit;
            }
            $pdo->beginTransaction();
            $pdo->prepare('DELETE FROM categories WHERE user_uid = ?')->execute([$uid]);
            $pdo->prepare('DELETE FROM np_gest_activity_log WHERE uid = ?')->execute([$uid]);
            $pdo->prepare('DELETE FROM np_gest_user_login_log WHERE uid = ?')->execute([$uid]);
            $pdo->prepare('DELETE FROM np_gest_app_error_log WHERE uid = ?')->execute([$uid]);
            $pdo->prepare('DELETE FROM np_gest_user_meta WHERE uid = ?')->execute([$uid]);
            $pdo->prepare('DELETE FROM php_sessions WHERE data LIKE ?')->execute(['%' . $uid . '%']);
            gest_audit_log($pdo, $gid, 'user_hard_delete', $uid, null);
            $pdo->commit();
            gest_json_out(true);
            exit;

        case 'update_notes':
            if (!gest_can_edit_notes()) {
                http_response_code(403);
                gest_json_out(false, 'Sem permissão.');
                exit;
            }
            $notes = (string) ($data['notes'] ?? '');
            if (strlen($notes) > 20000) {
                gest_json_out(false, 'Notas demasiado longas.');
                exit;
            }
            $pdo->prepare(
                'INSERT INTO np_gest_user_meta (uid, email, display_name, notes)
                 VALUES (?, \'\', \'\', ?)
                 ON DUPLICATE KEY UPDATE notes = VALUES(notes)'
            )->execute([$uid, $notes]);
            gest_audit_log($pdo, $gid, 'user_notes_update', $uid, null);
            gest_json_out(true);
            exit;

        case 'promote_role':
            if (!gest_can_promote_meta_role()) {
                http_response_code(403);
                gest_json_out(false, 'Sem permissão.');
                exit;
            }
            $r = (string) ($data['app_role'] ?? 'user');
            if (!in_array($r, ['user', 'vip', 'support'], true)) {
                gest_json_out(false, 'Perfil inválido.');
                exit;
            }
            $pdo->prepare(
                'INSERT INTO np_gest_user_meta (uid, email, display_name, role)
                 VALUES (?, \'\', \'\', ?)
                 ON DUPLICATE KEY UPDATE role = VALUES(role)'
            )->execute([$uid, $r]);
            gest_audit_log($pdo, $gid, 'user_app_role', $uid, json_encode(['role' => $r], JSON_UNESCAPED_UNICODE));
            gest_json_out(true);
            exit;

        case 'force_logout':
            if (!gest_can_force_logout()) {
                http_response_code(403);
                gest_json_out(false, 'Sem permissão.');
                exit;
            }
            $n = gest_delete_php_sessions_for_uid($pdo, $uid);
            gest_audit_log($pdo, $gid, 'user_force_logout', $uid, json_encode(['sessions_removed' => $n], JSON_UNESCAPED_UNICODE));
            gest_json_out(true, null, ['removed' => $n]);
            exit;

        case 'reset_sessions':
            if (!gest_can_reset_php_sessions()) {
                http_response_code(403);
                gest_json_out(false, 'Sem permissão.');
                exit;
            }
            $n = gest_delete_php_sessions_for_uid($pdo, $uid);
            gest_audit_log($pdo, $gid, 'user_reset_sessions', $uid, json_encode(['sessions_removed' => $n], JSON_UNESCAPED_UNICODE));
            gest_json_out(true, null, ['removed' => $n]);
            exit;

        default:
            http_response_code(400);
            gest_json_out(false, 'Acção desconhecida.');
            exit;
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[np-gest] api/users action=' . $action . ' ' . $e->getMessage());
    http_response_code(500);
    gest_json_out(false, 'Operação falhou.');
    exit;
}
