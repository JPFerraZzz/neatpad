<?php
/**
 * NeatPad — Configuração global
 */

// Firebase
define('FIREBASE_PROJECT_ID', getenv('FIREBASE_PROJECT_ID') ?: 'ferraznest-54e93');

// Timezone
define('TIMEZONE', 'Europe/Lisbon');
date_default_timezone_set(TIMEZONE);

// Erros (desativar em produção)
error_reporting(E_ALL);
ini_set('display_errors', 0);
