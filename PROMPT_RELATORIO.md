# Prompt para gerar relatório do projeto NeatPad

Copia o bloco abaixo e cola na conversa com o Claude, pedindo que gere um relatório completo e atualizado do projeto.

---

**INSTRUÇÃO:** Gera um relatório completo e atualizado do projeto **NeatPad**, em português de Portugal, pensado para ser guardado em **.docx** (para poder colocar no LinkedIn). O relatório deve ter secções bem estruturadas e incluir tudo o que se pede abaixo. **Demore o tempo que demorar — quero que funcione.** O importante é que fique correto e utilizável.

- **Imagens:** Vou enviar imagens para incluir no relatório. Inclui um índice de imagens/figuras e deixa lugares claros (ex.: “Figura X – [descrição]”) para eu colocar as imagens ou para as inserires quando eu as mandar.  
- **Diagramas da BD:** Inclui descrição da base de dados em UML e, se possível, diagramas em formato **draw.io** para descrever as tabelas e relações.

---

## Contexto do projeto

- **Nome:** NeatPad  
- **Descrição:** Aplicação web de organização pessoal — o teu bloco de notas organizado. Os utilizadores criam categorias, gerem tarefas, notas, cursos, cadernos digitais e tabelas tipo Excel, com autenticação multi-utilizador e isolamento total de dados por conta. O NeatPad é um projeto da **FerrazWeb** (referência: NeatPad by FerrazWeb; a marca FerrazWeb identifica a origem, o nome oficial da app é NeatPad).  
- **Significado do nome:** **Neat** = organizado, arrumado (tudo no sítio); **Pad** = de *notepad*, bloco de notas — evoca escrita, anotações e o foco em notas e cadernos.  
- **URL em produção:** https://neatpad.up.railway.app  
- **Controlo de versão:** Git (repositório pode estar no GitHub).

---

## Stack tecnológica

- **Frontend:** HTML5, CSS3, JavaScript vanilla (sem frameworks). Variáveis CSS para temas Light/Dark; design responsivo com breakpoints e suporte a mobile/tablet (touch targets, safe areas, modais em estilo bottom sheet em ecrãs pequenos).
- **Backend:** PHP 8+ (com PDO). Servidor embutido em produção (`php -S 0.0.0.0:$PORT -t .` via Procfile).
- **Base de dados:** MySQL / MariaDB. Conexão via PDO em `api/db.php`; variáveis de ambiente suportam Railway (MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT) e nomes alternativos (DB_HOST, etc.).
- **Autenticação:** Firebase Authentication (Email/Password e Google Sign-In). Token JWT enviado para o backend; verificação em `api/firebase_verify.php` (chaves públicas Google, sem SDK PHP). Sessão PHP criada após login; sessões guardadas em **MySQL** (`php_sessions`) para multi-instância no Railway (sem sticky sessions). Duração da sessão configurável com `SESSION_MAX_LIFETIME` (default 7 dias).
- **Deploy:** Railway (PaaS). Build via Nixpacks; `composer.json` requer PHP >= 8.1 e extensões `ext-pdo`, `ext-pdo_mysql`. Domínio: neatpad.up.railway.app. Firebase: domínio autorizado no projeto.

---

## Estrutura do projeto (referência)

**Raiz:**  
`index.html` (app principal, grelha de categorias, modais de categorias/itens/editor/versões), `login.html` (login e registo, tabs Entrar/Criar conta, Google Sign-In), `config.php` (FIREBASE_PROJECT_ID, timezone Europe/Lisbon), `database.sql` (schema completo para setup local), `railway-db-setup.sql` (schema para Railway, sem DROP/CREATE DATABASE), `railway-db-migration-version-name.sql` (ALTER para adicionar `version_name` a `note_versions`), `.htaccess` (Apache: rewrite, UTF-8, cache, GZIP), `composer.json`, `nixpacks.toml`, `Procfile`, `.env.example`, `.gitignore`, `setup-linux.sh`, `README.md`.

**api/:**  
`db.php` (conexão PDO, getDB, jsonResponse, getInput; headers JSON e CORS), `session_db.php` (handler de sessões em MySQL; session_set_save_handler; cookie com lifetime e SameSite), `auth_check.php` (requireAuth, inclui session_db), `auth.php` (GET sessão, POST login com token Firebase, DELETE logout), `firebase_verify.php` (validação JWT Firebase, cache de chaves), `categories.php` (CRUD categorias, filtro por user_uid), `items.php` (CRUD itens, validação de propriedade via categoria), `save_note.php` (guarda conteúdo em note_versions + atualiza item; suporta manual_snapshot e version_name), `get_versions.php` (listar/obter/restaurar versões), `manage_versions.php` (listar itens com versões, apagar versões; filtro por template notebooks para gestão de versões), `migrate.php` (migrações automáticas, ex.: LONGTEXT, tabela note_versions).

