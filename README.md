# NeatPad

**NeatPad** é o teu bloco de notas organizado na web — aplicação de organização pessoal onde podes criar categorias, notas, tarefas, cursos e cadernos digitais. Projeto da **FerrazWeb** (NeatPad by FerrazWeb).

## Porquê o nome NeatPad?

- **Neat** (organizado, arrumado) — reflete o foco em manter notas, listas e cadernos em ordem e fáceis de encontrar.
- **Pad** (de *notepad*) — evoca escrita, anotações e o bloco de notas como centro da experiência.

O NeatPad é um projeto associado à marca FerrazWeb; a referência "by FerrazWeb" identifica a origem do projeto sem fazer parte do nome oficial.

## Funcionalidades

- **Autenticação Firebase** — Email/Password + Google
- **Multi-utilizador** — cada conta com dados isolados
- **Categorias com templates** — Notas, Tarefas, Cursos, Cadernos, Excel, Simples
- **Historial de versões** — autosave e snapshots manuais
- **Sub-tarefas** — listas dentro de itens
- **PWA** — instalável em iOS e Android a partir do browser

## Stack

- **Frontend:** HTML + CSS + JavaScript vanilla (+ Service Worker)
- **Backend:** PHP 8+ com PDO
- **Base de dados:** MySQL / MariaDB
- **Auth:** Firebase Authentication
- **Servidor:** Ubuntu Server + Apache + PHP (sem Docker)
- **Domínio:** neatpad.duckdns.org (DuckDNS)

---

## Setup local (Linux Mint Cinnamon + LAMP)

```bash
# 1. Clonar o repositório
git clone https://github.com/JPFerraZzz/neatpad.git
cd neatpad

# 2. Executar o setup automático (cria BD, permissões Apache, etc.)
sudo ./setup-linux.sh

# 3. Criar o ficheiro de configuração Firebase a partir do modelo
cp assets/js/firebase-config.example.js assets/js/firebase-config.js
# Edita assets/js/firebase-config.js e coloca os teus valores reais.
# Este ficheiro NÃO vai para o Git (está no .gitignore).

# 4. Criar config.php com as credenciais da BD e o project ID Firebase
#    (exemplo em config.example.php ou ver .env.example)

# 5. Abrir no browser
xdg-open http://localhost/neatpad/
```

---

## Configuração Firebase (obrigatória)

