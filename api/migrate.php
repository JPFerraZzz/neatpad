<?php
/**
 * NeatPad — Migração automática + limpeza de registos órfãos
 *
 * Acesso restrito: requer sessão autenticada.
 */
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/db.php';

requireAuth(); // Apenas utilizadores autenticados

try {
    $db = getDB();
    $report = [];

    // ── 1. Garantir coluna LONGTEXT em items.content ───────────────────────
    $db->exec("ALTER TABLE items MODIFY COLUMN content LONGTEXT");
    $report['items.content'] = 'LONGTEXT verificado';

    // ── 2. Garantir coluna version_name em note_versions ──────────────────
    $cols = $db->query("SHOW COLUMNS FROM note_versions LIKE 'version_name'")->fetchAll();
    if (empty($cols)) {
        $db->exec("ALTER TABLE note_versions ADD COLUMN version_name VARCHAR(255) DEFAULT NULL");
        $report['note_versions.version_name'] = 'coluna adicionada';
    } else {
        $report['note_versions.version_name'] = 'já existe';
    }

    // ── 3. Criar note_versions se não existir (com FK + CASCADE) ──────────
    $db->exec("
        CREATE TABLE IF NOT EXISTS note_versions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            item_id INT NOT NULL,
            content LONGTEXT NOT NULL,
            version INT NOT NULL DEFAULT 1,
            saved_by ENUM('manual', 'autosave') DEFAULT 'autosave',
            version_name VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
            INDEX idx_item_version (item_id, version DESC),
            INDEX idx_item_created (item_id, created_at DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $report['note_versions'] = 'criada/verificada';

    // ── 4. Limpeza de registos órfãos ─────────────────────────────────────
    // note_versions sem item correspondente (FK pode não ter estado activa)
    $stmt = $db->exec("
        DELETE nv FROM note_versions nv
        LEFT JOIN items i ON nv.item_id = i.id
        WHERE i.id IS NULL
    ");
    $report['orphan_versions_deleted'] = (int)$stmt;

    // subtasks sem item correspondente
    $stmt = $db->exec("
        DELETE s FROM subtasks s
        LEFT JOIN items i ON s.item_id = i.id
        WHERE i.id IS NULL
    ");
    $report['orphan_subtasks_deleted'] = (int)$stmt;

    // items sem categoria correspondente
    $stmt = $db->exec("
        DELETE it FROM items it
        LEFT JOIN categories c ON it.category_id = c.id
        WHERE c.id IS NULL
    ");
    $report['orphan_items_deleted'] = (int)$stmt;

    // ── 5. Verificar CASCADE nas FKs (informativo) ────────────────────────
    $fkCheck = $db->query("
        SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, DELETE_RULE
        FROM information_schema.REFERENTIAL_CONSTRAINTS rc
        JOIN information_schema.KEY_COLUMN_USAGE kcu
          ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
         AND rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
        WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME IN ('items','subtasks','note_versions')
    ")->fetchAll(PDO::FETCH_ASSOC);
    $report['foreign_keys'] = $fkCheck;

    jsonResponse(true, [
        'message' => 'Migração e limpeza concluídas com sucesso!',
        'details' => $report,
    ]);

} catch (PDOException $e) {
    jsonResponse(false, null, 'Erro na migração: ' . $e->getMessage(), 500);
}
