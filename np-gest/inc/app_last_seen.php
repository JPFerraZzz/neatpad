<?php
declare(strict_types=1);

/**
 * Actualiza presença do utilizador da app em np_gest_user_meta.last_seen.
 * Chamado a partir de api/auth.php, api/categories.php, api/items.php.
 */
function neatpad_touch_last_seen(PDO $db, string $uid): void
{
    $uid = trim($uid);
    if ($uid === '' || strlen($uid) > 128) {
        return;
    }
    try {
        $st = $db->prepare(
            'INSERT INTO np_gest_user_meta (uid, email, display_name, last_seen)
             VALUES (?, \'\', \'\', NOW())
             ON DUPLICATE KEY UPDATE last_seen = NOW()'
        );
        $st->execute([$uid]);
    } catch (Throwable $e) {
        error_log('[NeatPad last_seen] ' . $e->getMessage());
    }
}
