#!/bin/bash
# ================================================
# NeatPad — Setup Linux com LAMP
# ================================================

set -e

PROJECT_DIR="/home/jpferraz/Documentos/dev/neatpad"
WEBROOT="/var/www/html/neatpad"
APACHE_CONF="/etc/apache2/sites-available/000-default.conf"

echo ""
echo "=== NeatPad — Setup Linux ==="
echo ""

# 1. Garantir que os serviços estão ativos
echo "[1/5] A iniciar serviços Apache e MariaDB..."
systemctl enable apache2 mariadb --quiet
systemctl start apache2 mariadb
echo "      OK"

# 2. Criar utilizador MySQL se não existir
echo ""
echo "[2/5] A configurar utilizador MySQL..."
mysql -u root -e "CREATE USER IF NOT EXISTS 'organizer'@'localhost' IDENTIFIED BY 'organizer123';" 2>/dev/null || true
mysql -u root -e "GRANT ALL PRIVILEGES ON neatpad.* TO 'organizer'@'localhost'; FLUSH PRIVILEGES;" 2>/dev/null || true
echo "      OK"

# 3. Criar a base de dados
echo ""
echo "[3/5] A criar a base de dados..."
mysql -u root < "$PROJECT_DIR/database.sql"
echo "      OK — Base de dados 'neatpad' criada."

# 4. Criar symlink no webroot
echo ""
echo "[4/5] A configurar o Apache..."

# Remover symlink antigo (organizer-ferraz) se existir
if [ -L "/var/www/html/organizer-ferraz" ]; then
    rm -f "/var/www/html/organizer-ferraz"
fi

if [ -L "$WEBROOT" ] || [ -d "$WEBROOT" ]; then
    rm -f "$WEBROOT"
fi

ln -s "$PROJECT_DIR" "$WEBROOT"
echo "      OK — Symlink criado em $WEBROOT"

# 5. Permissões para o Apache seguir symlinks
if ! grep -q "neatpad" "$APACHE_CONF"; then
    # Remover bloco antigo organizer-ferraz se existir
    sed -i '/organizer-ferraz/,/<\/Directory>/d' "$APACHE_CONF"

    sed -i 's|</VirtualHost>|    <Directory '"$PROJECT_DIR"'>\n        Options Indexes FollowSymLinks\n        AllowOverride All\n        Require all granted\n    </Directory>\n</VirtualHost>|' "$APACHE_CONF"
    echo "      OK — Permissões adicionadas."
else
    echo "      Configuração já existe."
fi

a2enmod rewrite --quiet
chmod o+x /home/jpferraz

systemctl restart apache2

echo ""
echo "[5/5] Apache reiniciado."

echo ""
echo "================================================"
echo " NEATPAD — SETUP CONCLUÍDO!"
echo "================================================"
echo ""
echo " Abre o browser em: http://localhost/neatpad/"
echo ""
