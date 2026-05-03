<?php
/**
 * NeatPad Studio — sessão, login, roles e protecção de páginas.
 * Incluir em todas as páginas (login.php e logout.php também, para sessão).
 */
declare(strict_types=1);

$gestConfigPrimary = __DIR__ . '/config.php';
$gestConfigFromEnv = trim((string) (getenv('NP_GEST_CONFIG_PATH') ?: ''));
$gestConfigCandidates = [];
if ($gestConfigFromEnv !== '') {
    $gestConfigCandidates[] = $gestConfigFromEnv;
}
$gestConfigCandidates[] = $gestConfigPrimary;

$gestConfigResolved = null;
foreach ($gestConfigCandidates as $gestConfigTry) {
    if (is_readable($gestConfigTry)) {
        $gestConfigResolved = $gestConfigTry;
        break;
    }
}

if ($gestConfigResolved === null) {
    error_log(sprintf(
        '[np-gest] config ilegível. primary=%s exists=%s readable=%s | NP_GEST_CONFIG_PATH=%s',
        $gestConfigPrimary,
        file_exists($gestConfigPrimary) ? '1' : '0',
        is_readable($gestConfigPrimary) ? '1' : '0',
        $gestConfigFromEnv !== '' ? '(definido)' : '(vazio)'
    ));
    if (!headers_sent()) {
        header('Content-Type: text/plain; charset=utf-8', true, 503);
    }
    exit('Serviço indisponível.');
}

/** @var array $GEST_CFG */
$GEST_CFG = require $gestConfigResolved;

function gest_cfg(): array
{
    global $GEST_CFG;
    return $GEST_CFG;
}

function gest_send_security_headers(): void
{
    if (php_sapi_name() === 'cli') {
        return;
    }
    if (headers_sent()) {
        return;
    }
    header('X-Frame-Options: DENY');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
}

