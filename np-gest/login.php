<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

if (gest_is_logged_in()) {
    $p = gest_cfg()['app']['base_url_path'] ?? '/np-gest';
    header('Location: ' . rtrim($p, '/') . '/index.php', true, 302);
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $u = isset($_POST['username']) ? (string) $_POST['username'] : '';
    $p = isset($_POST['password']) ? (string) $_POST['password'] : '';
    $error = gest_attempt_login($u, $p);
    if ($error === null) {
        $base = gest_cfg()['app']['base_url_path'] ?? '/np-gest';
        header('Location: ' . rtrim($base, '/') . '/index.php', true, 302);
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="pt-PT" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Entrar</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="gest-login-body">
    <div class="gest-login-wrap">
        <div class="gest-login-card">
            <div class="gest-login-logo" aria-hidden="true"><i class="fas fa-layer-group"></i></div>
            <h1 class="gest-login-title">NeatPad Studio</h1>
            <p class="gest-login-lead">Inicia sessão para continuar.</p>
            <?php if ($error !== ''): ?>
                <div class="gest-login-error" role="alert"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></div>
            <?php endif; ?>
            <form method="post" action="" class="gest-login-form" autocomplete="on">
                <label class="gest-login-label" for="username">Utilizador</label>
                <input class="gest-login-input" type="text" id="username" name="username" required autocomplete="username" autocapitalize="none">

                <label class="gest-login-label" for="password">Palavra-passe</label>
                <input class="gest-login-input" type="password" id="password" name="password" required autocomplete="current-password">

                <button type="submit" class="gest-login-submit">Entrar</button>
            </form>
        </div>
    </div>
</body>
</html>
