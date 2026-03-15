<?php
/**
 * Verificação de Firebase ID Tokens via chaves públicas do Google.
 * Implementação sem dependências externas — usa openssl nativo do PHP.
 */

function base64url_decode(string $data): string {
    $padded = str_pad(strtr($data, '-_', '+/'), strlen($data) + (4 - strlen($data) % 4) % 4, '=');
    return base64_decode($padded);
}

function verifyFirebaseToken(string $idToken, string $projectId): ?array {
    $parts = explode('.', $idToken);
    if (count($parts) !== 3) return null;

    [$headerB64, $payloadB64, $signatureB64] = $parts;

    $header  = json_decode(base64url_decode($headerB64), true);
    $payload = json_decode(base64url_decode($payloadB64), true);

    if (!$header || !$payload) return null;

    $now = time();

    if (($payload['exp'] ?? 0) <= $now)                                                return null;
    if (($payload['iat'] ?? PHP_INT_MAX) > $now + 300)                                 return null;
    if (($payload['aud'] ?? '') !== $projectId)                                         return null;
    if (($payload['iss'] ?? '') !== "https://securetoken.google.com/{$projectId}")     return null;
    if (empty($payload['sub']))                                                          return null;

    // Chaves públicas do Google — cache de 1 hora em /tmp
    $cacheFile = sys_get_temp_dir() . '/ferraz_firebase_keys.json';
    $keys = null;

    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 3500) {
        $keys = json_decode(file_get_contents($cacheFile), true);
    }

    if (!$keys) {
        $raw = @file_get_contents(
            'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
        );
        if (!$raw) return null;
        $keys = json_decode($raw, true);
        @file_put_contents($cacheFile, $raw);
    }

    $kid = $header['kid'] ?? '';
    if (!isset($keys[$kid])) return null;

    $message   = $headerB64 . '.' . $payloadB64;
    $signature = base64url_decode($signatureB64);
    $pubKey    = openssl_pkey_get_public($keys[$kid]);

    if (!$pubKey) return null;

    $valid = openssl_verify($message, $signature, $pubKey, OPENSSL_ALGO_SHA256);

    return $valid === 1 ? $payload : null;
}
