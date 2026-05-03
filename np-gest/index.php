<?php
declare(strict_types=1);
$gest_active = 'dashboard';
require_once __DIR__ . '/auth.php';
$user = gest_user();
?>
<!DOCTYPE html>
<html lang="pt-PT" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Dashboard — NeatPad Studio</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="gest-body">
    <header class="gest-topbar">
        <div class="gest-topbar-brand">
            <span class="gest-topbar-logo"><i class="fas fa-layer-group" aria-hidden="true"></i></span>
            <span class="gest-topbar-title">NeatPad Studio</span>
        </div>
        <div class="gest-topbar-user">
            <span class="gest-topbar-name"><?php echo htmlspecialchars($user['username'] ?? '', ENT_QUOTES, 'UTF-8'); ?></span>
            <span class="gest-badge gest-badge--<?php echo htmlspecialchars($user['role'] ?? 'agent', ENT_QUOTES, 'UTF-8'); ?>">
                <?php echo htmlspecialchars($user['role'] ?? '', ENT_QUOTES, 'UTF-8'); ?>
            </span>
            <a class="gest-btn-logout" href="logout.php">Sair</a>
        </div>
    </header>

    <div class="gest-shell">
        <?php require __DIR__ . '/sidebar.php'; ?>
        <main class="gest-main" id="gestMain">
            <h1 class="gest-page-title">Dashboard</h1>
            <p class="gest-page-lead">Resumo operacional. Os valores abaixo são placeholders até integração com dados reais.</p>

            <div class="gest-cards">
                <article class="gest-card">
                    <div class="gest-card-icon gest-card-icon--users"><i class="fas fa-users"></i></div>
                    <div class="gest-card-body">
                        <span class="gest-card-label">Total utilizadores</span>
                        <strong class="gest-card-value">—</strong>
                    </div>
                </article>
                <article class="gest-card">
                    <div class="gest-card-icon gest-card-icon--items"><i class="fas fa-file-lines"></i></div>
                    <div class="gest-card-body">
                        <span class="gest-card-label">Itens totais</span>
                        <strong class="gest-card-value">—</strong>
                    </div>
                </article>
                <article class="gest-card">
                    <div class="gest-card-icon gest-card-icon--tickets"><i class="fas fa-ticket"></i></div>
                    <div class="gest-card-body">
                        <span class="gest-card-label">Tickets abertos</span>
                        <strong class="gest-card-value">—</strong>
                    </div>
                </article>
                <article class="gest-card">
                    <div class="gest-card-icon gest-card-icon--online"><i class="fas fa-signal"></i></div>
                    <div class="gest-card-body">
                        <span class="gest-card-label">Online agora</span>
                        <strong class="gest-card-value">—</strong>
                    </div>
                </article>
            </div>
        </main>
    </div>
    <script src="assets/js/app.js"></script>
</body>
</html>
