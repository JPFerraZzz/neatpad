<?php
declare(strict_types=1);

$gest_active = 'users';
require_once __DIR__ . '/auth.php';
gest_require_nav('users');
require_once __DIR__ . '/inc/permissions.php';
require_once __DIR__ . '/inc/user_repo.php';
require_once __DIR__ . '/inc/shell.php';

$q = [
    'page'               => (int) ($_GET['page'] ?? 1),
    'per_page'           => 25,
    'search'             => (string) ($_GET['q'] ?? ''),
    'role'               => (string) ($_GET['role'] ?? ''),
    'status'             => (string) ($_GET['status'] ?? ''),
    'reg_from'           => (string) ($_GET['reg_from'] ?? ''),
    'reg_to'             => (string) ($_GET['reg_to'] ?? ''),
    'active_within_days' => (string) ($_GET['active_days'] ?? ''),
    'sort'               => (string) ($_GET['sort'] ?? 'reg_at'),
    'dir'                => (string) ($_GET['dir'] ?? 'desc'),
];

try {
    $pdo = gest_pdo();
} catch (Throwable $e) {
    error_log('[np-gest] users: ' . $e->getMessage());
    http_response_code(503);
    exit('Serviço indisponível.');
}

if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    if (!gest_can_export_activity_csv()) {
        http_response_code(403);
        exit('Acesso negado.');
    }
    [$rows] = gest_users_list($pdo, $q);
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="neatpad_utilizadores.csv"');
    echo "\xEF\xBB\xBF";
    $out = fopen('php://output', 'w');
    fputcsv($out, ['uid', 'email', 'nome', 'perfil_app', 'estado', 'registo', 'ultima_actividade', 'categorias', 'itens'], ';');
    foreach ($rows as $r) {
        fputcsv($out, [
            $r['uid'],
            $r['email'],
            $r['display_name'],
            $r['app_role'],
            $r['status'],
            $r['reg_at'] ?? '',
            $r['last_act'] ?? '',
            $r['cat_count'],
            $r['item_count'],
        ], ';');
    }
    fclose($out);
    exit;
}

[$rows, $total] = gest_users_list($pdo, $q);
$pages = max(1, (int) ceil($total / $q['per_page']));

function gest_sort_href(string $col): string
{
    $g      = $_GET;
    $cur    = (string) ($g['sort'] ?? 'reg_at');
    $curDir = strtolower((string) ($g['dir'] ?? 'desc')) === 'asc' ? 'asc' : 'desc';
    $nextDir = ($cur === $col && $curDir === 'desc') ? 'asc' : 'desc';
    if ($cur !== $col) {
        $nextDir = 'desc';
    }
    $g['sort'] = $col;
    $g['dir']  = $nextDir;
    unset($g['page']);
    return 'users.php?' . http_build_query($g);
}

