<?php
declare(strict_types=1);

$gest_active = 'users';
require_once __DIR__ . '/auth.php';
gest_require_nav('users');
require_once __DIR__ . '/inc/permissions.php';
require_once __DIR__ . '/inc/user_repo.php';
require_once __DIR__ . '/inc/shell.php';

$uid = trim((string) ($_GET['uid'] ?? ''));
if ($uid === '' || strlen($uid) > 128 || !preg_match('/^[a-zA-Z0-9._:-]+$/', $uid)) {
    http_response_code(400);
    gest_shell_head('Utilizador');
    echo '<p class="gest-page-lead">UID inválido.</p>';
    gest_shell_foot();
    exit;
}

try {
    $pdo = gest_pdo();
} catch (Throwable $e) {
    error_log('[np-gest] user-detail: ' . $e->getMessage());
    exit('Serviço indisponível.');
}

$meta     = gest_user_get_meta($pdo, $uid);
$stats    = gest_user_stats($pdo, $uid);
$cats     = gest_user_categories_with_counts($pdo, $uid);
$audit    = gest_user_audit_for_target($pdo, $uid, 40);
$logins   = gest_user_login_log($pdo, $uid, 50);
$sessions = gest_user_php_sessions($pdo, $uid, 30);

$csrf         = gest_csrf_token();
$recoveryDays = gest_recovery_days();
$daysDel      = gest_days_since_deleted($meta['deleted_at'] ?? null);

