<?php
/**
 * NeatPad — Webhook GitHub para geração de patch notes via Ollama.
 *
 * Chamado pelo GitHub Actions após cada deploy bem-sucedido.
 * Valida X-Webhook-Secret, chama Ollama para gerar texto legível,
 * e guarda na tabela patch_notes.
 *
 * Secret: definir WEBHOOK_SECRET no ambiente Docker ou alterar a constante abaixo.
 */

define('WEBHOOK_SECRET', getenv('WEBHOOK_SECRET') ?: 'neatpad-webhook-secret-change-me');
define('OLLAMA_HOST',    getenv('OLLAMA_HOST')    ?: '172.17.0.1');
define('OLLAMA_PORT',    getenv('OLLAMA_PORT')    ?: '11434');
define('OLLAMA_MODEL',   getenv('OLLAMA_MODEL')   ?: 'qwen2.5:3b');

require_once __DIR__ . '/db.php';

// ── Apenas POST ───────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, null, 'Método não suportado', 405);
}

// ── Validação do secret ───────────────────────────────────────────
$receivedSecret = $_SERVER['HTTP_X_WEBHOOK_SECRET'] ?? '';
if (empty($receivedSecret) || !hash_equals(WEBHOOK_SECRET, $receivedSecret)) {
    // Log sem revelar detalhes ao chamador
    error_log('[NeatPad webhook] Secret inválido — IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    jsonResponse(false, null, 'Não autorizado', 401);
}

// ── Leitura e validação do payload ───────────────────────────────
$input = getInput();
if (empty($input['commit_hash']) || empty($input['commit_message'])) {
    jsonResponse(false, null, 'commit_hash e commit_message são obrigatórios', 400);
}

// Sanitizar: hash só hexadecimal (40 chars), mensagem truncada e sem tags
$hash    = substr(preg_replace('/[^a-f0-9]/i', '', $input['commit_hash']), 0, 40);
$message = substr(strip_tags(trim($input['commit_message'])), 0, 500);

if (strlen($hash) < 7) {
    jsonResponse(false, null, 'commit_hash inválido', 400);
}

// ── Detecção do tipo (conventional commits) ───────────────────────
$skipPrefixes = ['ci:', 'chore:', 'docs:', 'test:', 'build:', 'refactor:', 'style:', 'wip:'];
foreach ($skipPrefixes as $prefix) {
    if (stripos($message, $prefix) === 0) {
        jsonResponse(true, [
            'id'        => null,
            'type'      => 'skipped',
            'generated' => null,
            'ollama_ok' => false,
            'reason'    => 'Commit interno — ignorado',
        ]);
    }
}

$type = 'other';
if (preg_match('/^feat(\([^)]*\))?:/i', $message))   $type = 'feat';
elseif (preg_match('/^fix(\([^)]*\))?:/i', $message)) $type = 'fix';

// ── Geração do texto via Ollama ───────────────────────────────────
$prompt = <<<PROMPT
És um assistente de release notes para o NeatPad, uma aplicação web de notas técnicas para programadores.
Com base na seguinte mensagem de commit Git, gera um patch note profissional, conciso e em português europeu.

Mensagem do commit: "{$message}"

Regras obrigatórias:
- Responde APENAS com o texto do patch note, sem prefixos, sem listas, sem markdown
- Máximo 3 frases curtas
- Tom profissional mas acessível ao utilizador final (não técnico)
- Começa com um verbo no passado (ex: "Adicionámos", "Corrigimos", "Melhorámos", "Actualizámos")
- Não repitas a mensagem literal do commit
- Não menciones o hash do commit
- Não uses asteriscos, hífens ou outros marcadores
PROMPT;

$generatedNotes = $message; // fallback: se Ollama falhar, usa a mensagem original

$ollamaUrl     = 'http://' . OLLAMA_HOST . ':' . OLLAMA_PORT . '/api/generate';
$ollamaPayload = json_encode([
    'model'   => OLLAMA_MODEL,
    'prompt'  => $prompt,
    'stream'  => false,
    'options' => [
        'temperature' => 0.65,
        'num_predict' => 220,
        'top_p'       => 0.9,
    ],
]);

if (function_exists('curl_init')) {
    $ch = curl_init($ollamaUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $ollamaPayload,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 90,
        CURLOPT_CONNECTTIMEOUT => 5,
    ]);
    $raw     = curl_exec($ch);
    $curlErr = curl_error($ch);
    $curlCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw && empty($curlErr) && $curlCode === 200) {
        $resp = json_decode($raw, true);
        if (!empty($resp['response'])) {
            $generated = trim($resp['response']);
            // Remove markdown residual que o modelo possa ter gerado
            $generated = preg_replace('/[*_`#~>]+/', '', $generated);
            $generated = preg_replace('/\n{3,}/', "\n\n", trim($generated));
            if (strlen($generated) > 10) {
                $generatedNotes = $generated;
            }
        }
    } else {
        error_log('[NeatPad webhook] Ollama error: ' . $curlErr . ' | code: ' . $curlCode);
    }
} else {
    error_log('[NeatPad webhook] cURL não disponível — a usar mensagem original como fallback');
}

// ── Persiste na base de dados ─────────────────────────────────────
try {
    $db = getDB();

    // Evita duplicados: se o commit já existe, actualiza em vez de inserir
    $chk = $db->prepare('SELECT id FROM patch_notes WHERE commit_hash = ?');
    $chk->execute([$hash]);
    $existingId = $chk->fetchColumn();

    if ($existingId) {
        $db->prepare(
            'UPDATE patch_notes SET commit_message = ?, generated_notes = ?, type = ? WHERE id = ?'
        )->execute([$message, $generatedNotes, $type, $existingId]);
        $id = (int)$existingId;
    } else {
        $db->prepare(
            'INSERT INTO patch_notes (commit_hash, commit_message, generated_notes, type) VALUES (?, ?, ?, ?)'
        )->execute([$hash, $message, $generatedNotes, $type]);
        $id = (int)$db->lastInsertId();
    }

    jsonResponse(true, [
        'id'        => $id,
        'type'      => $type,
        'generated' => $generatedNotes,
        'ollama_ok' => ($generatedNotes !== $message),
    ]);

} catch (PDOException $e) {
    error_log('[NeatPad webhook] DB error: ' . $e->getMessage());
    jsonResponse(false, null, 'Erro ao guardar patch note', 500);
}
