<?php
declare(strict_types=1);

/**
 * Regista acção administrativa em np_gest_audit_log.
 */
function gest_audit_log(PDO $pdo, ?int $gestUserId, string $action, ?string $targetUid, ?string $detailsJson): void
{
    $st = $pdo->prepare(
        'INSERT INTO np_gest_audit_log (gest_user_id, action, target_uid, details) VALUES (?, ?, ?, ?)'
    );
    $st->execute([
        $gestUserId,
        $action,
        $targetUid,
        $detailsJson,
    ]);
}
