<?php
/**
 * Diagnóstico do NeatPad Studio — usar apenas em CLI no servidor.
 *
 *   cd /caminho/do/repositório
 *   php np-gest/check_setup.php
 */
declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(404);
    exit;
}

$dir = __DIR__;
$primary = $dir . '/config.php';
$fromEnv = trim((string) (getenv('NP_GEST_CONFIG_PATH') ?: ''));

echo "np-gest dir: {$dir}\n";
echo "NP_GEST_CONFIG_PATH: " . ($fromEnv !== '' ? $fromEnv : '(não definido)') . "\n";
echo "config.php (nesta pasta) existe: " . (file_exists($primary) ? 'sim' : 'não') . "\n";
echo "config.php legível: " . (is_readable($primary) ? 'sim' : 'não') . "\n";

if ($fromEnv !== '') {
    echo "ficheiro do env existe: " . (file_exists($fromEnv) ? 'sim' : 'não') . "\n";
    echo "ficheiro do env legível: " . (is_readable($fromEnv) ? 'sim' : 'não') . "\n";
}

$candidates = [];
if ($fromEnv !== '') {
    $candidates[] = $fromEnv;
}
$candidates[] = $primary;

$resolved = null;
foreach ($candidates as $p) {
    if (is_readable($p)) {
        $resolved = $p;
        break;
    }
}

if ($resolved === null) {
    echo "\n→ Cria o ficheiro: cp np-gest/config.example.php np-gest/config.php\n";
    echo "→ Ajusta credenciais BD e confirma que o utilizador do PHP (ex.: www-data) consegue ler o ficheiro.\n";
    exit(1);
}

echo "config usado: {$resolved}\n";

/** @var array $cfg */
$cfg = require $resolved;
if (!is_array($cfg) || !isset($cfg['db'])) {
    echo "ERRO: config não devolve array com chave 'db'.\n";
    exit(1);
}

$db = $cfg['db'];
$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
    $db['host'],
    $db['port'],
    $db['name']
);

try {
    $pdo = new PDO($dsn, $db['user'], $db['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    $pdo->query('SELECT 1');
    echo "ligação MySQL: OK\n";
} catch (Throwable $e) {
    echo "ligação MySQL: FALHOU — " . $e->getMessage() . "\n";
    echo "(host/porta/nome da BD e rede Docker são os mais comuns)\n";
    exit(1);
}

echo "\nTudo OK para o auth.php carregar. Se o browser ainda falhar, o PHP do Apache pode ser outro utilizador ou outro open_basedir.\n";