**assets/css:**  
`style.css` (variáveis tema, header, cards, modais, formulários, notificações, responsivo, touch targets, safe areas, z-index para modais sobrepostos).

**assets/js:**  
`app.js` (carregar categorias, modais, CRUD, API_URL, notificações, integração com templates), `auth.js` (Firebase: loginEmail, registerEmail, loginGoogle; createPhpSession; logout; credentials 'same-origin' nos fetches), `autosave.js` (debounce, drafts em localStorage, save_note.php), `templates.js` (templates por tipo: simple, notes, tasks, course, excel, notebooks; renderização de listas, editores, formulários; curso ↔ cadernos associados; versões apenas para cadernos), `firebase-config.js` (credenciais Firebase do projeto).

---

## Base de dados

- **categories:** id, user_uid, name, icon, color, template_type (simple, notes, tasks, course, excel, notebooks), created_at, updated_at. Índice user_uid.  
- **items:** id, category_id, title, content (LONGTEXT), status, priority, due_date, metadata (JSON), timestamps. FK category_id ON DELETE CASCADE. Em cadernos associados a cursos, metadata pode ter linkedToCourse, linkedToCourseTitle.  
- **subtasks:** id, item_id, description, completed, created_at. FK item_id ON DELETE CASCADE.  
- **php_sessions:** id, data, last_activity. Sessões PHP em MySQL para Railway.  
- **note_versions:** id, item_id, content, version, saved_by (manual|autosave), version_name (opcional), created_at. FK item_id ON DELETE CASCADE. Limite de versões por item (ex.: 50) aplicado no backend. Historial e “Guardar versão” com nome usado sobretudo para cadernos.

Isolamento: todas as operações filtram por user_uid através de categories.

---

## Funcionalidades a documentar no relatório

- Autenticação Firebase (Email/Password + Google); sessão PHP em MySQL; logout.  
- Categorias com 6 templates: Simples, Notas, Tarefas, Cursos, Excel, Cadernos. CRUD categorias e itens.  
- Sub-tarefas em itens do tipo tarefas.  
- Cursos: categoria tipo “course”; cadernos podem ser associados a um curso (metadata linkedToCourse / linkedToCourseTitle). Na vista do curso mostra-se contagem de cadernos associados; na lista de cadernos e na vista do caderno selecionado mostra-se “Associado: [nome do curso]”. Clique num caderno (na categoria Cadernos ou no modal “Cadernos de: [curso]”) abre o editor do caderno, não “Editar Categoria”.  
- Cadernos: editor rico (formatação, listas, parágrafo, cor do texto); autosave; “Guardar versão” com nome; historial de versões; gestão de versões (manage_versions) disponível apenas para itens em categorias tipo notebooks.  
- Excel: template com tabelas; importar CSV; exportar CSV; dark mode nas tabelas via variáveis CSS.  
- Dark mode / Light mode: toggle no header, persistência em localStorage, variáveis CSS.  
- UI/UX: responsivo, touch targets e safe areas para mobile; modais em bottom sheet em ecrãs pequenos; notificações com classe e variáveis CSS; viewport e meta para PWA/mobile em index e login.  
- Deploy Railway: variáveis de ambiente (BD, FIREBASE_PROJECT_ID, SESSION_MAX_LIFETIME); criação de tabelas com railway-db-setup.sql; migração version_name se a BD já existia.

---

## Referência de estrutura (exemplo — faz melhor)

Podes usar como **referência** a estrutura do relatório existente (RELATORIO_PROJETO.md). Exemplos de como está organizado:

- **Cabeçalho:** título "Relatório do Projeto NeatPad", Autor, Data, URL em produção.
- **Numeração de secções:** 1. Resumo Executivo, 2. Stack Tecnológica, 3. Estrutura do Projeto e Descrição de Ficheiros, etc. Subsecções com 3.1, 3.2, 4.1, 4.2.
- **Tabelas:** Stack em tabela (Camada | Tecnologia); ficheiros em tabelas (Ficheiro | Descrição) por pasta (Raiz, api/, assets/css/, assets/js/).
- **Base de dados:** lista de tabelas com atributos; subsecção "Isolamento por Utilizador".
- **Deploy:** subsecções (Plataforma Escolhida, Passos Realizados) com listas numeradas.
- **Separadores** visuais entre secções (ex.: `---` em Markdown).
- **Conclusão** curta; rodapé com "Documento escrito para fins de documentação e portfólio. FerrazWeb © 2026."

