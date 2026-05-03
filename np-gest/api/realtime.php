<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/auth.php';
require_once dirname(__DIR__) . '/inc/realtime_data.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método inválido.']);
    exit;
}

$type = (string) ($_GET['type'] ?? '');

try {
    $pdo = gest_pdo();
} catch (Throwable $e) {
    error_log('[np-gest] realtime: ' . $e->getMessage());
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => 'Serviço indisponível.']);
    exit;
}

try {
    switch ($type) {
        case 'dashboard':
            $d = gest_realtime_dashboard($pdo);
            echo json_encode([
                'success'         => true,
                'active_online'   => $d['active_online'],
                'tickets_open'    => $d['tickets_open'],
                'audit'           => $d['audit'],
            ], JSON_UNESCAPED_UNICODE);
            exit;

        case 'users_status':
            $users = gest_realtime_users_status($pdo);
            echo json_encode(['success' => true, 'users' => $users], JSON_UNESCAPED_UNICODE);
            exit;

        case 'audit_feed':
            $audit = gest_realtime_audit_feed($pdo, 10);
            echo json_encode(['success' => true, 'audit' => $audit], JSON_UNESCAPED_UNICODE);
            exit;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Parâmetro type inválido.']);
            exit;
    }
} catch (Throwable $e) {
    error_log('[np-gest] realtime type=' . $type . ' ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro ao obter dados.']);
    exit;
}
