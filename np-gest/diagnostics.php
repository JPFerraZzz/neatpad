<?php
declare(strict_types=1);

$gest_active = 'diagnostics';
require_once __DIR__ . '/auth.php';
gest_require_nav('diagnostics');
require_once __DIR__ . '/inc/permissions.php';
require_once __DIR__ . '/inc/user_repo.php';
require_once __DIR__ . '/inc/shell.php';

$uid = trim((string) ($_GET['uid'] ?? ''));
if ($uid !== '' && (strlen($uid) > 128 || !preg_match('/^[a-zA-Z0-9._:-]+$/', $uid))) {
    http_response_code(400);
    $uid = '';
}

try {
    $pdo = gest_pdo();
} catch (Throwable $e) {
    error_log('[np-gest] diagnostics: ' . $e->getMessage());
    exit('Serviço indisponível.');
}

if ($uid !== '' && isset($_GET['export']) && $_GET['export'] === 'activity_csv') {
    if (!gest_can_export_activity_csv()) {
        http_response_code(403);
        exit('Acesso negado.');
    }
    $rows = gest_user_activity($pdo, $uid, 5000);
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="activity_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $uid) . '.csv"');
    echo "\xEF\xBB\xBF";
    $out = fopen('php://output', 'w');
    fputcsv($out, ['id', 'action', 'target_type', 'target_id', 'ip', 'created_at'], ';');
    foreach ($rows as $r) {
        fputcsv($out, [$r['id'], $r['action'], $r['target_type'], $r['target_id'], $r['ip'], $r['created_at']], ';');
    }
    fclose($out);
    exit;
}

$meta       = $uid !== '' ? gest_user_get_meta($pdo, $uid) : null;
$activity   = $uid !== '' ? gest_user_activity($pdo, $uid, 80) : [];
$logins     = $uid !== '' ? gest_user_login_log($pdo, $uid, 40) : [];
$sessions   = $uid !== '' ? gest_user_php_sessions($pdo, $uid, 40) : [];
$lastIp     = '';
if ($logins !== [] && isset($logins[0]['ip'])) {
    $lastIp = (string) $logins[0]['ip'];
}
$errByUid = $uid !== '' && gest_can_view_app_error_log() ? gest_app_errors_by_uid($pdo, $uid, 40) : [];
$errByIp  = ($lastIp !== '' && gest_can_view_app_error_log() && gest_role() !== 'agent')
    ? gest_app_errors_by_ip($pdo, $lastIp, 25)
    : [];
$fullAudit = gest_can_view_full_audit() ? gest_audit_log_all($pdo, 150) : [];

$csrf = gest_csrf_token();

