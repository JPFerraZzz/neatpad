<?php
/**
 * NeatPad — Webhook GitHub para geração de patch notes via Ollama.
 *
 * Chamado pelo GitHub Actions após cada deploy bem-sucedido.
 * Valida X-Webhook-Secret, chama Ollama para gerar texto legível,
 * e guarda na tabela patch_notes.
 *
 * Secret: definir WEBHOOK_SECRET no ambiente (obrigatório em produção).
 */

require_once __DIR__ . '/db.php';

// Secret obrigatório em produção; em desenvolvimento permite fallback local inseguro.
$webhookSecret = getenv('WEBHOOK_SECRET');
if ($webhookSecret === false || $webhookSecret === '') {
    if (NEATPAD_IS_PRODUCTION) {
        error_log('[NeatPad webhook] WEBHOOK_SECRET em falta em produção');
        jsonResponse(false, null, 'Serviço indisponível', 503);
    }
    $webhookSecret = 'neatpad-dev-webhook-insecure';
}
define('WEBHOOK_SECRET', $webhookSecret);
define('OLLAMA_HOST',  getenv('OLLAMA_HOST')  ?: '172.17.0.1');
define('OLLAMA_PORT',  getenv('OLLAMA_PORT')  ?: '11434');
define('OLLAMA_MODEL', getenv('OLLAMA_MODEL') ?: 'qwen2.5:3b');

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

// ── Commits puramente internos: não geram patch note na BD ─────────────
$skipPrefixes = ['ci:', 'chore:', 'docs:', 'test:', 'build:', 'style:', 'wip:'];
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
if (preg_match('/^feat(\([^)]*\))?:/i', $message))       $type = 'feat';
elseif (preg_match('/^fix(\([^)]*\))?:/i', $message))   $type = 'fix';
elseif (preg_match('/^refactor(\([^)]*\))?:/i', $message)) $type = 'refactor';

// ── Geração do texto estruturado via Ollama ───────────────────────
//
// O modelo deve responder APENAS com JSON válido com os campos:
//   title     — título em português (≤ 80 chars)
//   summary   — parágrafo explicativo (1-3 frases)
//   changes   — array de strings com mudanças específicas (2-4 items)
//   impact    — frase sobre o impacto no utilizador

$prompt = <<<PROMPT
You are a release notes assistant for NeatPad, a web app for technical notes.
Your task: given a Git commit message, produce a structured patch note in European Portuguese.

Commit message: "{$message}"

IMPORTANT: Respond with ONLY a valid JSON object. No markdown, no code blocks, no backticks, no text before or after the JSON.

JSON schema (all fields required, all values in European Portuguese):
{
  "title": "Short descriptive title (max 80 chars, starts with an action verb like 'Corrigimos', 'Adicionámos', 'Melhorámos')",
  "summary": "One or two sentences explaining what was done and why, in plain language for end users",
  "changes": ["Specific change 1", "Specific change 2", "Specific change 3"],
  "impact": "One sentence about the benefit to the user"
}

Rules:
- Do NOT copy the commit message literally
- Do NOT mention the commit hash
- The title must NOT start with a prefix like 'feat:' or 'fix:'
- The changes array must have 2 to 4 items
- Write as if communicating to end users, not developers
- Use European Portuguese (Portugal), not Brazilian Portuguese
PROMPT;

// Valores estruturados — preenchidos pelo Ollama ou pelo fallback
$pnTitle   = null;
$pnSummary = null;
$pnChanges = null; // JSON string de array
$pnImpact  = null;
// generated_notes mantém compatibilidade com registos antigos e
// serve de representação textual completa para RSS/API simples
$generatedNotes = $message;
$ollamaOk = false;

$ollamaUrl     = 'http://' . OLLAMA_HOST . ':' . OLLAMA_PORT . '/api/generate';
$ollamaPayload = json_encode([
    'model'   => OLLAMA_MODEL,
    'prompt'  => $prompt,
    'stream'  => false,
    'options' => [
        'temperature' => 0.4,   // mais baixo = mais determinístico e fiel ao JSON
        'num_predict' => 400,
        'top_p'       => 0.85,
    ],
]);

