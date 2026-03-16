-- ================================================
-- NeatPad — Setup BD para Railway
-- Executar no painel MySQL do Railway
-- (não inclui DROP/CREATE DATABASE — o Railway já cria)
-- ================================================

-- ── 1. Categorias ───────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_uid VARCHAR(128) NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'folder',
    color VARCHAR(7) NOT NULL DEFAULT '#3498db',
    template_type ENUM('simple','notes','tasks','course','excel','notebooks') NOT NULL DEFAULT 'simple',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_uid (user_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. Itens ────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT,
    status ENUM('pending','in_progress','completed','archived') NOT NULL DEFAULT 'pending',
    priority ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
    due_date DATE DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_category (category_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. Sub-tarefas ──────────────────────────────
CREATE TABLE IF NOT EXISTS subtasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    completed TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    INDEX idx_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. Sessões PHP (para Railway multi-instância) ─
CREATE TABLE IF NOT EXISTS php_sessions (
    id VARCHAR(128) PRIMARY KEY,
    data LONGTEXT NOT NULL,
    last_activity INT UNSIGNED NOT NULL,
    INDEX idx_last_activity (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 5. Historial de versões ─────────────────────
CREATE TABLE IF NOT EXISTS note_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    content LONGTEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    saved_by ENUM('manual','autosave') NOT NULL DEFAULT 'autosave',
    version_name VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    INDEX idx_item_version (item_id, version DESC),
    INDEX idx_item_created (item_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'NeatPad — tabelas criadas com sucesso!' AS resultado;