**Pedido:** Usa esta estrutura como base, mas **melhora**: maior clareza e hierarquia, descrições mais completas onde fizer sentido, secção de API explícita, índice de conteúdos e de figuras, diagramas UML/draw.io da BD, e um aspeto mais polido e profissional (adequado a portfólio e LinkedIn). Ou seja, não te limites a copiar — estrutura melhor, aprofunda onde for útil e entrega um relatório de maior qualidade.

---

## O que deve constar no relatório

1. **Índice de conteúdos** — no início do documento, com todos os títulos e sub-títulos e respetivas páginas (ou números de secção).  
2. **Índice de imagens/figuras** — lista de todas as figuras, diagramas e imagens incluídas no relatório, com legenda e número (ex.: Figura 1, Figura 2). Deixa espaço ou indica “(a preencher com imagens enviadas pelo utilizador)” onde fores inserir imagens que eu te enviar; quando eu mandar as imagens, coloca-as nos sítios indicados e atualiza este índice.  
3. **Cabeçalho e resumo executivo** — No início: título do relatório, **Autor:** João Ferraz, **Data:** (ex.: Março 2026), **URL em produção:** https://neatpad.up.railway.app. Inclui no contexto a explicação do nome (Neat = organizado, Pad = notepad / bloco de notas) e a referência à FerrazWeb (NeatPad by FerrazWeb). Segue-se o resumo executivo (uma página com objetivo do projeto, público-alvo e resultado — app em produção).  
4. **Stack tecnológica** — tabela e breve justificação das escolhas (PHP, MySQL, Firebase, Railway, sessões em BD).  
5. **Estrutura do projeto** — árvore ou tabela de ficheiros/pastas com descrição curta de cada um.  
6. **Base de dados** — tabelas, relações, isolamento por utilizador, papel de php_sessions e note_versions. Inclui aqui uma **descrição da base de dados em UML**:  
   - Cria diagramas em **draw.io** (formato editável, ex.: .drawio ou XML exportável para draw.io) que representem o modelo de dados (entidades: categories, items, subtasks, php_sessions, note_versions; atributos principais; relações e cardinalidades). Se não puderes gerar ficheiros .drawio diretamente, descreve em texto claro o diagrama UML (entidades, atributos, FKs, cardinalidades) para eu recriar no draw.io, ou fornece o diagrama noutro formato que o draw.io importe. O objetivo é poder abrir e editar no draw.io e usar no relatório para descrever a base de dados.  
7. **API e backend** — Lista ou tabela de endpoints (método HTTP, ficheiro/path, breve descrição): auth.php (GET/POST/DELETE), categories.php, items.php, save_note.php, get_versions.php, manage_versions.php, etc. Inclui o fluxo de autenticação/sessão (login → token Firebase → verificação → sessão PHP em MySQL).  
8. **Funcionalidades** — lista detalhada (auth, categorias, templates, cursos e cadernos associados, versões, Excel, dark mode, responsivo/mobile).  
9. **Processo de deploy** — Passos na Railway (preparação do código, repositório, serviço MySQL, variáveis, domínio). Inclui uma **tabela ou lista de variáveis de ambiente** usadas em produção (ex.: MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT, FIREBASE_PROJECT_ID, SESSION_MAX_LIFETIME). Configuração da BD (railway-db-setup.sql) e do Firebase (domínio autorizado).  
10. **Conclusão** — reflexão sobre o que foi alcançado e competências demonstradas.

**Formato de entrega:**  
- O relatório deve ser fornecido em formato **.docx** (Word), para eu poder colocar no LinkedIn. Se não puderes gerar .docx diretamente, entrega em Markdown bem estruturado com indicação explícita de onde vão o índice de conteúdos, o índice de imagens e os diagramas/figuras, para eu converter a .docx e inserir as imagens.  
- Inclui **índice de conteúdos** e **índice de imagens/figuras** atualizados.  
- Inclui ou anexa os **diagramas draw.io** (ou descrição UML/diagrama alternativo para draw.io) da base de dados.  
- Não inventes ficheiros, endpoints ou funcionalidades que não estejam descritas neste prompt. Usa apenas a informação fornecida aqui (e, se tiveres acesso, o ficheiro RELATORIO_PROJETO.md do projeto como referência de estrutura).  
- **No fim do relatório**, coloca exatamente este texto (rodapé/nota final):  
  *Documento escrito para fins de documentação e portfólio. FerrazWeb © 2026.*

