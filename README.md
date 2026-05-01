# NeatPad

> O teu bloco de notas técnico. Limpo, organizado e sempre à mão.
>
> [neatpad.duckdns.org](https://neatpad.duckdns.org)

---

## O que é o NeatPad

O NeatPad é uma aplicação web pensada para quem aprende, programa e trabalha em
IT — e precisa de um sítio sério para guardar tudo o que vai descobrindo pelo
caminho. Comandos, snippets, configurações, cheatsheets, notas de aulas, ideias
de projeto, listas de tarefas: tudo num único espaço, organizado por categorias
e acessível em qualquer dispositivo.

Foi desenhado a pensar em três coisas:

- **Pôr ordem** no caos de notas espalhadas por READMEs, ficheiros `.txt`,
  conversas no Discord e separadores do browser que nunca mais fechamos.
- **Tirar do caminho** — interface minimal, sem distrações, sem botões que não
  servem para nada. Foco no que estás a escrever.
- **Estar onde precisas** — funciona como PWA, instala-se em iOS, Android,
  Windows e Linux a partir do browser, e abre como uma app nativa.

---

## Ecossistema FerrazWeb

O NeatPad é o terceiro produto do ecossistema **FerrazWeb**, organizado em
torno do ciclo natural de quem trabalha em IT: **aprender → praticar → guardar**.

| Etapa     | Produto       | O que faz |
|-----------|---------------|-----------|
| Aprender  | **FerrazWeb** *(em desenvolvimento)*  | Plataforma de roadmaps e cursos IT estruturados por carreira (Sysadmin, DevOps, Pentester, Cloud Engineer, etc.). |
| Praticar  | **SCII** *(em desenvolvimento)*       | Ambiente de desenvolvimento na cloud com editor Monaco, terminal interativo e containers Docker isolados por sessão. |
| Guardar   | **NeatPad** *(live)*                  | App de notas técnicas para registar comandos, snippets e anotações do estudo e do dia-a-dia. |

O **NeatPad** é onde fica tudo o que aprendes no FerrazWeb e tudo o que
descobres a praticar no SCII. É o caderno digital do ecossistema.

---

## Funcionalidades

- **Categorias com personalidade** — escolhes ícone, cor e tipo (Notas,
  Tarefas, Cursos, Cadernos, Excel, Simples) e a app adapta a interface.
- **Cadernos com editor rich-text** — formatação completa (negrito, itálico,
  listas, código, citações, cores) num layout inspirado no Notion.
- **Historial de versões** — autosave em segundo plano e snapshots manuais para
  poderes voltar atrás sem perder nada.
- **Sub-tarefas** — checklists dentro de itens, ideal para partir tarefas
  grandes em passos pequenos.
- **Temas claros e escuros** — com fundos decorativos opcionais e respeito por
  `prefers-reduced-motion`.
- **Login Firebase** — Email/Password ou Google, com sessão persistente entre
  refreshes.
- **PWA instalável** — abre como app no telemóvel ou no PC, com ícone próprio
  no ecrã principal e funciona offline para leitura.
- **Multi-utilizador** — cada conta tem o seu próprio espaço, totalmente
  isolado dos restantes.

---

## Estado

O NeatPad está **em produção** e disponível em
[neatpad.duckdns.org](https://neatpad.duckdns.org). É desenvolvido e mantido
ativamente como produto pessoal e parte do ecossistema FerrazWeb.

---

## Segurança

- **Credenciais**: `config.php`, `assets/js/firebase-config.js`, `.env*` e dumps `*.sql` não devem ser commitados (ver `.gitignore`). Em produção define `NEATPAD_ENV=production` para respostas de erro genéricas nas APIs.
- **Base de dados**: em produção define `DB_PASS` / variáveis Railway; não uses a palavra-passe por defeito do Docker local.
- **Webhook GitHub**: define `WEBHOOK_SECRET` no ambiente; em produção o endpoint recusa-se a funcionar sem secret.
- **Apache**: `.htaccess` bloqueia acesso HTTP directo a includes (`db.php`, `security.php`, `sanitize.php`, `session_db.php`, etc.), ficheiros `.env*`, `*.sql`, scripts de setup e `composer.json`.
- **Eliminações**: hard delete na BD com `ON DELETE CASCADE` nas FKs (`items`, `subtasks`, `note_versions`); não há soft delete — não é necessário filtrar `deleted_at` nos SELECTs.

### Firebase — Security Rules (Console)

Configura no [Firebase Console](https://console.firebase.google.com/) as regras mínimas conforme o produto que uses:

**Realtime Database** (regra mínima — só utilizadores autenticados):

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

**Cloud Firestore** (regra mínima equivalente):

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

> Ajusta estes exemplos por coleção/caminho antes de produção; o NeatPad usa sobretudo **Auth** + API PHP + MySQL — as rules acima são um piso mínimo se usares RTDB/Firestore para dados em tempo real.

---

## Licença

Código distribuído sob [Creative Commons BY-NC-ND 4.0](LICENSE)
(*Attribution-NonCommercial-NoDerivatives*). Em resumo:

- Podes ver e estudar o código.
- **Não** podes usar comercialmente.
- **Não** podes redistribuir versões modificadas.

NeatPad · **FerrazWeb** © 2026 João Ferraz.
