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
    // Fingerprint de família (não de versão), tolerante a updates de browser
    // e à transição browser → PWA standalone (mesmo aparelho, UA diferente).
    // O cookie já é HttpOnly + Secure + SameSite=Lax + use_strict_mode, por
    // isso esta verificação é apenas uma camada extra leve, não a principal.
    $fp = uaFamilyFingerprint();
    if (!isset($_SESSION['fp'])) {
        $_SESSION['fp'] = $fp;
    } elseif (!hash_equals($_SESSION['fp'], $fp)) {
        // Em vez de destruir a sessão (causa 401 + logout falso no mobile),
        // limitamo-nos a atualizar o fingerprint e a registar a discrepância.
        // Mudança de família real (mobile→desktop, etc.) vai continuar a ser
        // possível, mas é raríssima dentro do mesmo navegador autenticado.
        @error_log('NeatPad: UA family changed mid-session for uid=' . $_SESSION['uid']);
        $_SESSION['fp'] = $fp;
    }
    return $_SESSION['uid'];
}
