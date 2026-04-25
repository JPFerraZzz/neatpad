<?php
/**
 * Helpers de segurança partilhados pela API.
 *
 *  - assertCsrfSafe()        — bloqueia métodos não-GET sem o header X-Requested-With
 *                              (mitigação CSRF "lite": só JS do mesmo origin envia este header
 *                              em CORS sem preflight; combinado com SameSite=Lax cobre os ataques
 *                              típicos via <form> ou <img> cross-origin).
 *  - rateLimit($key, $max, $windowSeconds)
 *                            — limita chamadas por chave (tipicamente por IP/endpoint).
 *  - clientIp()              — IP do cliente respeitando X-Forwarded-For (Railway/Apache reverse proxy).
 *  - sendSecureHeaders()     — headers de segurança ao nível PHP (defesa em profundidade junto ao .htaccess).
 *
 * Sem dependências externas. Funciona em PHP 8.0+.
 */

require_once __DIR__ . '/db.php';

function clientIp(): string {
    $fwd = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($fwd) {
        $first = trim(explode(',', $fwd)[0]);
        if ($first) return $first;
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function sendSecureHeaders(): void {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
}

/**
 * Mitigação CSRF para endpoints state-changing.
 *
 * Bloqueia POST/PUT/DELETE sem o header `X-Requested-With: XMLHttpRequest`.
 * Esse header NÃO pode ser definido por <form>, <img> ou outras formas
 * tradicionais de CSRF; só o pode definir JS, e em CORS implica preflight,
 * que falha com `Access-Control-Allow-Origin` restrito (ver setCorsHeaders()).
 *
 * Combinado com cookies SameSite=Lax, isto neutraliza CSRF clássico sem precisar
 * de um token sincronizado por sessão.
 */
function assertCsrfSafe(): void {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'GET' || $method === 'HEAD' || $method === 'OPTIONS') return;

    $xrw = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    if (strcasecmp($xrw, 'XMLHttpRequest') !== 0) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Pedido bloqueado (CSRF)', 'data' => null]);
        exit;
    }
}

/**
 * Rate limit simples baseado em DB (partilhado entre instâncias no Railway).
 * Permite até $max acessos numa janela de $windowSeconds para a chave dada.
 *
 * Devolve true se o pedido é permitido; envia 429 e termina caso contrário.
 *
 * Nota: usa a tabela `php_sessions` é apenas para os IDs de sessão. Para o limit
 * usamos uma tabela própria, criada on-demand. O custo é mínimo (uma INSERT + DELETE).
 */
function rateLimit(string $key, int $max = 60, int $windowSeconds = 60): bool {
    try {
        $pdo = getDB();
    } catch (Throwable $e) {
        // Se não há DB, não bloqueamos — o pior cenário é ficar sem rate limit.
        return true;
    }

    static $tableReady = false;
    if (!$tableReady) {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS rate_limits (
                bucket VARCHAR(190) NOT NULL,
                ts INT UNSIGNED NOT NULL,
                INDEX idx_bucket_ts (bucket, ts)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        $tableReady = true;
    }

    $now    = time();
    $cutoff = $now - $windowSeconds;

    $stmt = $pdo->prepare("DELETE FROM rate_limits WHERE bucket = ? AND ts < ?");
    $stmt->execute([$key, $cutoff]);

    $stmt = $pdo->prepare("SELECT COUNT(*) AS c FROM rate_limits WHERE bucket = ? AND ts >= ?");
    $stmt->execute([$key, $cutoff]);
    $count = (int) ($stmt->fetch()['c'] ?? 0);

    if ($count >= $max) {
        header('Content-Type: application/json; charset=utf-8');
        header('Retry-After: ' . $windowSeconds);
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error'   => 'Demasiados pedidos. Tenta novamente em alguns segundos.',
            'data'    => null,
        ]);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO rate_limits (bucket, ts) VALUES (?, ?)");
    $stmt->execute([$key, $now]);

    return true;
}
