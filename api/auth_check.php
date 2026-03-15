<?php
/**
 * Helper de autenticação por sessão.
 * Incluir no topo de cada endpoint protegido.
 */
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
    return $_SESSION['uid'];
}
