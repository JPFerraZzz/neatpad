# NeatPad

**NeatPad** é o teu bloco de notas organizado na web — aplicação de organização pessoal onde podes criar categorias, notas, tarefas, cursos e cadernos digitais. Projeto da **FerrazWeb** (NeatPad by FerrazWeb).

## Porquê o nome NeatPad?

- **Neat** (organizado, arrumado) — reflete o foco em manter notas, listas e cadernos em ordem e fáceis de encontrar.
- **Pad** (de *notepad*) — evoca escrita, anotações e o bloco de notas como centro da experiência (notas, cadernos, tarefas).

O NeatPad é um projeto conciliado da marca FerrazWeb; a referência “by FerrazWeb” identifica a origem do projeto sem fazer parte do nome oficial da aplicação.

## Funcionalidades

- **Autenticação Firebase** — Email/Password + Google
- **Multi-utilizador** — cada conta com dados isolados
- **Categorias com templates** — Notas, Tarefas, Cursos, Cadernos, Excel, Simples
- **Historial de versões** — autosave e snapshots manuais
- **Sub-tarefas** — listas dentro de itens

## Stack

- **Frontend:** HTML + CSS + JavaScript vanilla
- **Backend:** PHP 8+ com PDO
- **Base de dados:** MySQL / MariaDB
- **Auth:** Firebase Authentication

## Setup local (Linux Mint Cinnamon + WhiteSur com LAMP)

```bash
# 1. Executar o setup automático
sudo ./setup-linux.sh

# 2. Abrir no browser
http://localhost/neatpad/
```

## Configuração Firebase

1. Criar projeto em [console.firebase.google.com](https://console.firebase.google.com)
2. Ativar Email/Password e Google em Authentication > Sign-in method
3. Registar app web e copiar `firebaseConfig`
4. Preencher `assets/js/firebase-config.js` com os valores
5. Preencher `FIREBASE_PROJECT_ID` em `config.php`

## Estrutura

```
neatpad/
├── index.html              # App principal
├── login.html              # Página de login
├── config.php              # Firebase config
├── database.sql            # Schema da BD
├── setup-linux.sh          # Setup automático LAMP
├── .htaccess               # Cache, GZIP, segurança
├── api/
│   ├── db.php              # Conexão BD + helpers
│   ├── auth.php            # Login/logout (sessão PHP)
│   ├── auth_check.php      # Middleware de sessão
│   ├── firebase_verify.php # Verificação JWT Firebase
│   ├── categories.php      # CRUD categorias
│   ├── items.php           # CRUD itens
│   ├── save_note.php       # Autosave de conteúdo
│   ├── get_versions.php    # Historial de versões
│   ├── manage_versions.php # Gestão global de versões
│   └── migrate.php         # Migrações automáticas
└── assets/
    ├── css/style.css
    └── js/
        ├── app.js           # Lógica principal
        ├── auth.js          # Firebase Auth frontend
        ├── autosave.js      # Sistema de autosave
        ├── firebase-config.js # Credenciais Firebase
        └── templates.js     # Templates de categorias
```

## Deploy

Variáveis de ambiente suportadas em `api/db.php`:

- `DB_HOST` (default: localhost)
- `DB_USER` (default: organizer)
- `DB_PASS` (default: organizer123)
- `DB_NAME` (default: neatpad)

---

NeatPad · FerrazWeb &copy; 2026
