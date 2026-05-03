<?php
/**
 * NeatPad Studio — configuração (exemplo).
 * Copiar para config.php no servidor e preencher valores.
 * Não commitar config.php.
 *
 * Alternativa (Docker / segredos): definir NP_GEST_CONFIG_PATH com caminho absoluto
 * para um ficheiro PHP que devolve o mesmo array (legível pelo www-data).
 *
 * Diagnóstico no servidor: php np-gest/check_setup.php
 */
declare(strict_types=1);

return [
    'db' => [
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'port' => (int) (getenv('DB_PORT') ?: '3306'),
        'name' => getenv('DB_NAME') ?: 'neatpad',
        'user' => getenv('DB_USER') ?: 'organizer',
        'pass' => getenv('DB_PASS') ?: '',
    ],
    'session' => [
        'name'     => 'np_gest_sid',
        'path'     => '/np-gest',
        'lifetime' => 0,
        'idle_seconds' => 1800,
    ],
    'app' => [
        'base_url_path' => '/np-gest',
        'production'    => getenv('NEATPAD_ENV') === 'production',
    ],
];
