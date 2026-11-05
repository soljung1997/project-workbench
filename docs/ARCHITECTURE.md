# Project Workbench — Architecture

**Version:** 0.1 (draft)  
**Scope:** MVP  
**Principle:** Browser-first, phone-developable, desktop-ready.

## 1. Technical decisions

- **Frontend:** HTML, CSS, and vanilla JavaScript using ES modules.
- **Runtime:** Browser only. No framework, build step, package manager, or backend required for the MVP.
- **Persistence:** IndexedDB, accessed through a small asynchronous repository layer.
- **Backup:** User-triggered JSON export/import, with a version number and validation.
- **Development:** Acode on Android (moved from Spck Editor in Nov 2026), with Claude Code in Acode's terminal; GitHub for source control.
- **Future delivery:** Hosted Progressive Web App (PWA) first; Electron packaging only if desktop-specific features justify it.

**Compatibility checkpoint:** Before implementing features, verify that Acode's HTML preview runs local JavaScript ES module imports and IndexedDB reliably, and whether it is a secure page (HTTPS or `localhost`) so `crypto.randomUUID()` works. If not, adapt the preview approach without changing the product's core architecture.

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
│   ├── ui/            # DOM rendering and events
│   ├── services/      # Use cases and rules
│   └── storage/       # IndexedDB and repositories
├── docs/
│   ├── ARCHITECTURE.md
│   └── DATA_MODEL.md
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