function gest_client_ip(): string
{
    $fwd = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($fwd !== '') {
        $first = trim(explode(',', $fwd)[0]);
        if ($first !== '') {
            return $first;
        }
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function gest_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $c = gest_cfg()['db'];
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $c['host'],
        $c['port'],
        $c['name']
    );
    $pdo = new PDO($dsn, $c['user'], $c['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

function gest_start_session(): void
{
    $s = gest_cfg()['session'];
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name($s['name']);
    session_set_cookie_params([
        'lifetime' => (int) $s['lifetime'],
        'path'     => $s['path'],
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function gest_script(): string
{
    return basename($_SERVER['SCRIPT_NAME'] ?? '');
}

function gest_is_public_script(): bool
{
    return in_array(gest_script(), ['login.php', 'logout.php'], true);
}

function gest_idle_seconds(): int
{
    return (int) (gest_cfg()['session']['idle_seconds'] ?? 1800);
}

function gest_ip_lock_row(PDO $pdo, string $ip): ?array
{
    $st = $pdo->prepare('SELECT failures, locked_until FROM np_gest_login_lock WHERE ip = ?');
    $st->execute([$ip]);
    $r = $st->fetch(PDO::FETCH_ASSOC);
    return $r ?: null;
}

function gest_clear_ip_lock(PDO $pdo, string $ip): void
{
    $pdo->prepare('DELETE FROM np_gest_login_lock WHERE ip = ?')->execute([$ip]);
}

function gest_is_ip_locked(PDO $pdo, string $ip): bool
{
    $row = gest_ip_lock_row($pdo, $ip);
    if (!$row || empty($row['locked_until'])) {
        return false;
    }
    return strtotime($row['locked_until']) > time();
}

function gest_register_failed_login(PDO $pdo, string $ip): void
{
    $row = gest_ip_lock_row($pdo, $ip);
    if ($row && !empty($row['locked_until']) && strtotime($row['locked_until']) <= time()) {
        $pdo->prepare('UPDATE np_gest_login_lock SET failures = 0, locked_until = NULL WHERE ip = ?')->execute([$ip]);
    }
    $pdo->prepare(
        'INSERT INTO np_gest_login_lock (ip, failures, locked_until) VALUES (?, 1, NULL)
         ON DUPLICATE KEY UPDATE failures = failures + 1, updated_at = CURRENT_TIMESTAMP'
    )->execute([$ip]);
    $st = $pdo->prepare('SELECT failures FROM np_gest_login_lock WHERE ip = ?');
    $st->execute([$ip]);
    $failures = (int) $st->fetchColumn();
    if ($failures >= 5) {
        $pdo->prepare(
            'UPDATE np_gest_login_lock SET locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE ip = ?'
        )->execute([$ip]);
    }
}

function gest_attempt_login(string $username, string $password): ?string
{
    $username = trim($username);
    if ($username === '' || $password === '') {
        return 'Credenciais em falta.';
    }
    $ip = gest_client_ip();
    try {
        $pdo = gest_pdo();
    } catch (Throwable $e) {
        error_log('[np-gest] DB: ' . $e->getMessage());
        return 'Serviço indisponível.';
    }
    try {
        if (gest_is_ip_locked($pdo, $ip)) {
            return 'Demasiadas tentativas. Tenta mais tarde.';
        }
        $st = $pdo->prepare(
            'SELECT id, username, password_hash, role, is_active FROM np_gest_users WHERE username = ? LIMIT 1'
        );
        $st->execute([$username]);
        $u = $st->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        error_log('[np-gest] login: ' . $e->getMessage());
        return 'Serviço indisponível.';
    }
    if (!$u || !(int) $u['is_active'] || !password_verify($password, $u['password_hash'])) {
        try {
            gest_register_failed_login($pdo, $ip);
        } catch (Throwable $e) {
            error_log('[np-gest] login_lock: ' . $e->getMessage());
            return 'Serviço indisponível.';
        }
        return 'Credenciais inválidas.';
    }
    try {
        gest_clear_ip_lock($pdo, $ip);
    } catch (Throwable $e) {
        error_log('[np-gest] clear_lock: ' . $e->getMessage());
    }
    if (function_exists('session_regenerate_id')) {
        @session_regenerate_id(true);
    }
    $_SESSION['gest_uid']         = (int) $u['id'];
    $_SESSION['gest_username']   = (string) $u['username'];
    $_SESSION['gest_role']       = (string) $u['role'];
    $_SESSION['gest_last_seen'] = time();
    try {
        $pdo->prepare('UPDATE np_gest_users SET last_login = NOW() WHERE id = ?')->execute([(int) $u['id']]);
    } catch (Throwable $e) {
        error_log('[np-gest] last_login: ' . $e->getMessage());
    }
    return null;
}

function gest_require_login(): void
{
    gest_start_session();
    $idle = gest_idle_seconds();
    if (!empty($_SESSION['gest_last_seen']) && (time() - (int) $_SESSION['gest_last_seen']) > $idle) {
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        gest_redirect_login();
    }
    if (empty($_SESSION['gest_uid'])) {
        gest_redirect_login();
    }
    try {
        $pdo = gest_pdo();
        $st = $pdo->prepare(
            'SELECT id, username, role FROM np_gest_users WHERE id = ? AND is_active = 1 LIMIT 1'
        );
        $st->execute([(int) $_SESSION['gest_uid']]);
        $u = $st->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        error_log('[np-gest] session: ' . $e->getMessage());
        gest_redirect_login();
    }
    if (!$u) {
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        gest_redirect_login();
    }
    $_SESSION['gest_username'] = (string) $u['username'];
    $_SESSION['gest_role']     = (string) $u['role'];
    $_SESSION['gest_last_seen'] = time();
    $GLOBALS['GEST_USER'] = [
        'id'       => (int) $u['id'],
        'username' => (string) $u['username'],
        'role'     => (string) $u['role'],
    ];
}

function gest_redirect_login(): void
{
    $path = gest_cfg()['app']['base_url_path'] ?? '/np-gest';
    header('Location: ' . rtrim($path, '/') . '/login.php', true, 302);
    exit;
}

function gest_is_logged_in(): bool
{
    gest_start_session();
    return !empty($_SESSION['gest_uid']);
}

function gest_user(): ?array
{
    return $GLOBALS['GEST_USER'] ?? null;
}

/** Navegação da sidebar: chave => roles permitidos */
function gest_nav_visible(string $key): bool
{
    $u = gest_user();
    $role = $u['role'] ?? '';
    $map = [
        'dashboard'    => ['admin', 'agent', 'moderator'],
        'users'        => ['admin', 'agent', 'moderator'],
        'content'      => ['admin', 'agent', 'moderator'],
        'tickets'      => ['admin', 'agent', 'moderator'],
        'stats'        => ['admin', 'agent'],
        'patch_notes'  => ['admin', 'moderator'],
        'settings'     => ['admin'],
        'diagnostics'  => ['admin', 'agent', 'moderator'],
    ];
    return in_array($role, $map[$key] ?? [], true);
}

function gest_require_nav(string $key): void
{
    if (!gest_nav_visible($key)) {
        http_response_code(403);
        exit('Acesso negado.');
    }
}

function gest_csrf_token(): string
{
    gest_start_session();
    if (empty($_SESSION['gest_csrf'])) {
        $_SESSION['gest_csrf'] = bin2hex(random_bytes(32));
    }
    return (string) $_SESSION['gest_csrf'];
}

function gest_verify_csrf(?string $token): bool
{
    gest_start_session();
    $s = (string) ($_SESSION['gest_csrf'] ?? '');
    return $s !== '' && is_string($token) && hash_equals($s, $token);
}

$gestSkipSession = php_sapi_name() === 'cli'
    && basename((string) ($_SERVER['SCRIPT_FILENAME'] ?? '')) === 'cron_purge_soft_deleted.php';

if (!$gestSkipSession) {
    gest_send_security_headers();
    gest_start_session();
    if (!gest_is_public_script()) {
        gest_require_login();
    }
}
