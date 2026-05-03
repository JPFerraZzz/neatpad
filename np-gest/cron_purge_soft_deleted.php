<?php
/**
 * Eliminação permanente de contas em soft delete há mais de 180 dias.
 * Executar por cron (CLI) no servidor, ex. diariamente:
 *   php /var/www/html/np-gest/cron_purge_soft_deleted.php
 */
declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/inc/audit.php';

try {
    $pdo = gest_pdo();
} catch (Throwable $e) {
    fwrite(STDERR, "BD: " . $e->getMessage() . "\n");
    exit(1);
}

$st = $pdo->query(
    "SELECT uid FROM np_gest_user_meta
     WHERE status = 'deleted'
       AND deleted_at IS NOT NULL
       AND deleted_at < DATE_SUB(NOW(), INTERVAL 180 DAY)"
);
$uids = $st->fetchAll(PDO::FETCH_COLUMN);
if ($uids === false) {
    $uids = [];
}

$n = 0;
foreach ($uids as $uid) {
    if (!is_string($uid) || $uid === '') {
        continue;
    }
    try {
        $pdo->beginTransaction();
        $pdo->prepare('DELETE FROM categories WHERE user_uid = ?')->execute([$uid]);
        $pdo->prepare('DELETE FROM np_gest_activity_log WHERE uid = ?')->execute([$uid]);
        $pdo->prepare('DELETE FROM np_gest_user_login_log WHERE uid = ?')->execute([$uid]);
        $pdo->prepare('DELETE FROM np_gest_app_error_log WHERE uid = ?')->execute([$uid]);
        $pdo->prepare('DELETE FROM np_gest_user_meta WHERE uid = ?')->execute([$uid]);
        $pdo->prepare('DELETE FROM php_sessions WHERE data LIKE ?')->execute(['%' . $uid . '%']);
        gest_audit_log($pdo, null, 'cron_hard_purge', $uid, json_encode(['reason' => '180d_soft_delete']));
        $pdo->commit();
        $n++;
    } catch (Throwable $e) {
        $pdo->rollBack();
        fwrite(STDERR, "uid {$uid}: " . $e->getMessage() . "\n");
    }
}

echo "Purge concluído: {$n} utilizador(es).\n";
