<?php
/**
 * Sanitizador HTML whitelist (sem dependências externas).
 *
 * Pensado para o conteúdo rich-text dos cadernos:
 *  - Permite as tags do editor (negrito, listas, citações, código, etc.)
 *  - Bloqueia elementos perigosos (<script>, <iframe>, <object>, etc.)
 *  - Bloqueia atributos perigosos (on*=) e URIs javascript:/data: em href.
 *  - Mantém apenas atributos seguros nos elementos permitidos.
 *
 * Nota: usa o DOMDocument do PHP. Em PHP 8.0+ isto está incluído por defeito.
 * Em ambientes muito mínimos (sem ext-dom) cai para um regex de fallback que
 * apenas remove <script> e on*= attributes.
 */

const NEATPAD_ALLOWED_TAGS = [
    'p', 'br', 'hr',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'span', 'div',
    'mark',
    'a',
    'sub', 'sup',
    // tabelas básicas (caso o utilizador cole de outro sítio)
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    // <font> é gerado pelo execCommand('foreColor') em Safari/Firefox —
    // o walker converte-o em <span style="color:…"> antes de filtrar.
    'font',
];

const NEATPAD_ALLOWED_ATTRS = [
    // Atributos genéricos seguros em qualquer tag.
    //
    // contenteditable / data-placeholder são necessários para os blocos
    // ricos do editor (callouts, tabelas, templates). Não executam JS,
    // logo não acrescentam superfície de XSS — apenas controlam edição.
    '*'    => ['style', 'class', 'data-color', 'data-checked', 'contenteditable', 'data-placeholder', 'data-variant'],
    'a'    => ['href', 'target', 'rel'],
    'span' => ['style', 'class'],
    'td'   => ['colspan', 'rowspan'],
    'th'   => ['colspan', 'rowspan'],
    // <font> atributos aceites antes da conversão para <span>
    'font' => ['color', 'size', 'face'],
];

/**
 * Sanitiza CSS inline mantendo apenas regras seguras (cor, background, fonte, alinhamento).
 */
function neatpad_sanitize_css(string $css): string {
    $allowedProps = [
        'color', 'background-color', 'background',
        'font-weight', 'font-style', 'font-family', 'font-size',
        'text-decoration', 'text-align',
    ];
    $out = [];
    foreach (explode(';', $css) as $rule) {
        if (strpos($rule, ':') === false) continue;
        [$prop, $val] = array_map('trim', explode(':', $rule, 2));
        $prop = strtolower($prop);
        if (!in_array($prop, $allowedProps, true)) continue;
        // bloqueia url(), expression(), etc. — só caracteres "normais"
        if (preg_match('/url\s*\(|expression\s*\(|javascript:|<|>/i', $val)) continue;
        $out[] = $prop . ': ' . $val;
    }
    return implode('; ', $out);
}

/**
 * Sanitiza um valor de href: aceita apenas http(s), mailto: ou âncoras (#…).
 */
function neatpad_sanitize_href(string $href): ?string {
    $href = trim($href);
    if ($href === '') return null;
    if (preg_match('/^(https?:|mailto:|#)/i', $href)) return $href;
    return null;
}

function neatpad_sanitize_html(?string $dirty): string {
    if ($dirty === null || $dirty === '') return '';

    if (!class_exists('DOMDocument')) {
        // Fallback mínimo: remove <script>, <iframe>, <object> e atributos on*=
        $clean = preg_replace('#<\s*(script|iframe|object|embed|link|meta|style)\b[^>]*>.*?<\s*/\s*\1\s*>#is', '', $dirty);
        $clean = preg_replace('#<\s*(script|iframe|object|embed|link|meta|style)\b[^>]*/?\s*>#is', '', $clean);
        $clean = preg_replace('#\s+on[a-z]+\s*=\s*"[^"]*"#i', '', $clean);
        $clean = preg_replace("#\\s+on[a-z]+\\s*=\\s*'[^']*'#i", '', $clean);
        $clean = preg_replace('#\s+on[a-z]+\s*=\s*[^\s>]+#i', '', $clean);
        $clean = preg_replace('#javascript:#i', '', $clean);
        return $clean ?? '';
    }

    libxml_use_internal_errors(true);
    $doc = new DOMDocument('1.0', 'UTF-8');
    // Wrap para apanhar fragmentos. O meta força UTF-8.
    $wrapped = '<?xml encoding="UTF-8"><div id="__nbroot">' . $dirty . '</div>';
    $doc->loadHTML($wrapped, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET);
    libxml_clear_errors();

    $root = $doc->getElementById('__nbroot');
    if (!$root) {
        $divs = $doc->getElementsByTagName('div');
        foreach ($divs as $d) {
            if ($d->getAttribute('id') === '__nbroot') { $root = $d; break; }
        }
    }
    if (!$root) return '';

    neatpad_walk_and_sanitize($root, $doc);

    $html = '';
    foreach ($root->childNodes as $child) {
        $html .= $doc->saveHTML($child);
    }
    return trim($html);
}

