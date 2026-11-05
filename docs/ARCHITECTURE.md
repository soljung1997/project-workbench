# Project Workbench — Architecture

**Version:** 0.2  
**Scope:** MVP  
**Principle:** Browser-first, phone-developable, desktop-ready.

## 1. Technical decisions

- **Frontend:** HTML, CSS, and vanilla JavaScript using ES modules.
- **Runtime:** Browser only. No framework, build step, package manager, or backend required for the MVP.
- **Persistence:** IndexedDB, accessed through a small asynchronous repository layer.
- **Backup:** User-triggered JSON export/import, with a version number and validation.
- **Development:** Acode on Android (moved from Spck Editor in Nov 2026), with Claude Code in Acode's terminal; GitHub for source control.
- **Future delivery:** Hosted Progressive Web App (PWA) first; Electron packaging only if desktop-specific features justify it.

**Compatibility checkpoint:** Before implementing features, verify that Acode's HTML preview runs local JavaScript ES module imports and IndexedDB reliably, and whether it is a secure page (HTTPS or `localhost`) so `crypto.randomUUID()` works. If not, adapt the preview approach without changing the product's core architecture. **Passed on 2026-11-05** (see `CLAUDE.md`, "Acode preview").

## 2. Module boundaries

```text
HTML/CSS + UI modules (display and user input)
                  ↓
Application services (coordinate actions and enforce rules)
                  ↓
Repositories (read/write records; hide storage details)
                  ↓
IndexedDB (local browser data)
```

- **UI:** Renders screens and forwards user actions. No direct database access.
- **Services:** Manage projects, task lists, tasks, notes, tags, widgets, and work sessions. No DOM or browser storage code.
- **Repositories:** Provide consistent asynchronous data-access methods. No UI logic.

### 2.1 Transactions across stores

One user action often changes several stores at once, all or nothing: creating a project with its default list and widgets, or deleting a project, task list, note or tag together with the records that point to it ([DATA_MODEL.md](DATA_MODEL.md) §3). To make this possible, **services own transactions and repositories join them**:

- `js/storage/db.js` opens the database and provides `withTransaction(storeNames, mode, work)`. It opens one IndexedDB transaction across the named stores and calls `work(tx)`. It resolves with `work`'s result only after the transaction has **completed**, so a result means the data is saved.
- Every repository method takes the transaction as its first argument (e.g. `taskRepo.listByProject(tx, projectId)`) and uses that transaction's stores. Repositories never open their own transactions.
- A service opens one transaction per action, covering every store the action reads or writes. It does its checks (e.g. "is this name taken?") and its writes inside that transaction, so nothing can change in between.
- **No outside waiting inside `work`:** an IndexedDB transaction closes on its own as soon as the code waits on anything that isn't an IndexedDB request. Inside `work`, only await repository calls. Never await timers, `fetch`, file reading or the UI. Do that work before opening the transaction.
- If `work` throws, `withTransaction` aborts the transaction (nothing is written) and rejects with the same error.

### 2.2 Errors

All expected failures use one error type, `WorkbenchError` (in `js/errors.js`, shared by every layer). It has a `code` from the list below, a developer-facing `message`, and optional `details` (e.g. `{ field: "name" }`). The UI turns codes into user-facing messages; services and repositories never write user-facing text.

| Code | Meaning |
|---|---|
| `invalid` | A field fails its type or length rule; `details.field` names it |
| `name-taken` | A project, task list or tag name is already used (ignoring letter case) |
| `not-found` | A record the action needs doesn't exist |
| `invalid-reference` | A reference points to a missing record or one in another project |
| `archived` | The action would change an archived project or something it owns |
| `session-active` | Another session is already active, or the project can't be archived or deleted while it has one |
| `session-not-active` | The action needs an active session, and there isn't one |
| `closing-notes-missing` | Ending a session, or editing an ended one, without a non-empty `summary` and `nextAction` |
| `import-invalid` | An import file fails validation; `details` says which check failed |
| `storage-failed` | IndexedDB itself failed (e.g. storage full); wraps the original error as `details.cause` |

Unexpected errors (bugs) are not wrapped and should surface as they are. New codes are added here when needed.

## 3. Core data entities

Field-level definitions, rules and the export format are in [DATA_MODEL.md](DATA_MODEL.md).

- **Project:** `id`, `name`, `description`, `archivedAt`, `createdAt`, `updatedAt`.
- **TaskList**: `id`, `projectId`, `name`, `position`, `createdAt`, `updatedAt`.
- **Task:** `id`, `projectId`, `taskListId`, `title`, `status`, `tagIds`, `createdAt`, `updatedAt`.
- **Note**: `id`, `projectId`, `title`, `body`, `tagIds`, `position`, `createdAt`, `updatedAt`.
- **Tag**: `id`, `projectId`, `name`, `createdAt`, `updatedAt`.
- **Widget**: `id`, `projectId`, `type`, `title`, `position`, `config`, `createdAt`, `updatedAt`.
- **WorkSession:** `id`, `projectId`, `startedAt`, `endedAt`, `summary`, `nextAction`, `unresolvedQuestions`.

Each record has a stable unique ID. Everything except Project belongs to a project, and tasks also belong to a task list. Widgets only display content: removing a widget never deletes the content it showed. A session with no `endedAt` is active. **MVP rule:** at most one active session across the application.

The **resume context** is derived from the most recently completed session's summary, next action, and unresolved questions rather than duplicated on the project record.

## 4. Initial repository layout

```text
project-workbench/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── errors.js      # WorkbenchError, shared by all layers
│   ├── ui/            # DOM rendering and events
│   ├── services/      # Use cases and rules
│   └── storage/       # IndexedDB (db.js) and repositories
├── dev/               # Acode preview check page (branch chore/preview-check)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   └── DESIGN_v0.3-1.md
├── CLAUDE.md          # Context for Claude Code sessions
└── README.md
```

Only create modules when a feature actually needs them; no placeholder files.

## 5. Operating constraints

- **Offline-first and single-user.** No accounts, synchronization, or server for the MVP.
- **Local data is separate from GitHub.** Git commits preserve source code, not users' saved projects.
- **Data portability matters.** Acode's preview, a hosted website, and a future desktop wrapper may use different storage origins. Export/import is the planned migration path.
- **Small, reviewable changes.** Develop on feature branches; keep `main` stable. AI implements code, while the human owner approves architectural decisions and tests behaviour in Acode.

## 6. Deferred decisions

Screen layouts, visual design, detailed user flows, validation messages, and specific feature acceptance criteria belong in separate design documentation. Automated testing tools, TypeScript migration, PWA setup, and Electron packaging are postponed until there is a concrete need.