gest_shell_head('Diagnóstico');
?>
            <div class="gest-page-head">
                <h1 class="gest-page-title">Diagnóstico</h1>
                <p class="gest-page-lead">Ferramentas por UID. Agente: actividade, sessões e logout. Moderador+: erros indexados e reset de sessão. Admin: auditoria global.</p>
            </div>

            <form class="gest-filters" method="get" action="diagnostics.php">
                <label class="gest-filters__field gest-filters__field--grow">
                    <span>Firebase UID</span>
                    <input type="text" name="uid" value="<?php echo htmlspecialchars($uid, ENT_QUOTES, 'UTF-8'); ?>" placeholder="Cole o UID" class="gest-input" autocapitalize="off">
                </label>
                <div class="gest-filters__actions">
                    <button type="submit" class="gest-btn gest-btn--primary">Carregar</button>
                    <?php if ($uid !== ''): ?>
                        <a class="gest-btn gest-btn--ghost" href="user-detail.php?uid=<?php echo rawurlencode($uid); ?>">Perfil</a>
                    <?php endif; ?>
                </div>
            </form>

            <?php if ($uid === ''): ?>
                <p class="gest-muted-line">Introduz um UID para ver dados.</p>
            <?php else: ?>

                <section class="gest-panel">
                    <h2 class="gest-panel__title">Estado da conta</h2>
                    <dl class="gest-dl">
                        <dt>Estado (meta)</dt><dd><?php echo htmlspecialchars($meta ? (string) ($meta['status'] ?? '') : '— (sem linha em meta)', ENT_QUOTES, 'UTF-8'); ?></dd>
                        <dt>Soft delete</dt><dd><?php echo htmlspecialchars($meta ? substr((string) ($meta['deleted_at'] ?? ''), 0, 19) : '—', ENT_QUOTES, 'UTF-8'); ?></dd>
                        <dt>Recuperável pelo teu perfil</dt><dd><?php
                            $d = $meta ? gest_days_since_deleted($meta['deleted_at'] ?? null) : null;
                        echo ($d !== null && $d <= gest_recovery_days()) ? 'sim (dentro da janela)' : 'não ou N/A';
                        ?></dd>
                    </dl>
                </section>

                <section class="gest-panel">
                    <h2 class="gest-panel__title">Actividade (np_gest_activity_log)</h2>
                    <?php if (gest_can_export_activity_csv()): ?>
                        <a class="gest-btn gest-btn--ghost" href="diagnostics.php?uid=<?php echo rawurlencode($uid); ?>&export=activity_csv">Exportar CSV</a>
                    <?php endif; ?>
                    <div class="gest-table-wrap">
                        <table class="gest-table gest-table--compact">
                            <thead>
                                <tr><th>Data</th><th>Acção</th><th>Alvo</th><th>IP</th></tr>
                            </thead>
                            <tbody>
                                <?php foreach ($activity as $r): ?>
                                    <tr>
                                        <td class="gest-table__date"><?php echo htmlspecialchars(substr((string) $r['created_at'], 0, 19), ENT_QUOTES, 'UTF-8'); ?></td>
                                        <td><?php echo htmlspecialchars((string) $r['action'], ENT_QUOTES, 'UTF-8'); ?></td>
                                        <td class="gest-mono"><?php echo htmlspecialchars(trim((string) ($r['target_type'] ?? '') . ' ' . (string) ($r['target_id'] ?? '')), ENT_QUOTES, 'UTF-8'); ?></td>
                                        <td><?php echo htmlspecialchars((string) ($r['ip'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                                <?php if ($activity === []): ?>
                                    <tr><td colspan="4" class="gest-table__empty">Sem eventos (integra gravação na app ou insere testes na BD).</td></tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section class="gest-panel">
                    <h2 class="gest-panel__title">Logins recentes</h2>
                    <div class="gest-table-wrap">
                        <table class="gest-table gest-table--compact">
                            <thead><tr><th>Data</th><th>OK</th><th>IP</th><th>UA (resumo)</th></tr></thead>
                            <tbody>
                                <?php foreach ($logins as $L): ?>
                                    <tr>
                                        <td class="gest-table__date"><?php echo htmlspecialchars(substr((string) $L['created_at'], 0, 19), ENT_QUOTES, 'UTF-8'); ?></td>
                                        <td><?php echo !empty($L['success']) ? 'sim' : 'não'; ?></td>
                                        <td class="gest-mono"><?php echo htmlspecialchars((string) ($L['ip'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                                        <td><?php echo htmlspecialchars(mb_substr((string) ($L['user_agent'] ?? ''), 0, 48), ENT_QUOTES, 'UTF-8'); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                                <?php if ($logins === []): ?>
                                    <tr><td colspan="4" class="gest-table__empty">Sem registos.</td></tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section class="gest-panel">
                    <h2 class="gest-panel__title">Sessões PHP</h2>
                    <p class="gest-hint"><?php echo count($sessions); ?> linha(s) em php_sessions com o UID no payload.</p>
                    <?php if (gest_can_force_logout()): ?>
                        <button type="button" class="gest-btn gest-btn--danger gest-diag-logout" data-uid="<?php echo htmlspecialchars($uid, ENT_QUOTES, 'UTF-8'); ?>">Forçar logout</button>
                    <?php endif; ?>
                    <?php if (gest_can_reset_php_sessions()): ?>
                        <button type="button" class="gest-btn gest-btn--ghost gest-diag-reset" data-uid="<?php echo htmlspecialchars($uid, ENT_QUOTES, 'UTF-8'); ?>">Reset de sessão PHP</button>
                    <?php endif; ?>
                </section>

                <?php if (gest_can_view_app_error_log()): ?>
                    <section class="gest-panel">
                        <h2 class="gest-panel__title">Erros PHP indexados (np_gest_app_error_log)</h2>
                        <div class="gest-table-wrap">
                            <table class="gest-table gest-table--compact">
                                <thead><tr><th>Data</th><th>Mensagem</th><th>IP</th></tr></thead>
                                <tbody>
                                    <?php foreach ($errByUid as $e): ?>
                                        <tr>
                                            <td class="gest-table__date"><?php echo htmlspecialchars(substr((string) $e['created_at'], 0, 19), ENT_QUOTES, 'UTF-8'); ?></td>
                                            <td><?php echo htmlspecialchars(mb_substr((string) $e['message'], 0, 120), ENT_QUOTES, 'UTF-8'); ?></td>
                                            <td><?php echo htmlspecialchars((string) ($e['ip'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                    <?php if ($errByUid === []): ?>
                                        <tr><td colspan="3" class="gest-table__empty">Sem erros associados a este UID.</td></tr>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                        <?php if ($lastIp !== '' && gest_role() !== 'agent'): ?>
                            <h3 class="gest-subtitle">Erros pelo último IP de login (<?php echo htmlspecialchars($lastIp, ENT_QUOTES, 'UTF-8'); ?>)</h3>
                            <div class="gest-table-wrap">
                                <table class="gest-table gest-table--compact">
                                    <thead><tr><th>Data</th><th>UID</th><th>Mensagem</th></tr></thead>
                                    <tbody>
                                        <?php foreach ($errByIp as $e): ?>
                                            <tr>
                                                <td class="gest-table__date"><?php echo htmlspecialchars(substr((string) $e['created_at'], 0, 19), ENT_QUOTES, 'UTF-8'); ?></td>
                                                <td class="gest-mono"><?php echo htmlspecialchars((string) ($e['uid'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                                                <td><?php echo htmlspecialchars(mb_substr((string) $e['message'], 0, 100), ENT_QUOTES, 'UTF-8'); ?></td>
                                            </tr>
                                        <?php endforeach; ?>
                                        <?php if ($errByIp === []): ?>
                                            <tr><td colspan="3" class="gest-table__empty">Sem erros para este IP.</td></tr>
                                        <?php endif; ?>
                                    </tbody>
                                </table>
                            </div>
                        <?php endif; ?>
                    </section>
                <?php endif; ?>

                <?php if ($fullAudit !== []): ?>
                    <section class="gest-panel">
                        <h2 class="gest-panel__title">Auditoria global (admin)</h2>
                        <div class="gest-table-wrap">
                            <table class="gest-table gest-table--compact">
                                <thead><tr><th>Data</th><th>Staff</th><th>Acção</th><th>UID alvo</th></tr></thead>
                                <tbody>
                                    <?php foreach ($fullAudit as $a): ?>
                                        <tr>
                                            <td class="gest-table__date"><?php echo htmlspecialchars(substr((string) $a['created_at'], 0, 19), ENT_QUOTES, 'UTF-8'); ?></td>
                                            <td><?php echo htmlspecialchars((string) ($a['gest_username'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                                            <td><?php echo htmlspecialchars((string) $a['action'], ENT_QUOTES, 'UTF-8'); ?></td>
                                            <td class="gest-mono"><?php echo htmlspecialchars((string) ($a['target_uid'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </section>
                <?php endif; ?>

                <p id="gestDiagMsg" class="gest-inline-msg" hidden></p>
                <input type="hidden" id="gestCsrf" value="<?php echo htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8'); ?>">

            <?php endif; ?>

<?php
gest_shell_foot($uid !== '' ? ['assets/js/users.js'] : []);
