<?php
/**
 * NeatPad — Configuração global (MODELO)
 *
 * Como usar:
 *   cp config.example.php config.php
 *   # Depois edita config.php com os teus valores reais.
 *
 * O ficheiro real `config.php` está no .gitignore e NUNCA deve ser commitado.
 * No servidor em produção é criado à mão; o CI/CD nunca lhe toca.
 */

// Firebase — project ID do teu projeto no Firebase Console
define('FIREBASE_PROJECT_ID', getenv('FIREBASE_PROJECT_ID') ?: 'your-firebase-project-id');

// Timezone
define('TIMEZONE', 'Europe/Lisbon');
date_default_timezone_set(TIMEZONE);

// Erros (desativar em produção)
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Credenciais de BD — alternativa a variáveis de ambiente (ver api/db.php)
// Descomenta e preenche se NÃO quiseres usar variáveis de ambiente:
//
// putenv('DB_HOST=localhost');
// putenv('DB_USER=neatpad_user');
// putenv('DB_PASS=a_tua_password');
// putenv('DB_NAME=neatpad');
