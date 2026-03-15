<?php
/**
 * FerrazNest — Conexão à base de dados
 */

// Suporta variáveis do Railway (MYSQLHOST, etc.) e variáveis próprias (DB_HOST, etc.)
define('DB_HOST', getenv('DB_HOST') ?: getenv('MYSQLHOST')     ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: getenv('MYSQLPORT')     ?: '3306');
define('DB_USER', getenv('DB_USER') ?: getenv('MYSQLUSER')     ?: 'organizer');
define('DB_PASS', getenv('DB_PASS') ?: getenv('MYSQLPASSWORD') ?: 'organizer123');
define('DB_NAME', getenv('DB_NAME') ?: getenv('MYSQLDATABASE') ?: 'ferraznest');

date_default_timezone_set('Europe/Lisbon');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
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
            jsonResponse(false, null, 'Erro de conexão: ' . $e->getMessage(), 500);
        }
    }
    return $pdo;
}

function jsonResponse(bool $success, $data = null, ?string $error = null, int $httpCode = 200): void {
    http_response_code($httpCode);
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
