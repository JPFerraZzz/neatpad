# Relatório do Projeto FerrazNest

**Autor:** João Ferraz  
**Data:** Março 2026  
**URL em produção:** https://ferraznest.up.railway.app

---

## 1. Resumo Executivo

O **FerrazNest** é uma aplicação web de organização pessoal desenvolvida como projeto da marca FerrazWeb. Permite aos utilizadores criar categorias, gerir tarefas, notas, cursos e cadernos digitais, com autenticação multi-utilizador via Firebase e isolamento completo de dados por conta.

A aplicação foi desenvolvida em PHP, MySQL e JavaScript vanilla, e está em produção na plataforma Railway com domínio personalizado.

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | HTML5, CSS3, JavaScript (vanilla) |
| Backend | PHP 8.3 |
| Base de dados | MySQL / MariaDB |
| Autenticação | Firebase Authentication (Email/Password + Google) |
| Deploy | Railway (PaaS) |
| Controlo de versão | Git + GitHub |

---

## 3. Estrutura do Projeto e Descrição de Ficheiros

### 3.1 Raiz do Projeto

| Ficheiro | Descrição |
|----------|-----------|
| **index.html** | Página principal da aplicação. Verifica a sessão via API antes de renderizar; redireciona para login se não autenticado. Contém o header com logo, botões de ação, toggle Dark/Light mode, e a grelha de categorias. Inclui os modais de categorias, itens, editor e gestão de versões. |
| **login.html** | Página de login e registo. Interface com tabs (Entrar / Criar conta), formulários para email/password, botão Google Sign-In. Design com blobs decorativos, card central e paleta FerrazNest (roxo #6C63FF, creme #F4F0EB). |
| **config.php** | Configuração global: FIREBASE_PROJECT_ID, timezone (Europe/Lisbon), e flags de erro. Suporta variável de ambiente para o project ID. |
| **database.sql** | Schema completo da base de dados para instalação local. Inclui DROP/CREATE DATABASE, tabelas categories (com user_uid), items, subtasks, note_versions. Usado no setup LAMP. |
| **railway-db-setup.sql** | Versão do schema para Railway: sem DROP/CREATE DATABASE (o Railway já cria). Usado para criar tabelas após deploy. |
| **.htaccess** | Configuração Apache: RewriteEngine, charset UTF-8, bloqueio de listagem de diretórios, cache e compressão GZIP para recursos estáticos. |
| **composer.json** | Manifesto PHP mínimo para deteção pelo Railway/Nixpacks. Requer PHP >= 8.1. |
| **nixpacks.toml** | Configuração de build para Railway: instala PHP e extensões (pdo_mysql, mbstring, openssl). Define comando de arranque do servidor PHP embutido. |
| **Procfile** | Comando de arranque para Railway: `php -S 0.0.0.0:$PORT -t .` |
| **.env.example** | Exemplo de variáveis de ambiente (DB_*, FIREBASE_PROJECT_ID) para referência local. |
| **.gitignore** | Ignora .env, logs, ficheiros temporários, pastas de IDE. |
| **setup-linux.sh** | Script de setup automático para Linux com LAMP: inicia Apache/MariaDB, cria utilizador MySQL, importa database.sql, cria symlink em /var/www/html/ferraznest, configura permissões Apache. |
| **README.md** | Documentação do projeto: funcionalidades, stack, instruções de setup e deploy. |

### 3.2 Pasta api/

| Ficheiro | Descrição |
|----------|-----------|
| **db.php** | Conexão centralizada à BD via PDO. Define DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME (suporta variáveis Railway: MYSQLHOST, MYSQL_HOST, etc.). Funções getDB(), jsonResponse(), getInput(). Headers CORS e JSON. |
| **auth_check.php** | Helper de autenticação. Função requireAuth() inicia sessão e verifica $_SESSION['uid']; devolve 401 se não autenticado. Incluído no topo de todos os endpoints protegidos. |
| **auth.php** | Endpoint de autenticação. GET: estado da sessão. POST: recebe token Firebase, verifica via firebase_verify.php, cria sessão PHP. DELETE: logout (destrói sessão). |
| **firebase_verify.php** | Verificação de JWT do Firebase sem dependências externas. Decodifica token, valida assinatura com chaves públicas do Google, verifica exp/aud/iss. Cache de chaves em /tmp. |
| **categories.php** | CRUD de categorias. GET: lista categorias do utilizador com contagem de itens. POST: cria categoria (user_uid obrigatório). PUT: atualiza. DELETE: remove. Filtra sempre por user_uid da sessão. |
| **items.php** | CRUD de itens. GET: lista itens de uma categoria ou todos do utilizador. POST/PUT: cria/atualiza com validação de propriedade (categoria pertence ao user). DELETE: remove item. Funções auxiliares ownedCategoryExists(), ownedItemExists(). |
| **save_note.php** | Guarda conteúdo de notas/cadernos. POST com item_id, content, saved_by. Cria entrada em note_versions antes de atualizar o item. Suporta manual_snapshot. Transações para consistência. |
| **get_versions.php** | Historial de versões. GET ?item_id=X: lista versões. GET ?item_id=X&version=Y: conteúdo de uma versão. POST: restaura versão anterior. Valida propriedade do item. |
| **manage_versions.php** | Gestão global de versões. GET: lista itens com contagem de versões e tamanho. DELETE: apaga versões (por item ou por id). POST action=delete_all: limpa historial do utilizador. |
| **migrate.php** | Migração automática: garante LONGTEXT em items.content, cria tabela note_versions se não existir. Útil para upgrades. |

### 3.3 Pasta assets/

#### assets/css/
| Ficheiro | Descrição |
|----------|-----------|
| **style.css** | Estilos principais. Variáveis CSS para Light/Dark mode (--bg-body, --text-primary, --primary-color, etc.). Tema aplicado via data-theme="dark". Estilos para header, cards, modais, formulários, badges, scrollbar. Responsivo. |

#### assets/js/
| Ficheiro | Descrição |
|----------|-----------|
| **app.js** | Lógica principal: carrega categorias, abre modais, CRUD de categorias e itens, integração com templates. Constante API_URL. Funções assíncronas com fetch. |
| **auth.js** | Autenticação Firebase: loginEmail(), registerEmail(), loginGoogle(). Envia token para api/auth.php. createPhpSession(). logout(). Tradução de erros Firebase. |
| **autosave.js** | Sistema de autosave: debounce, localStorage para drafts, chamadas a save_note.php. Evita perda de dados em falhas de rede. |
| **templates.js** | Templates dinâmicos por tipo de categoria: simple, notes, tasks, course, excel, notebooks. Renderização de listas, editores, formulários. |
| **firebase-config.js** | Configuração Firebase (apiKey, authDomain, projectId, etc.). Preenchido manualmente com credenciais do Firebase Console. |

---

## 4. Base de Dados

### 4.1 Tabelas

- **categories**: id, user_uid, name, icon, color, template_type, created_at, updated_at. Índice em user_uid.
- **items**: id, category_id, title, content, status, priority, due_date, metadata (JSON), timestamps. FK para categories com CASCADE.
- **subtasks**: id, item_id, description, completed, created_at. FK para items.
- **note_versions**: id, item_id, content, version, saved_by, created_at. FK para items. Historial de até 50 versões por item.

### 4.2 Isolamento por Utilizador

Todas as categorias têm user_uid (Firebase UID). Itens, subtasks e versões herdam o isolamento via category_id → categories.user_uid.

---

## 5. Processo de Deploy

### 5.1 Plataforma Escolhida: Railway

- **URL:** https://ferraznest.up.railway.app  
- **Motivo:** Suporte nativo a PHP + MySQL, $5 crédito/mês grátis, domínio personalizado (.up.railway.app), deploy automático via GitHub.

### 5.2 Passos Realizados

1. **Preparação do código**
   - Criação de composer.json para deteção PHP
   - nixpacks.toml com pacotes PHP e extensões
   - Procfile com comando de arranque
   - api/db.php atualizado para variáveis Railway (MYSQLHOST, MYSQLUSER, etc.)
   - railway-db-setup.sql para criação de tabelas

2. **Repositório GitHub**
   - `git init`, `git add .`, `git commit`
   - Criação de repositório privado em github.com
   - `git remote add origin`, `git push -u origin main`

3. **Railway**
   - Criação de conta e ligação ao GitHub
   - New Project → Deploy from GitHub repo → seleção do repositório ferraznest
   - Adição de serviço MySQL (Database → MySQL)
   - Variáveis: referência das variáveis MySQL (MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT) ao serviço web
   - Domínio: Settings → Networking → definição de ferraznest.up.railway.app

4. **Base de dados**
   - Connect → Public Network → obtenção de credenciais
   - Execução local: `mysql -h gondola.proxy.rlwy.net -u root -p --port 47998 railway < railway-db-setup.sql`

5. **Firebase**
   - Authentication → Settings → Authorized domains → adição de ferraznest.up.railway.app

---

## 6. Funcionalidades Implementadas

- Autenticação Firebase (Email/Password + Google)
- Multi-utilizador com isolamento de dados
- Categorias com 6 templates (Simples, Notas, Tarefas, Cursos, Excel, Cadernos)
- CRUD completo de categorias e itens
- Sub-tarefas em itens do tipo tarefas
- Historial de versões com autosave e snapshots manuais
- Dark Mode / Light Mode com toggle animado e persistência em localStorage
- Design responsivo e paleta FerrazNest (roxo, creme, blobs decorativos)
- Deploy em produção com domínio personalizado

---

## 7. Conclusão

O FerrazNest foi desenvolvido de raiz, integrado com Firebase e MySQL, e colocado em produção na Railway. O projeto demonstra competências em desenvolvimento full-stack, autenticação OAuth, gestão de estado, e deploy em cloud.

---

*Documento gerado para fins de documentação e portfólio. FerrazWeb © 2026.*
