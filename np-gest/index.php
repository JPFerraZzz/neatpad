<?php
declare(strict_types=1);
$gest_active = 'dashboard';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/inc/shell.php';

$dashTotalUids = '—';
$dashItems     = '—';
$dashAudit     = [];
try {
    $pdo = gest_pdo();
    $dashTotalUids = (string) (int) $pdo->query('SELECT COUNT(*) FROM (SELECT DISTINCT user_uid AS u FROM categories) z')->fetchColumn();
    $dashItems      = (string) (int) $pdo->query('SELECT COUNT(*) FROM items')->fetchColumn();
    require_once __DIR__ . '/inc/realtime_data.php';
    $dashAudit = gest_realtime_dashboard($pdo)['audit'];
} catch (Throwable $e) {
    error_log('[np-gest] dashboard: ' . $e->getMessage());
}

function gest_esc($s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

gest_shell_head('Dashboard');
?>
            <div class="gest-dash-head">
                <div>
                    <h1 class="gest-page-title">Dashboard</h1>
                    <p class="gest-page-lead">Resumo operacional. Actualização automática a cada 30 s.</p>
                </div>
                <span id="gestLiveDot" class="gest-live-dot" aria-label="Ligação em tempo real activa">● Ao vivo</span>
            </div>

            <div class="gest-cards">
                <article class="gest-card">
                    <div class="gest-card-icon gest-card-icon--online"><i class="fas fa-signal"></i></div>
                    <div class="gest-card-body">
                        <span class="gest-card-label">Online agora (≤ 5 min, activos)</span>
                        <strong class="gest-card-value" id="gestDashOnline">—</strong>
                    </div>
                </article>
                <article class="gest-card">
                    <div class="gest-card-icon gest-card-icon--tickets"><i class="fas fa-ticket"></i></div>
                    <div class="gest-card-body">
                        <span class="gest-card-label">Tickets abertos</span>
                        <strong class="gest-card-value" id="gestDashTickets">0</strong>
                    </div>
                </article>
                <article class="gest-card">
                    <div class="gest-card-icon gest-card-icon--users"><i class="fas fa-users"></i></div>
                    <div class="gest-card-body">
                        <span class="gest-card-label">UIDs com dados na app</span>
                        <strong class="gest-card-value"><?php echo gest_esc($dashTotalUids); ?></strong>
                    </div>
                </article>
                <article class="gest-card">
                    <div class="gest-card-icon gest-card-icon--items"><i class="fas fa-file-lines"></i></div>
                    <div class="gest-card-body">
                        <span class="gest-card-label">Itens totais</span>
                        <strong class="gest-card-value"><?php echo gest_esc($dashItems); ?></strong>
                    </div>
                </article>
            </div>

            <section class="gest-panel gest-audit-feed" aria-labelledby="gestAuditFeedTitle">
                <h2 class="gest-panel__title" id="gestAuditFeedTitle">Últimas acções (auditoria)</h2>
                <div id="gestDashAudit" class="gest-audit-feed__body">
                    <?php if ($dashAudit === []): ?>
                        <p class="gest-muted-line gest-audit-feed__empty">Sem eventos ainda.</p>
                    <?php else: ?>
                        <ul class="gest-audit-feed__list">
                            <?php foreach ($dashAudit as $a): ?>
                                <li class="gest-audit-feed__item">
                                    <time><?php echo gest_esc(substr((string) ($a['created_at'] ?? ''), 0, 19)); ?></time>
                                    <strong><?php echo gest_esc($a['gest_username'] ?? '—'); ?></strong>
                                    · <?php echo gest_esc((string) ($a['action'] ?? '')); ?>
                                    <?php if (!empty($a['target_uid'])): ?>
                                        <span class="gest-mono"><?php echo gest_esc((string) $a['target_uid']); ?></span>
                                    <?php endif; ?>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    <?php endif; ?>
                </div>
            </section>
<?php
gest_shell_foot();
