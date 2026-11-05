# CLAUDE.md — Project Workbench

Context for Claude at the start of a new session. Read this first, then `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.

## What this project is

Project Workbench is a single-user, offline-first browser app. It tracks projects, their tasks, and work sessions, and it shows where you left off ("resume context") using the last finished session's summary, next action and open questions.

## Environment

- **Editor:** Acode on Android (moved from Spck Editor in Nov 2026). Claude Code runs inside Acode's terminal.
- **Repo path:** `/public/project-workbench`; remote `origin` on GitHub; default branch `main`.
- **No build tools:** no npm, no framework, no bundler. Plain HTML/CSS and JavaScript (ES modules) only.
- Not yet confirmed in Acode's preview: whether ES module imports, IndexedDB and `crypto.randomUUID()` work (randomUUID needs a secure page: HTTPS or `localhost`).

## Docs

- `docs/ARCHITECTURE.md`: tech decisions, layers, entities, repo layout, constraints.
- `docs/DATA_MODEL.md`: v0.2, approved by the owner. Field definitions, rules, IndexedDB layout and the JSON export format. Follow it exactly; propose changes with **[Proposed]** before implementing them.

## Architecture in brief

```text
UI (js/ui/) → services (js/services/) → repositories (js/storage/) → IndexedDB
```

- The UI never accesses the database. Services contain no DOM or storage code. Repositories contain no UI logic.
- Entities: Project, Task, WorkSession. Only one active session (`endedAt: null`) is allowed in the whole app.
- Resume context is computed when needed, never stored.

## Working rules

- Work on feature branches and keep `main` stable. Commit or push only when the owner asks.
- The owner approves architecture and data-model decisions, and tests behaviour in the editor. Claude implements.
- Make small, reviewable changes. Only create files when a feature needs them, never placeholders.
- Commit messages use conventional prefixes (`docs:`, `chore:`, `feat:`, `fix:`).

## Current status (2026-11-05)

- Code is a bare skeleton: a minimal `index.html` and empty `css/style.css` and `js/app.js`.
- Branch `docs/data-model`: `DATA_MODEL.md` approved, `ARCHITECTURE.md` updated for Acode, this file added.
- Next step: check what Acode's preview supports (ES modules, IndexedDB, `crypto.randomUUID()`), then start the storage layer.
