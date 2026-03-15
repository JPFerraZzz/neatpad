<?php
/**
 * FerrazNest — Migração automática
 */
require_once __DIR__ . '/db.php';

try {
    $db = getDB();

    $db->exec("ALTER TABLE items MODIFY COLUMN content LONGTEXT");

    $db->exec("
        CREATE TABLE IF NOT EXISTS note_versions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            item_id INT NOT NULL,
            content LONGTEXT NOT NULL,
            version INT NOT NULL DEFAULT 1,
            saved_by ENUM('manual', 'autosave') DEFAULT 'autosave',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
            INDEX idx_item_version (item_id, version DESC),
            INDEX idx_item_created (item_id, created_at DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    jsonResponse(true, [
        'message' => 'Migração concluída com sucesso!',
        'tables'  => [
            'items'         => 'content → LONGTEXT (verificado)',
            'note_versions' => 'criada/verificada',
        ],
    ]);

} catch (PDOException $e) {
    jsonResponse(false, null, 'Erro na migração: ' . $e->getMessage(), 500);
}
