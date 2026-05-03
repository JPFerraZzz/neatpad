<?php
declare(strict_types=1);
$gest_active = 'dashboard';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/inc/shell.php';
require_once __DIR__ . '/inc/user_repo.php';

$user = gest_user();

$dashUsers = '—';
$dashItems = '—';
try {
    $pdo = gest_pdo();
    $dashUsers = (string) (int) $pdo->query('SELECT COUNT(*) FROM (SELECT DISTINCT user_uid AS u FROM categories) z')->fetchColumn();
    $dashItems = (string) (int) $pdo->query('SELECT COUNT(*) FROM items')->fetchColumn();
} catch (Throwable $e) {
    error_log('[np-gest] dashboard: ' . $e->getMessage());
}

gest_shell_head('Dashboard');
?>
            <h1 class="gest-page-title">Dashboard</h1>
            <p class="gest-page-lead">Resumo operacional. Tickets e restantes módulos serão ligados aqui.</p>

            <div class="gest-cards">
                <article class="gest-card">
                    <div class="gest-card-icon gest-card-icon--users"><i class="fas fa-users"></i></div>
                    <div class="gest-card-body">
                        <span class="gest-card-label">Total utilizadores (UIDs com dados)</span>
                        <strong class="gest-card-value"><?php echo htmlspecialchars($dashUsers, ENT_QUOTES, 'UTF-8'); ?></strong>
                    </div>
                </article>
                <article class="gest-card">
                    <div class="gest-card-icon gest-card-icon--items"><i class="fas fa-file-lines"></i></div>
                    <div class="gest-card-body">
                        <span class="gest-card-label">Itens totais</span>
                        <strong class="gest-card-value"><?php echo htmlspecialchars($dashItems, ENT_QUOTES, 'UTF-8'); ?></strong>
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
<?php
gest_shell_foot();
