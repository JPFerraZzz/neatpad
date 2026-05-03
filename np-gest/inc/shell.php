<?php
declare(strict_types=1);

/**
 * @param array<string, string> $extraHead optional link rel / meta lines
 */
function gest_shell_head(string $title, array $extraHead = []): void
{
    $user = gest_user();
    ?>
<!DOCTYPE html>
<html lang="pt-PT" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title><?php echo htmlspecialchars($title, ENT_QUOTES, 'UTF-8'); ?> — NeatPad Studio</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
    <?php foreach ($extraHead as $line) {
        echo $line . "\n";
    } ?>
</head>
<body class="gest-body" data-gest-root="<?php echo htmlspecialchars(rtrim((string) (gest_cfg()['app']['base_url_path'] ?? '/np-gest'), '/'), ENT_QUOTES, 'UTF-8'); ?>">
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
        <?php require __DIR__ . '/../sidebar.php'; ?>
        <main class="gest-main" id="gestMain">
    <?php
}

function gest_shell_foot(array $scripts = []): void
{
    ?>
        </main>
    </div>
    <script src="assets/js/app.js"></script>
    <?php foreach ($scripts as $src) {
        $s = htmlspecialchars($src, ENT_QUOTES, 'UTF-8');
        echo '<script src="' . $s . '"></script>' . "\n";
    } ?>
    <script src="assets/js/realtime.js"></script>
</body>
</html>
    <?php
}

function gest_avatar_letter(string $name, string $email): string
{
    $t = trim($name);
    if ($t !== '') {
        return mb_strtoupper(mb_substr($t, 0, 1));
    }
    $e = trim($email);
    if ($e !== '') {
        return mb_strtoupper(mb_substr($e, 0, 1));
    }
    return '?';
}