if (function_exists('curl_init')) {
    $ch = curl_init($ollamaUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $ollamaPayload,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 120,
        CURLOPT_CONNECTTIMEOUT => 5,
    ]);
    $raw      = curl_exec($ch);
    $curlErr  = curl_error($ch);
    $curlCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw && empty($curlErr) && $curlCode === 200) {
        $ollamaResp = json_decode($raw, true);
        $rawText    = trim($ollamaResp['response'] ?? '');

        // Remove eventuais code fences que o modelo gere (```json ... ```)
        $rawText = preg_replace('/^```(?:json)?\s*/i', '', $rawText);
        $rawText = preg_replace('/\s*```\s*$/', '', $rawText);
        $rawText = trim($rawText);

        $parsed = json_decode(trim($rawText), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            if (preg_match('/\{[\s\S]*\}/', $rawText, $m)) {
                $rawText = trim($m[0]);
                $parsed  = json_decode($rawText, true);
            }
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log('[NeatPad webhook] JSON decode Ollama falhou: ' . json_last_error_msg() . ' | texto: ' . mb_substr(trim($ollamaResp['response'] ?? ''), 0, 500));
                $parsed = null;
            }
        }

        if (
            is_array($parsed) &&
            !empty($parsed['title']) &&
            !empty($parsed['summary']) &&
            !empty($parsed['impact'])
        ) {
            $pnTitle   = mb_substr(trim(strip_tags($parsed['title'])), 0, 500);
            $pnSummary = mb_substr(trim(strip_tags($parsed['summary'])), 0, 2000);
            $pnImpact  = mb_substr(trim(strip_tags($parsed['impact'])), 0, 1000);

            // Normaliza o array de changes
            $rawChanges = $parsed['changes'] ?? [];
            if (is_array($rawChanges) && count($rawChanges) > 0) {
                $cleanChanges = array_values(array_filter(
                    array_map(fn($c) => mb_substr(trim(strip_tags((string)$c)), 0, 300), $rawChanges),
                    fn($c) => strlen($c) > 3
                ));
                $pnChanges = json_encode($cleanChanges, JSON_UNESCAPED_UNICODE);
            }

            // generated_notes = texto completo para compatibilidade/RSS
            $generatedNotes = $pnTitle . "\n\n" . $pnSummary;
            if ($pnChanges) {
                $list = json_decode($pnChanges, true);
                $generatedNotes .= "\n\n" . implode("\n", array_map(fn($c) => "• {$c}", $list));
            }
            $generatedNotes .= "\n\n" . $pnImpact;

            $ollamaOk = true;
        } else {
            error_log('[NeatPad webhook] JSON parse falhou. Resposta: ' . mb_substr($rawText, 0, 300));
        }
    } else {
        error_log('[NeatPad webhook] Ollama error: ' . $curlErr . ' | code: ' . $curlCode);
    }
} else {
    error_log('[NeatPad webhook] cURL não disponível');
}

// ── Persiste na base de dados ─────────────────────────────────────
try {
    $db = getDB();

    // Evita duplicados: se o commit já existe, actualiza em vez de inserir
    $chk = $db->prepare('SELECT id FROM patch_notes WHERE commit_hash = ?');
    $chk->execute([$hash]);
    $existingId = $chk->fetchColumn();

    // Colunas novas podem não existir em instâncias antigas — usamos um bloco
    // de INSERT/UPDATE dinâmico que só inclui as colunas que existem.
    $colCheck = $db->query("SHOW COLUMNS FROM patch_notes")->fetchAll(PDO::FETCH_COLUMN);
    $hasTitle   = in_array('title',        $colCheck, true);
    $hasSummary = in_array('summary',      $colCheck, true);
    $hasChanges = in_array('changes_list', $colCheck, true);
    $hasImpact  = in_array('impact',       $colCheck, true);

    if ($existingId) {
        $setParts = [
            'commit_message = :msg',
            'generated_notes = :notes',
            'type = :type',
        ];
        $params = [
            ':msg'   => $message,
            ':notes' => $generatedNotes,
            ':type'  => $type,
            ':id'    => $existingId,
        ];
        if ($hasTitle)   { $setParts[] = 'title = :title';              $params[':title']   = $pnTitle;   }
        if ($hasSummary) { $setParts[] = 'summary = :summary';          $params[':summary'] = $pnSummary; }
        if ($hasChanges) { $setParts[] = 'changes_list = :changes';     $params[':changes'] = $pnChanges; }
        if ($hasImpact)  { $setParts[] = 'impact = :impact';            $params[':impact']  = $pnImpact;  }

        $db->prepare('UPDATE patch_notes SET ' . implode(', ', $setParts) . ' WHERE id = :id')
           ->execute($params);
        $id = (int)$existingId;
    } else {
        $cols   = ['commit_hash', 'commit_message', 'generated_notes', 'type'];
        $phold  = [':hash', ':msg', ':notes', ':type'];
        $params = [
            ':hash'  => $hash,
            ':msg'   => $message,
            ':notes' => $generatedNotes,
            ':type'  => $type,
        ];
        if ($hasTitle)   { $cols[] = 'title';        $phold[] = ':title';   $params[':title']   = $pnTitle;   }
        if ($hasSummary) { $cols[] = 'summary';      $phold[] = ':summary'; $params[':summary'] = $pnSummary; }
        if ($hasChanges) { $cols[] = 'changes_list'; $phold[] = ':changes'; $params[':changes'] = $pnChanges; }
        if ($hasImpact)  { $cols[] = 'impact';       $phold[] = ':impact';  $params[':impact']  = $pnImpact;  }

        $db->prepare(
            'INSERT INTO patch_notes (' . implode(', ', $cols) . ') VALUES (' . implode(', ', $phold) . ')'
        )->execute($params);
        $id = (int)$db->lastInsertId();
    }

    jsonResponse(true, [
        'id'        => $id,
        'type'      => $type,
        'title'     => $pnTitle,
        'summary'   => $pnSummary,
        'changes'   => $pnChanges ? json_decode($pnChanges, true) : null,
        'impact'    => $pnImpact,
        'generated' => $generatedNotes,
        'ollama_ok' => $ollamaOk,
    ]);

} catch (PDOException $e) {
    error_log('[NeatPad webhook] DB error: ' . $e->getMessage());
    jsonResponse(false, null, 'Erro ao guardar patch note', 500);
}
