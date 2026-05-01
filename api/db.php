<?php
/**
 * NeatPad — Conexão à base de dados
 */

date_default_timezone_set('Europe/Lisbon');

// IS_PRODUCTION — quando true, mensagens de erro genéricas (sem stack traces).
// Define NEATPAD_ENV=production no servidor para activar.
if (!defined('NEATPAD_IS_PRODUCTION')) {
    define('NEATPAD_IS_PRODUCTION', getenv('NEATPAD_ENV') === 'production');
}

// Suporta variáveis do Railway (MYSQLHOST ou MYSQL_HOST, etc.) e variáveis próprias
define('DB_HOST', getenv('DB_HOST') ?: getenv('MYSQLHOST') ?: getenv('MYSQL_HOST')     ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: getenv('MYSQLPORT') ?: getenv('MYSQL_PORT')     ?: '3306');
define('DB_USER', getenv('DB_USER') ?: getenv('MYSQLUSER') ?: getenv('MYSQL_USER')     ?: 'organizer');
// Em produção não há palavra-passe por defeito — obriga variáveis de ambiente.
define(
    'DB_PASS',
    getenv('DB_PASS') ?: getenv('MYSQLPASSWORD') ?: getenv('MYSQL_PASSWORD')
        ?: (NEATPAD_IS_PRODUCTION ? '' : 'organizer123')
);
define('DB_NAME', getenv('DB_NAME') ?: getenv('MYSQLDATABASE') ?: getenv('MYSQL_DATABASE') ?: 'neatpad');

header('Content-Type: application/json; charset=utf-8');

// CORS restrito: só responde com Allow-Origin se o pedido vier de um host
// que conhecemos (mesma origem ou lista whitelist via env ALLOWED_ORIGINS,
// separado por vírgulas). Cookies de sessão exigem Allow-Origin específico
// (não pode ser '*') quando Allow-Credentials é true.
(function () {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') return;

    $allowed = [];
    $env = getenv('ALLOWED_ORIGINS');
    if ($env) {
        foreach (explode(',', $env) as $o) {
            $o = trim($o);
            if ($o !== '') $allowed[] = $o;
        }
    }
    // Mesmo origin sempre aceite (host atual)
    $hostScheme = (
        (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
    ) ? 'https://' : 'http://';
    $selfOrigin = $hostScheme . ($_SERVER['HTTP_HOST'] ?? '');
    if (!in_array($selfOrigin, $allowed, true)) $allowed[] = $selfOrigin;

    if (in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
        header('Access-Control-Max-Age: 600');
    }
})();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]
            );
        } catch (PDOException $e) {
            error_log('[NeatPad] DB connect failed: ' . $e->getMessage());
            jsonResponse(false, null, NEATPAD_IS_PRODUCTION ? 'Base de dados indisponível' : 'Erro de conexão: ' . $e->getMessage(), 500);
        }
    }
    return $pdo;
}

function jsonResponse(bool $success, $data = null, ?string $error = null, int $httpCode = 200): void {
    http_response_code($httpCode);
    // Em produção, nunca devolvemos stack traces ou mensagens internas (DB schema, etc.)
    if (!$success && NEATPAD_IS_PRODUCTION && $error !== null) {
        // Mantém códigos de validação (400/404) com mensagem; substitui apenas em 5xx
        if ($httpCode >= 500) {
            error_log('[NeatPad] ' . $httpCode . ': ' . $error);
            $error = 'Erro interno do servidor';
        }
    }
    echo json_encode([
        'success' => $success,
        'data'    => $data,
        'error'   => $error,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function getInput(): ?array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return null;
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        jsonResponse(false, null, 'JSON inválido: ' . json_last_error_msg(), 400);
    }
    return $data;
}
