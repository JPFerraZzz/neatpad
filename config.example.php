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

// ── Modo de execução ─────────────────────────────────────────
// Em produção: NEATPAD_ENV=production no servidor.
// jsonResponse() em api/db.php passa a esconder mensagens internas em 5xx.
// display_errors fica desligado e os erros vão para o error_log do Apache/PHP.
$isProd = getenv('NEATPAD_ENV') === 'production';

error_reporting($isProd ? (E_ALL & ~E_DEPRECATED & ~E_NOTICE) : E_ALL);
ini_set('display_errors', $isProd ? '0' : '1');
ini_set('display_startup_errors', $isProd ? '0' : '1');
ini_set('log_errors', '1');

// ── CORS ─────────────────────────────────────────────────────
// Define ALLOWED_ORIGINS (separado por vírgulas) com os domínios autorizados,
// p.ex. ALLOWED_ORIGINS=https://neatpad.duckdns.org,https://neatpad.app
// O host atual é sempre aceite implicitamente (mesma origem).

// ── Sessão ───────────────────────────────────────────────────
// Define SESSION_MAX_LIFETIME em segundos (default 7 dias).

// Credenciais de BD — alternativa a variáveis de ambiente (ver api/db.php)
// Descomenta e preenche se NÃO quiseres usar variáveis de ambiente:
//
// putenv('DB_HOST=localhost');
// putenv('DB_USER=neatpad_user');
// putenv('DB_PASS=a_tua_password');
// putenv('DB_NAME=neatpad');
