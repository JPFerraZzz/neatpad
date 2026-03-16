-- Executar no MySQL do Railway se a tabela note_versions já existir sem a coluna version_name.
-- Permite dar um nome às versões guardadas manualmente.

ALTER TABLE note_versions ADD COLUMN version_name VARCHAR(255) DEFAULT NULL AFTER saved_by;
