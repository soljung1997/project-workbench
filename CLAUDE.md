# CLAUDE.md — Project Workbench

Context for Claude at the start of a new session. Read this first, then `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md`.

## What this project is

Project Workbench is a single-user, offline-first browser app. It tracks projects, their tasks, and work sessions, and it shows where you left off ("resume context") using the last finished session's summary, next action and open questions.

## Environment

- **Editor:** Acode on Android (moved from Spck Editor in Nov 2026). Claude Code runs inside Acode's terminal.
- **Repo path:** `/public/project-workbench`; remote `origin` on GitHub; default branch `main`.
- **No build tools:** no npm, no framework, no bundler. Plain HTML/CSS and JavaScript (ES modules) only.

## Acode preview (tested 2026-11-05)

`dev/preview-check.html` confirmed that Acode's preview supports everything the MVP needs: it's a secure page (`localhost`), so ES module imports, `crypto.randomUUID()` and IndexedDB all work, and saved data survives reloads and app restarts.

**Port problem:** both preview port settings are 8158, but after Acode is swiped away from recent apps and reopened, the preview starts on **8159**. The cause: a stuck listener keeps holding 8158 (it accepts connections but never replies), probably because Acode's background service survives the swipe. Force stopping Acode frees the port.

- The browser keeps IndexedDB data separately for each address, so `localhost:8158` and `localhost:8159` have **separate data**. A port change makes saved data seem to disappear.
- **Routine:** the owner force stops Acode at the end of each session, which keeps the preview on 8158.
- If the preview shows 8159: force stop Acode, reopen it, and start the preview again.
- To check from the terminal: `curl -s -m 3 -o /dev/null -w "%{http_code}\n" http://localhost:8158/` returns `200` while the preview is open on 8158. It returns `000` both when nothing is running and when 8158 is stuck. To tell those apart, run `curl -v`: "Connected" followed by a timeout means stuck.
- Use JSON export/import to move real data between the two ports.
- Acode adds its own console scripts and a viewport tag to served pages. App code must not depend on them.

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
- Acode preview check passed (see "Acode preview" above). `dev/` holds the check page. It is not committed yet; branch `chore/preview-check` (from `main`) was created for it.
- Next step: start the storage layer.
