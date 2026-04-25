<?php
/**
 * Handler de sessões PHP em MySQL.
 * Necessário no Railway (e outros ambientes multi-instância) porque as sessões
 * em ficheiros não são partilhadas entre instâncias.
 */
require_once __DIR__ . '/db.php';

function initDbSession(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;

    // Duração da sessão: 7 dias de inatividade (em segundos). Override com SESSION_MAX_LIFETIME no Railway.
    $maxLifetime = (int) (getenv('SESSION_MAX_LIFETIME') ?: 604800);
    ini_set('session.gc_maxlifetime', (string) $maxLifetime);
    ini_set('session.use_strict_mode', '1');     // Rejeita IDs de sessão arbitrários enviados pelo cliente
    ini_set('session.use_only_cookies', '1');    // Não aceita session id em URL (evita session fixation)
    ini_set('session.cookie_httponly', '1');     // Cookie inacessível ao JavaScript

    $isHttps = (
        (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || (($_SERVER['SERVER_PORT'] ?? '') == 443)
    );

    session_set_cookie_params([
        'lifetime' => $maxLifetime,
        'path'     => '/',
        'samesite' => 'Lax',
        'httponly' => true,
        'secure'   => $isHttps,
    ]);
    session_name('NEATPAD_SID');

    $pdo = getDB();

    session_set_save_handler(
        function () use ($pdo) {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS php_sessions (
                    id VARCHAR(128) PRIMARY KEY,
                    data LONGTEXT NOT NULL,
                    last_activity INT UNSIGNED NOT NULL,
                    INDEX idx_last_activity (last_activity)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
            return true;
        },
        function () { return true; },
        function ($id) use ($pdo) {
            $stmt = $pdo->prepare("SELECT data FROM php_sessions WHERE id = ? AND last_activity > ?");
            $stmt->execute([$id, time() - (int) ini_get('session.gc_maxlifetime')]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row ? $row['data'] : '';
        },
        function ($id, $data) use ($pdo) {
            $stmt = $pdo->prepare("
                INSERT INTO php_sessions (id, data, last_activity) VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE data = VALUES(data), last_activity = VALUES(last_activity)
            ");
            return $stmt->execute([$id, $data, time()]);
        },
        function ($id) use ($pdo) {
            $stmt = $pdo->prepare("DELETE FROM php_sessions WHERE id = ?");
            return $stmt->execute([$id]);
        },
        function ($maxlifetime) use ($pdo) {
            $stmt = $pdo->prepare("DELETE FROM php_sessions WHERE last_activity < ?");
            return $stmt->execute([time() - $maxlifetime]);
        }
    );

    register_shutdown_function('session_write_close');
}
