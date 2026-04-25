<?php
/**
 * Helper de autenticação por sessão.
 * Incluir no topo de cada endpoint protegido.
 * Usa sessões em MySQL para funcionar no Railway (multi-instância).
 *
 * Faz também:
 *  - sendSecureHeaders()  (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
 *  - assertCsrfSafe()     (bloqueia POST/PUT/DELETE sem X-Requested-With)
 *  - rateLimit() leve por IP+endpoint (defesa contra abuso de API)
 */
require_once __DIR__ . '/session_db.php';
require_once __DIR__ . '/security.php';

initDbSession();
sendSecureHeaders();
assertCsrfSafe();

// Rate limit global por IP + endpoint: 120 pedidos / minuto
$endpoint = basename($_SERVER['SCRIPT_NAME'] ?? 'api');
rateLimit('api:' . $endpoint . ':' . clientIp(), 120, 60);

function requireAuth(): string {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (empty($_SESSION['uid'])) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Não autenticado', 'data' => null]);
        exit;
    }
    // Defesa contra session hijacking entre user-agents radicalmente diferentes.
    // Não usamos IP porque NAT móvel/wifi alterna o IP frequentemente.
    $fp = hash('sha256', ($_SERVER['HTTP_USER_AGENT'] ?? '') . '|neatpad');
    if (!isset($_SESSION['fp'])) {
        $_SESSION['fp'] = $fp;
    } elseif (!hash_equals($_SESSION['fp'], $fp)) {
        session_unset();
        session_destroy();
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Sessão inválida', 'data' => null]);
        exit;
    }
    return $_SESSION['uid'];
}
