<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

$_SESSION = [];
if (session_status() === PHP_SESSION_ACTIVE) {
    session_destroy();
}
$p = gest_cfg()['app']['base_url_path'] ?? '/np-gest';
header('Location: ' . rtrim($p, '/') . '/login.php', true, 302);
exit;