gest_shell_head('Utilizadores');
$csrf = gest_csrf_token();
?>
            <div class="gest-page-head gest-page-head--row">
                <div>
                    <h1 class="gest-page-title">Utilizadores</h1>
                    <p class="gest-page-lead">Contas da app NeatPad (Firebase UID). Importa <code>np-gest/install_users.mysql</code> na BD se ainda não existirem as tabelas <code>np_gest_*</code>.</p>
                </div>
                <span id="gestLiveDot" class="gest-live-dot gest-live-dot--sub" aria-label="Actualização em tempo real">● Ao vivo</span>
            </div>

            <form class="gest-filters" method="get" action="users.php">
                <input type="hidden" name="sort" value="<?php echo htmlspecialchars($q['sort'], ENT_QUOTES, 'UTF-8'); ?>">
                <input type="hidden" name="dir" value="<?php echo htmlspecialchars($q['dir'], ENT_QUOTES, 'UTF-8'); ?>">
                <label class="gest-filters__field">
                    <span>Pesquisa</span>
                    <input type="search" name="q" value="<?php echo htmlspecialchars($q['search'], ENT_QUOTES, 'UTF-8'); ?>" placeholder="Nome, email ou UID">
                </label>
                <label class="gest-filters__field">
                    <span>Perfil app</span>
                    <select name="role">
                        <option value="">—</option>
                        <option value="user" <?php echo $q['role'] === 'user' ? 'selected' : ''; ?>>user</option>
                        <option value="vip" <?php echo $q['role'] === 'vip' ? 'selected' : ''; ?>>vip</option>
                        <option value="support" <?php echo $q['role'] === 'support' ? 'selected' : ''; ?>>support</option>
                    </select>
                </label>
                <label class="gest-filters__field">
                    <span>Estado</span>
                    <select name="status">
                        <option value="">—</option>
                        <?php foreach (['active', 'silenced', 'suspended', 'deleted'] as $st): ?>
                            <option value="<?php echo $st; ?>" <?php echo $q['status'] === $st ? 'selected' : ''; ?>><?php echo $st; ?></option>
                        <?php endforeach; ?>
                    </select>
                </label>
                <label class="gest-filters__field">
                    <span>Registo desde</span>
                    <input type="date" name="reg_from" value="<?php echo htmlspecialchars($q['reg_from'], ENT_QUOTES, 'UTF-8'); ?>">
                </label>
                <label class="gest-filters__field">
                    <span>Registo até</span>
                    <input type="date" name="reg_to" value="<?php echo htmlspecialchars($q['reg_to'], ENT_QUOTES, 'UTF-8'); ?>">
                </label>
                <label class="gest-filters__field">
                    <span>Actividade (últimos N dias)</span>
                    <input type="number" name="active_days" min="1" max="365" placeholder="ex.: 7" value="<?php echo htmlspecialchars($q['active_within_days'], ENT_QUOTES, 'UTF-8'); ?>">
                </label>
                <div class="gest-filters__actions">
                    <button type="submit" class="gest-btn gest-btn--primary">Filtrar</button>
                    <a class="gest-btn gest-btn--ghost" href="users.php">Limpar</a>
                    <?php
                    if (gest_can_export_activity_csv()) {
                        $gcsv       = $_GET;
                        $gcsv['export'] = 'csv';
                        unset($gcsv['page']);
                        $csvHref = 'users.php?' . http_build_query($gcsv);
                        echo '<a class="gest-btn gest-btn--ghost" href="' . htmlspecialchars($csvHref, ENT_QUOTES, 'UTF-8') . '">Exportar CSV</a>';
                    }
                    ?>
                </div>
            </form>

            <p class="gest-muted-line">Total: <?php echo (int) $total; ?> · Página <?php echo (int) $q['page']; ?> de <?php echo (int) $pages; ?></p>

            <div class="gest-table-wrap">
                <table class="gest-table" id="gestUsersTable">
                    <thead>
                        <tr>
                            <th></th>
                            <th><a href="<?php echo htmlspecialchars(gest_sort_href('display_name'), ENT_QUOTES, 'UTF-8'); ?>">Nome</a></th>
                            <th><a href="<?php echo htmlspecialchars(gest_sort_href('email'), ENT_QUOTES, 'UTF-8'); ?>">Email</a></th>
                            <th><a href="<?php echo htmlspecialchars(gest_sort_href('app_role'), ENT_QUOTES, 'UTF-8'); ?>">Perfil</a></th>
                            <th><a href="<?php echo htmlspecialchars(gest_sort_href('status'), ENT_QUOTES, 'UTF-8'); ?>">Estado</a></th>
                            <th><a href="<?php echo htmlspecialchars(gest_sort_href('last_act'), ENT_QUOTES, 'UTF-8'); ?>">Última act.</a></th>
                            <th><a href="<?php echo htmlspecialchars(gest_sort_href('reg_at'), ENT_QUOTES, 'UTF-8'); ?>">Registo</a></th>
                            <th><a href="<?php echo htmlspecialchars(gest_sort_href('item_count'), ENT_QUOTES, 'UTF-8'); ?>">Itens</a></th>
                            <th>Acções</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($rows as $r):
                            $initial = gest_avatar_letter((string) $r['display_name'], (string) $r['email']);
                            $uidu = rawurlencode((string) $r['uid']);
                            $uidRaw = (string) $r['uid'];
                            $st = (string) $r['status'];
                            $isOnline = !empty($r['last_seen'])
                                && $st === 'active'
                                && (strtotime((string) $r['last_seen']) >= time() - 300);
                            ?>
                            <tr data-gest-uid="<?php echo htmlspecialchars($uidRaw, ENT_QUOTES, 'UTF-8'); ?>">
                                <td class="gest-table__avatar"><span class="gest-avatar" title="<?php echo htmlspecialchars($uidRaw, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($initial, ENT_QUOTES, 'UTF-8'); ?></span></td>
                                <td class="gest-cell-name"><?php echo htmlspecialchars((string) $r['display_name'] ?: '—', ENT_QUOTES, 'UTF-8'); ?></td>
                                <td class="gest-table__mono gest-cell-email"><?php echo htmlspecialchars((string) $r['email'] ?: '—', ENT_QUOTES, 'UTF-8'); ?></td>
                                <td><span class="gest-tag gest-tag--role"><?php echo htmlspecialchars((string) $r['app_role'], ENT_QUOTES, 'UTF-8'); ?></span></td>
                                <td class="gest-cell-status"><span class="gest-tag gest-tag--<?php echo htmlspecialchars($st, ENT_QUOTES, 'UTF-8'); ?>"><?php echo htmlspecialchars($st, ENT_QUOTES, 'UTF-8'); ?></span></td>
                                <td class="gest-table__date gest-cell-lastact">
                                    <span class="gest-cell-lastact__time"><?php echo htmlspecialchars(substr((string) ($r['last_act'] ?? ''), 0, 16) ?: '—', ENT_QUOTES, 'UTF-8'); ?></span>
                                    <span class="gest-online-badge"<?php echo $isOnline ? '' : ' hidden'; ?>>● Online</span>
                                </td>
                                <td class="gest-table__date"><?php echo htmlspecialchars(substr((string) ($r['reg_at'] ?? ''), 0, 10) ?: '—', ENT_QUOTES, 'UTF-8'); ?></td>
                                <td><?php echo (int) $r['item_count']; ?></td>
                                <td class="gest-table__actions">
                                    <a class="gest-link" href="user-detail.php?uid=<?php echo $uidu; ?>">Perfil</a>
                                    <a class="gest-link" href="diagnostics.php?uid=<?php echo $uidu; ?>">Diagnóstico</a>
                                    <?php if (gest_can_silence_suspend_softdelete()): ?>
                                        <button type="button" class="gest-link gest-js-act" data-act="silence" data-uid="<?php echo htmlspecialchars((string) $r['uid'], ENT_QUOTES, 'UTF-8'); ?>">Silenciar</button>
                                        <button type="button" class="gest-link gest-js-act" data-act="suspend" data-uid="<?php echo htmlspecialchars((string) $r['uid'], ENT_QUOTES, 'UTF-8'); ?>">Suspender</button>
                                        <button type="button" class="gest-link gest-js-act gest-link--danger" data-act="soft_delete" data-uid="<?php echo htmlspecialchars((string) $r['uid'], ENT_QUOTES, 'UTF-8'); ?>">Soft delete</button>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        <?php if ($rows === []): ?>
                            <tr><td colspan="9" class="gest-table__empty">Sem resultados.</td></tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>

            <?php if ($pages > 1): ?>
                <nav class="gest-pagination" aria-label="Paginação">
                    <?php
                    $g = $_GET;
                    for ($p = 1; $p <= min($pages, 30); $p++):
                        $g['page'] = $p;
                        $href = 'users.php?' . http_build_query($g);
                        ?>
                        <a class="gest-page-link<?php echo $p === (int) $q['page'] ? ' gest-page-link--active' : ''; ?>" href="<?php echo htmlspecialchars($href, ENT_QUOTES, 'UTF-8'); ?>"><?php echo $p; ?></a>
                    <?php endfor; ?>
                    <?php if ($pages > 30): ?><span class="gest-muted">…</span><?php endif; ?>
                </nav>
            <?php endif; ?>

            <p id="gestUsersMsg" class="gest-inline-msg" hidden></p>
            <input type="hidden" id="gestCsrf" value="<?php echo htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8'); ?>">

<?php
gest_shell_foot(['assets/js/users.js']);
