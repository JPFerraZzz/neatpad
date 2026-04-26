<?php
/**
 * Endpoint de autenticação
 *
 * GET    — Devolve o estado da sessão atual
 * POST   — Verifica token Firebase e cria sessão PHP
 * DELETE — Termina sessão (logout)
 */
require_once __DIR__ . '/session_db.php';
require_once __DIR__ . '/security.php';
require_once __DIR__ . '/db.php';   // CORS + jsonResponse + IS_PRODUCTION

initDbSession();
sendSecureHeaders();

if (session_status() === PHP_SESSION_NONE) session_start();

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/firebase_verify.php';

$method = $_SERVER['REQUEST_METHOD'];

// CSRF para POST/DELETE (state-changing)
assertCsrfSafe();

// Rate limit por IP — defesa contra brute force / spam de logins
if ($method === 'POST') {
    rateLimit('login:' . clientIp(), 10, 300);  // 10 tentativas / 5 min
}

// GET — estado da sessão
if ($method === 'GET') {
    if (!empty($_SESSION['uid'])) {
        echo json_encode([
            'success' => true,
            'data'    => [
                'uid'   => $_SESSION['uid'],
                'email' => $_SESSION['email'] ?? '',
                'name'  => $_SESSION['name']  ?? '',
            ],
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'data' => null, 'error' => 'Não autenticado']);
    }
    exit;
}

// DELETE — logout
if ($method === 'DELETE') {
    session_unset();
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

// POST — login com token Firebase
if ($method === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $token = trim($input['token'] ?? '');

        if (!$token) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Token em falta']);
            exit;
        }

        $payload = verifyFirebaseToken($token, FIREBASE_PROJECT_ID);

        if (!$payload) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error'   => 'Token inválido ou expirado. Verifica FIREBASE_PROJECT_ID no Railway (deve ser: ' . FIREBASE_PROJECT_ID . ').',
            ]);
            exit;
        }

        // Defesa contra session fixation: novo ID assim que o user autentica.
        if (function_exists('session_regenerate_id')) {
            @session_regenerate_id(true);
        }

        $_SESSION['uid']   = $payload['sub'];
        $_SESSION['email'] = $payload['email'] ?? '';
        $_SESSION['name']  = $payload['name']  ?? ($payload['email'] ?? 'Utilizador');
        // Fingerprint estável por família de UA (ver auth_check.php :: uaFamilyFingerprint).
        // Tolerante a updates de browser e à transição browser→PWA standalone.
        $_SESSION['fp']    = uaFamilyFingerprint();
        $_SESSION['login_at'] = time();

        echo json_encode([
            'success' => true,
            'data'    => [
                'uid'   => $_SESSION['uid'],
                'email' => $_SESSION['email'],
                'name'  => $_SESSION['name'],
            ],
        ]);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Erro no servidor: ' . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Método não suportado']);