function neatpad_walk_and_sanitize(DOMNode $node, DOMDocument $doc): void {
    // Visita em snapshot (clone da lista) porque vamos remover/substituir nós em iteração.
    $children = [];
    foreach ($node->childNodes as $c) $children[] = $c;

    foreach ($children as $child) {
        if ($child->nodeType === XML_TEXT_NODE) continue;

        if ($child->nodeType === XML_ELEMENT_NODE) {
            $tag = strtolower($child->nodeName);

            // Converte <font color="…"> em <span style="color:…"> para
            // preservar a cor aplicada pelo execCommand('foreColor') em
            // Safari/Firefox, que gera <font> em vez de <span style>.
            if ($tag === 'font') {
                $span = $doc->createElement('span');
                $inlineStyle = [];
                if ($child->hasAttribute('color')) {
                    $c = preg_replace('/[^a-zA-Z0-9#(),. %]/', '', $child->getAttribute('color'));
                    if ($c) $inlineStyle[] = 'color: ' . $c;
                }
                if ($inlineStyle) {
                    $span->setAttribute('style', implode('; ', $inlineStyle));
                }
                // Move todos os filhos
                while ($child->firstChild) {
                    $span->appendChild($child->firstChild);
                }
                $child->parentNode->replaceChild($span, $child);
                // Continua a processar o <span> recém-criado
                neatpad_walk_and_sanitize($span, $doc);
                continue;
            }

            if (!in_array($tag, NEATPAD_ALLOWED_TAGS, true)) {
                // Move filhos para fora e remove o nó
                while ($child->firstChild) {
                    $child->parentNode->insertBefore($child->firstChild, $child);
                }
                $child->parentNode->removeChild($child);
                continue;
            }

            // Sanitizar atributos
            $allowedForTag = array_merge(
                NEATPAD_ALLOWED_ATTRS['*'] ?? [],
                NEATPAD_ALLOWED_ATTRS[$tag] ?? []
            );
            $attrsToRemove = [];
            foreach ($child->attributes as $attr) {
                $name = strtolower($attr->nodeName);
                $val  = $attr->nodeValue;
                if (!in_array($name, $allowedForTag, true) || str_starts_with($name, 'on')) {
                    $attrsToRemove[] = $attr->nodeName;
                    continue;
                }
                if ($name === 'style') {
                    $clean = neatpad_sanitize_css($val);
                    if ($clean === '') $attrsToRemove[] = $attr->nodeName;
                    else $child->setAttribute('style', $clean);
                    continue;
                }
                if ($name === 'contenteditable') {
                    // Só aceitamos valores literais "true"/"false" — evita
                    // confusão com outros atributos via parsing.
                    $v = strtolower(trim($val));
                    if ($v !== 'true' && $v !== 'false') {
                        $attrsToRemove[] = $attr->nodeName;
                    } else {
                        $child->setAttribute('contenteditable', $v);
                    }
                    continue;
                }
                if ($name === 'data-placeholder' || $name === 'data-variant') {
                    // Apenas texto curto — sem HTML.
                    $clean = preg_replace('/[<>]/', '', (string)$val);
                    $child->setAttribute($name, mb_substr($clean, 0, 80));
                    continue;
                }
                if ($name === 'href') {
                    $clean = neatpad_sanitize_href($val);
                    if ($clean === null) {
                        $attrsToRemove[] = $attr->nodeName;
                    } else {
                        $child->setAttribute('href', $clean);
                        // Forçar atributos seguros em links externos
                        $child->setAttribute('rel', 'noopener noreferrer nofollow');
                        if (preg_match('/^https?:/i', $clean)) {
                            $child->setAttribute('target', '_blank');
                        }
                    }
                    continue;
                }
            }
            foreach ($attrsToRemove as $name) {
                $child->removeAttribute($name);
            }

            neatpad_walk_and_sanitize($child, $doc);
        } else {
            // Comentários e outros — fora
            $child->parentNode->removeChild($child);
        }
    }
}
