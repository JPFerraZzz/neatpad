<?php
declare(strict_types=1);

/**
 * Actualiza presença e identificação do utilizador da app em np_gest_user_meta.
 * Não avança last_seen para contas em soft delete (mantém auditoria coerente).
 */
function neatpad_touch_last_seen(PDO $db, string $uid, ?string $email = null, ?string $displayName = null): void
{
    $uid = trim($uid);
    if ($uid === '' || strlen($uid) > 128) {
        return;
    }
    $email = trim((string) ($email ?? ''));
    $displayName = trim((string) ($displayName ?? ''));
    try {
        $st = $db->prepare(
            'INSERT INTO np_gest_user_meta (uid, email, display_name, last_seen)
             VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
                last_seen = IF(np_gest_user_meta.status = \'deleted\', np_gest_user_meta.last_seen, NOW()),
                email = IF(VALUES(email) <> \'\', VALUES(email), np_gest_user_meta.email),
                display_name = IF(VALUES(display_name) <> \'\', VALUES(display_name), np_gest_user_meta.display_name)'
        );
        $st->execute([$uid, $email, $displayName]);
    } catch (Throwable $e) {
        error_log('[NeatPad last_seen] ' . $e->getMessage());
    }
}