1. Criar projeto em [console.firebase.google.com](https://console.firebase.google.com).
2. Em **Authentication → Sign-in method**, ativar **Email/Password** e **Google**.
3. Em **Project Settings → Your apps**, registar uma *app web* e copiar o objeto `firebaseConfig`.
4. **Criar o ficheiro local a partir do modelo:**

   ```bash
   cp assets/js/firebase-config.example.js assets/js/firebase-config.js
   ```

5. Editar `assets/js/firebase-config.js` e colocar os valores reais.
6. Preencher `FIREBASE_PROJECT_ID` em `config.php`.

> ⚠️ **Segurança:** `assets/js/firebase-config.js` e `config.php` estão no `.gitignore`.
> **NUNCA** os commites. Se acidentalmente forem enviados, gera novas chaves no Firebase Console e limpa o histórico com BFG (ver secção abaixo).

### Firebase Security Rules

As Rules no Firebase devem bloquear leituras/escritas anónimas. No mínimo:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Se usares o Realtime Database:

```
{
  "rules": {
    ".read":  "auth != null",
    ".write": "auth != null"
  }
}
```

---

## Deploy em produção (Ubuntu + Apache + DuckDNS)

O servidor serve `/var/www/neatpad` diretamente com Apache + PHP, sem Docker.

### 1. Setup inicial (uma vez no servidor)

```bash
sudo apt update && sudo apt install -y apache2 php php-mysql mariadb-server
sudo git clone https://github.com/JPFerraZzz/neatpad.git /var/www/neatpad
sudo chown -R www-data:www-data /var/www/neatpad
```

### 2. Criar **no servidor** (e só no servidor):
- `/var/www/neatpad/assets/js/firebase-config.js` — com os valores reais do Firebase.
- `/var/www/neatpad/config.php` — com as credenciais da BD e `FIREBASE_PROJECT_ID`.

Estes ficheiros ficam **fora do Git** e o CI/CD **nunca lhes toca**.

### 3. CI/CD

Sempre que fazes `git push origin main`, o GitHub Actions faz SSH para o servidor e executa `git pull`. Ver [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) e instruções de setup dos secrets no mesmo ficheiro.

---

## Limpar chaves expostas do histórico (BFG Repo Cleaner)

Se alguma vez uma credencial foi commitada, **removê-la de HEAD não chega** — fica no histórico do Git e é pública. Passos:

```bash
# 1. Instalar BFG (Linux)
sudo apt install -y default-jre
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar -O bfg.jar

# 2. Clonar em modo mirror (cópia completa do .git)
git clone --mirror https://github.com/JPFerraZzz/neatpad.git neatpad-mirror.git
cd neatpad-mirror.git

# 3. Apagar o ficheiro em TODOS os commits do histórico
java -jar ../bfg.jar --delete-files firebase-config.js
java -jar ../bfg.jar --delete-files config.php
java -jar ../bfg.jar --delete-files Procfile
java -jar ../bfg.jar --delete-files nixpacks.toml
java -jar ../bfg.jar --delete-files "railway-db-*.sql"

# 4. Limpar refs e fazer GC
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Empurrar o histórico reescrito (força push)
git push --force
```

Alternativa com `git filter-repo` (recomendado pela Git oficial):

```bash
pip install git-filter-repo
git clone https://github.com/JPFerraZzz/neatpad.git
cd neatpad
git filter-repo --path assets/js/firebase-config.js --invert-paths
git filter-repo --path config.php --invert-paths
git filter-repo --path Procfile --invert-paths
git filter-repo --path nixpacks.toml --invert-paths
git filter-repo --path-glob 'railway-db-*.sql' --invert-paths
git remote add origin https://github.com/JPFerraZzz/neatpad.git
git push --force --all
```

> Depois de reescrever o histórico, **qualquer colaborador tem de fazer reclone**. Avisa a equipa.

### Depois da limpeza: **rotate obrigatório**

Chaves que estiveram expostas continuam comprometidas mesmo depois de removidas do histórico — podem ter sido indexadas por bots. Faz:

1. Firebase Console → **Project Settings → General → Your apps** → regenerar/substituir API Key.
2. Google Cloud Console → **APIs & Services → Credentials** → restringir a API Key ao domínio `neatpad.duckdns.org` e a Firebase Auth APIs.
3. Atualizar `assets/js/firebase-config.js` no servidor com as novas chaves.

---

## Estrutura

```
neatpad/
├── index.html                      # App principal
├── login.html                      # Página de login
├── manifest.json                   # PWA manifest
├── service-worker.js               # PWA service worker
├── config.php                      # Config BD + Firebase (NÃO no Git)
├── database.sql                    # Schema da BD
├── setup-linux.sh                  # Setup automático LAMP
├── .htaccess                       # Cache, GZIP, segurança
├── .github/workflows/deploy.yml    # CI/CD GitHub Actions → servidor
├── api/                            # Endpoints PHP
└── assets/
    ├── css/style.css
    ├── icons/                      # Ícones PWA
    └── js/
        ├── app.js
        ├── auth.js
        ├── autosave.js
        ├── firebase-config.example.js   # Modelo (NO Git)
        ├── firebase-config.js           # Real (NÃO no Git)
        ├── pwa.js                       # Registo service worker + banner
        └── templates.js
```

---

## Variáveis de ambiente suportadas em `api/db.php`

- `DB_HOST` (default: localhost)
- `DB_USER` (default: organizer)
- `DB_PASS` (default: organizer123)
- `DB_NAME` (default: neatpad)

---

NeatPad · **FerrazWeb** &copy; 2026
