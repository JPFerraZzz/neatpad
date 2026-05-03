<?php
declare(strict_types=1);
/** @var string $gest_active */
$u = gest_user();
$role = $u['role'] ?? '';
$nav = [
    'dashboard'    => ['label' => 'Dashboard',     'icon' => 'fa-chart-pie',      'href' => 'index.php'],
    'users'        => ['label' => 'Utilizadores',  'icon' => 'fa-users',          'href' => 'users.php'],
    'content'      => ['label' => 'Conteúdos',     'icon' => 'fa-folder-open',    'href' => '#'],
    'tickets'      => ['label' => 'Tickets',       'icon' => 'fa-ticket',         'href' => '#'],
    'stats'        => ['label' => 'Estatísticas',  'icon' => 'fa-chart-line',     'href' => '#'],
    'patch_notes'  => ['label' => 'Patch Notes',   'icon' => 'fa-scroll',         'href' => '#'],
    'diagnostics'  => ['label' => 'Diagnóstico',   'icon' => 'fa-stethoscope',    'href' => 'diagnostics.php'],
    'settings'     => ['label' => 'Definições',    'icon' => 'fa-sliders',        'href' => '#'],
];
?>
<aside class="gest-sidebar" aria-label="Navegação">
    <div class="gest-sidebar-inner">
        <nav class="gest-side-nav">
            <?php foreach ($nav as $key => $item):
                if (!gest_nav_visible($key)) {
                    continue;
                }
                $active = ($gest_active ?? '') === $key;
                $href = $item['href'];
                $isHash = $href === '#';
                ?>
                <a class="gest-side-link<?php echo $active ? ' gest-side-link--active' : ''; ?><?php echo $isHash ? ' gest-side-link--soon' : ''; ?>"
                   href="<?php echo htmlspecialchars($href, ENT_QUOTES, 'UTF-8'); ?>"
                   <?php echo $isHash ? 'aria-disabled="true"' : ''; ?>>
                    <i class="fas <?php echo htmlspecialchars($item['icon'], ENT_QUOTES, 'UTF-8'); ?>"></i>
                    <span><?php echo htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8'); ?></span>
                </a>
            <?php endforeach; ?>
        </nav>
    </div>
</aside>