gest_shell_head('Perfil');
?>
            <div class="gest-page-head gest-page-head--row">
                <div>
                    <h1 class="gest-page-title">Perfil do utilizador</h1>
                    <p class="gest-page-lead gest-mono"><?php echo htmlspecialchars($uid, ENT_QUOTES, 'UTF-8'); ?></p>
                </div>
                <div class="gest-page-head__actions">
                    <a class="gest-btn gest-btn--ghost" href="users.php">← Lista</a>
                    <a class="gest-btn gest-btn--ghost" href="diagnostics.php?uid=<?php echo rawurlencode($uid); ?>">Diagnóstico</a>
                </div>
            </div>

            <div class="gest-grid2">
                <section class="gest-panel">
                    <h2 class="gest-panel__title">Estado e metadados</h2>
                    <dl class="gest-dl">
                        <dt>Email (meta)</dt><dd><?php echo htmlspecialchars((string) ($meta['email'] ?? ''), ENT_QUOTES, 'UTF-8') ?: '—'; ?></dd>
                        <dt>Nome</dt><dd><?php echo htmlspecialchars((string) ($meta['display_name'] ?? ''), ENT_QUOTES, 'UTF-8') ?: '—'; ?></dd>
                        <dt>Perfil app</dt><dd><span class="gest-tag gest-tag--role"><?php echo htmlspecialchars((string) ($meta['role'] ?? 'user'), ENT_QUOTES, 'UTF-8'); ?></span></dd>
                        <dt>Estado</dt><dd><span class="gest-tag gest-tag--<?php echo htmlspecialchars((string) ($meta['status'] ?? 'active'), ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars((string) ($meta['status'] ?? 'active'), ENT_QUOTES, 'UTF-8'); ?></span></dd>
                        <dt>Silenciado até</dt><dd><?php echo htmlspecialchars(substr((string) ($meta['silenced_until'] ?? ''), 0, 19) ?: '—', ENT_QUOTES, 'UTF-8'); ?></dd>
                        <dt>Suspenso até</dt><dd><?php echo htmlspecialchars(substr((string) ($meta['suspension_end'] ?? ''), 0, 19) ?: '—', ENT_QUOTES, 'UTF-8'); ?></dd>
                        <dt>Soft delete em</dt><dd><?php echo htmlspecialchars(substr((string) ($meta['deleted_at'] ?? ''), 0, 19) ?: '—', ENT_QUOTES, 'UTF-8'); ?></dd>
                        <dt>Dias desde soft delete</dt><dd><?php echo $daysDel !== null ? (int) $daysDel : '—'; ?> (recuperação até <?php echo (int) $recoveryDays; ?> dias para o teu perfil)</dd>
                    </dl>
                    <?php if (gest_can_promote_meta_role()): ?>
                        <form class="gest-inline-form" id="gestFormRole">
                            <label>Promover perfil app
                                <select name="app_role" id="gestAppRole">
                                    <option value="user">user</option>
                                    <option value="vip">vip</option>
                                    <option value="support">support</option>
                                </select>
                            </label>
                            <button type="button" class="gest-btn gest-btn--primary gest-js-api" data-action="promote_role">Guardar</button>
                        </form>
                    <?php endif; ?>
                </section>

                <section class="gest-panel">
                    <h2 class="gest-panel__title">Estatísticas (BD NeatPad)</h2>
                    <ul class="gest-stat-list">
                        <li><strong><?php echo (int) $stats['categories']; ?></strong> categorias</li>
                        <li><strong><?php echo (int) $stats['items']; ?></strong> itens</li>
                        <li><strong><?php echo (int) $stats['notebooks']; ?></strong> cadernos (categorias tipo notebooks)</li>
                        <li><strong><?php echo (int) $stats['versions']; ?></strong> versões de notas</li>
                        <li><strong><?php echo number_format((int) $stats['bytes_est']); ?></strong> bytes estimados</li>
                    </ul>
                </section>
            </div>

            <?php if (gest_can_edit_notes()): ?>
                <section class="gest-panel">
                    <h2 class="gest-panel__title">Notas internas</h2>
                    <textarea class="gest-textarea" id="gestNotes" rows="5" placeholder="Visível apenas no Studio"><?php echo htmlspecialchars((string) ($meta['notes'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></textarea>
                    <button type="button" class="gest-btn gest-btn--primary gest-js-api" data-action="update_notes">Guardar notas</button>
                </section>
            <?php endif; ?>

            <section class="gest-panel">
                <h2 class="gest-panel__title">Conteúdos</h2>
                <div class="gest-table-wrap">
                    <table class="gest-table gest-table--compact">
                        <thead>
                            <tr><th>Categoria</th><th>Tipo</th><th>Itens</th><th>Actualizado</th></tr>
                        </thead>
                        <tbody>
                            <?php foreach ($cats as $c): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars((string) $c['name'], ENT_QUOTES, 'UTF-8'); ?></td>
                                    <td><?php echo htmlspecialchars((string) $c['template_type'], ENT_QUOTES, 'UTF-8'); ?></td>
                                    <td><?php echo (int) $c['item_count']; ?></td>
                                    <td class="gest-table__date"><?php echo htmlspecialchars(substr((string) $c['updated_at'], 0, 16), ENT_QUOTES, 'UTF-8'); ?></td>
                                </tr>
                            <?php endforeach; ?>
                            <?php if ($cats === []): ?>
                                <tr><td colspan="4" class="gest-table__empty">Sem categorias para este UID.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
                <p class="gest-hint">O soft delete no Studio marca <code>np_gest_user_meta</code>; a app principal pode integrar este estado mais tarde.</p>
            </section>

            <div class="gest-grid2">
                <section class="gest-panel">
                    <h2 class="gest-panel__title">Auditoria (acções sobre este UID)</h2>
                    <div class="gest-table-wrap">
                        <table class="gest-table gest-table--compact">
                            <thead>
                                <tr><th>Quando</th><th>Staff</th><th>Acção</th></tr>
                            </thead>
                            <tbody>
                                <?php foreach ($audit as $a): ?>
                                    <tr>
                                        <td class="gest-table__date"><?php echo htmlspecialchars(substr((string) $a['created_at'], 0, 19), ENT_QUOTES, 'UTF-8'); ?></td>
                                        <td><?php echo htmlspecialchars((string) ($a['gest_username'] ?? ''), ENT_QUOTES, 'UTF-8') ?: '—'; ?></td>
                                        <td><?php echo htmlspecialchars((string) $a['action'], ENT_QUOTES, 'UTF-8'); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                                <?php if ($audit === []): ?>
                                    <tr><td colspan="3" class="gest-table__empty">Sem registos.</td></tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section class="gest-panel">
                    <h2 class="gest-panel__title">Logins (tabela Studio)</h2>
                    <p class="gest-hint">Preenchida quando o login da app gravar eventos nesta tabela.</p>
                    <div class="gest-table-wrap">
                        <table class="gest-table gest-table--compact">
                            <thead>
                                <tr><th>Data</th><th>OK</th><th>IP</th></tr>
                            </thead>
                            <tbody>
                                <?php foreach ($logins as $L): ?>
                                    <tr>
                                        <td class="gest-table__date"><?php echo htmlspecialchars(substr((string) $L['created_at'], 0, 19), ENT_QUOTES, 'UTF-8'); ?></td>
                                        <td><?php echo !empty($L['success']) ? 'sim' : 'não'; ?></td>
                                        <td class="gest-mono"><?php echo htmlspecialchars((string) ($L['ip'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                                <?php if ($logins === []): ?>
                                    <tr><td colspan="3" class="gest-table__empty">Sem registos.</td></tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <section class="gest-panel">
                <h2 class="gest-panel__title">Sessões PHP (NEATPAD_SID)</h2>
                <div class="gest-table-wrap">
                    <table class="gest-table gest-table--compact">
                        <thead>
                            <tr><th>Session id (prefixo)</th><th>last_activity</th></tr>
                        </thead>
                        <tbody>
                            <?php foreach ($sessions as $s): ?>
                                <tr>
                                    <td class="gest-mono"><?php echo htmlspecialchars(substr((string) $s['id'], 0, 24) . '…', ENT_QUOTES, 'UTF-8'); ?></td>
                                    <td><?php echo (int) $s['last_activity']; ?></td>
                                </tr>
                            <?php endforeach; ?>
                            <?php if ($sessions === []): ?>
                                <tr><td colspan="2" class="gest-table__empty">Nenhuma sessão encontrada com este UID na serialização.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
                <?php if (gest_can_force_logout()): ?>
                    <button type="button" class="gest-btn gest-btn--danger gest-js-api" data-action="force_logout">Forçar logout</button>
                <?php endif; ?>
                <?php if (gest_can_reset_php_sessions()): ?>
                    <button type="button" class="gest-btn gest-btn--ghost gest-js-api" data-action="reset_sessions">Reset de sessões (moderador+)</button>
                <?php endif; ?>
            </section>

            <section class="gest-panel gest-panel--actions">
                <h2 class="gest-panel__title">Acções</h2>
                <div class="gest-btn-row">
                    <?php if (gest_can_silence_suspend_softdelete()): ?>
                        <button type="button" class="gest-btn gest-js-api" data-action="silence" data-prompt-days="1">Silenciar (dias)</button>
                        <button type="button" class="gest-btn gest-js-api" data-action="suspend" data-prompt-days="1">Suspender (dias)</button>
                        <button type="button" class="gest-btn gest-btn--danger gest-js-api" data-action="soft_delete">Soft delete</button>
                        <button type="button" class="gest-btn gest-js-api" data-action="recover">Recuperar conta</button>
                    <?php endif; ?>
                    <?php if (gest_can_hard_delete()): ?>
                        <button type="button" class="gest-btn gest-btn--danger gest-js-hard" id="gestHardBtn">Eliminar permanentemente</button>
                    <?php endif; ?>
                </div>
                <?php if (gest_can_hard_delete()): ?>
                    <div class="gest-hard-box" id="gestHardBox" hidden>
                        <p>Escreve exactamente: <strong>ELIMINAR PERMANENTEMENTE</strong></p>
                        <input type="text" id="gestHardPhrase" class="gest-input" autocomplete="off">
                        <button type="button" class="gest-btn gest-btn--danger gest-js-api" data-action="hard_delete" data-use-phrase="1">Confirmar eliminação</button>
                    </div>
                <?php endif; ?>
            </section>

            <p id="gestDetailMsg" class="gest-inline-msg" hidden></p>
            <input type="hidden" id="gestUid" value="<?php echo htmlspecialchars($uid, ENT_QUOTES, 'UTF-8'); ?>">
            <input type="hidden" id="gestCsrf" value="<?php echo htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8'); ?>">

<?php
gest_shell_foot(['assets/js/users.js']);
