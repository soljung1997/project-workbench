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

- `docs/ARCHITECTURE.md`: v0.2. Tech decisions, layers, **shared transactions (§2.1)** and **the `WorkbenchError` codes (§2.2)**, entities, repo layout, constraints.
- `docs/DATA_MODEL.md`: v0.4, approved by the owner (2026-11-05). Field definitions, rules, IndexedDB layout and the JSON export format. Follow it exactly; propose changes with **[Proposed]** before implementing them.
- `docs/DESIGN_v0.3-1.md`: design spec v0.3 (draft). Covers product goal, user flow, screens (Dashboard, Project Workspace, Active Work Session, Session History, Data Management), the widget-based workspace, content organization, accessibility rules, and the **MVP acceptance checks** (§7) that define "done".

### Gaps between the design and the data model

The design (v0.3) was ahead of `DATA_MODEL.md` v0.2. The data model has since caught up.

**Owner decision (2026-11-05): where the design and the data model conflict, the data model wins.** These are settled, and the code follows `DATA_MODEL.md`:

- **Session closing notes:** `summary` and `nextAction` are required to end a session (the design's "all optional" is overruled).
- **Editing ended sessions:** typo fixes are allowed, but `summary` and `nextAction` can't be cleared (the design's "read-only" is overruled).
- **Active-session drafts:** the closing fields stay `""` while the session is active (the design's autosaved drafts are overruled).
- **Task status:** `todo` / `doing` / `done` (the design's two-state complete/reopen is overruled).

**Approved (2026-11-05):** `DATA_MODEL.md` v0.3 adds what the design needs and v0.2 didn't cover:

- New entities: TaskList, Note, Tag and Widget (with a type-specific `config`). Tasks gain `taskListId` and `tagIds`.
- Stored order: a `position` field (0, 1, 2… with no gaps) on task lists, notes and widgets.
- New rules: removing a widget keeps its content; deleting a list makes the user choose to move or delete its tasks; removing a tag keeps the tagged content; defaults for a new project.
- Export, import validation and IndexedDB stores extended to match. The database and export versions stay at 1, because nothing has been stored yet.

The design doc's old references to Spck and `PROJECT.md` were fixed on 2026-11-05.

## Architecture in brief

```text
UI (js/ui/) → services (js/services/) → repositories (js/storage/) → IndexedDB
```

- The UI never accesses the database. Services contain no DOM or storage code. Repositories contain no UI logic.
- Services own transactions: `withTransaction(storeNames, mode, work)` in `js/storage/db.js` opens one transaction per action, and every repository method takes `tx` as its first argument. Inside `work`, only await repository calls (an IndexedDB transaction closes on any other waiting). Expected failures throw `WorkbenchError` with a code (`js/errors.js`).
- Entities: Project, TaskList, Task, Note, Tag, Widget, WorkSession. Widgets only display content. Only one active session (`endedAt: null`) is allowed in the whole app.
- Resume context is computed when needed, never stored.

## Working rules

- Work on feature branches and keep `main` stable. Commit or push only when the owner asks.
- The owner approves architecture and data-model decisions, and tests behaviour in the editor. Claude implements.
- Make small, reviewable changes. Only create files when a feature needs them, never placeholders.
- Commit messages use conventional prefixes (`docs:`, `chore:`, `feat:`, `fix:`).

## Current status (2026-11-05)

- Code is a bare skeleton: a minimal `index.html` and empty `css/style.css` and `js/app.js`.
- Acode preview check passed (see "Acode preview" above). The check page is in `dev/` on branch `chore/preview-check`, kept until the MVP is done.
- Docs: `ARCHITECTURE.md` v0.2 (transactions, errors, v0.3 entities), `DATA_MODEL.md` v0.4 (approved; v0.4 adds clarifications on trimming, name comparison, `updatedAt` side effects, collapsing in archived projects, persistent storage and multi-tab handling), `DESIGN_v0.3-1.md` (draft; `DATA_MODEL.md` wins on conflicts).
- Next step: start the storage layer (`js/storage/db.js`, the repositories, and `js/errors.js`), following `DATA_MODEL.md` §5 and `ARCHITECTURE.md` §2.1–2.2.
