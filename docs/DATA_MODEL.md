# Project Workbench — Data Model

**Version:** 0.4 (approved)  
**Scope:** MVP  
**Builds on:** [ARCHITECTURE.md](ARCHITECTURE.md) §3 (Core data entities) and §5 (Operating constraints), and [DESIGN_v0.3-1.md](DESIGN_v0.3-1.md) §4–5 (widgets and content organization).

This document defines the exact shape of stored records, the rules that keep them consistent, how they are laid out in IndexedDB, and the JSON backup format. All decisions in this version are approved by the owner (v0.2, then the v0.3 additions for task lists, notes, tags, widgets and stored ordering, and the v0.4 clarifications, all on 2026-11-05). How services and repositories share transactions and report errors is in [ARCHITECTURE.md](ARCHITECTURE.md) §2.1–2.2. New proposals are marked **[Proposed]** until approved.

**Precedence:** where this document and the design spec disagree, this document wins (owner decision, 2026-11-05).

## 1. Shared conventions

- **IDs:** strings created with `crypto.randomUUID()`, e.g. `"3f2b8c1e-…"`. Never reused, never changed. `randomUUID()` only works on secure pages (HTTPS or `localhost`). Acode's preview is one (confirmed 2026-11-05), so no fallback generator is needed.
- **Timestamps:** ISO 8601 strings in UTC, e.g. `"2026-11-04T22:41:00.000Z"` (`new Date().toISOString()`). Readable in exports and sortable as text.
- **Empty values:** optional text fields default to `""`; optional timestamps default to `null`. Fields are never left `undefined` in stored records.
- **Text input:** trimmed at the start and end before saving. Multi-line fields (`Note.body`, `WorkSession.summary`, `nextAction`, `unresolvedQuestions`) are trimmed the same way, only at the very start and end. Lines inside them are never trimmed, so indentation and blank lines are kept. Length limits are measured with JavaScript `.length` after trimming, so some emoji count as 2 characters.
- **Comparing names:** "ignoring letter case" means comparing `name.normalize("NFC").toLowerCase()`. Normalizing first makes an accented letter typed in two different ways (e.g. "é" as one character or as "e" plus an accent) count as the same. The stored name keeps its original spelling and case.
- **`updatedAt` on side effects:** when an action changes a record as a side effect, that record's `updatedAt` is set too. Examples: renumbering `position` after a delete, removing a tag ID from tasks and notes, removing a list or note ID from a widget's `config`, and moving tasks to another list. The exception is Project (§2.1).
- **Ownership:** services create IDs and timestamps; the UI never sets them.
- **Stored order:** records the user can reorder (task lists, notes, widgets) have a `position` field: a whole number starting at `0`, with no gaps or repeats within the same project and record type. Moving an item up or down swaps its `position` with its neighbour's. Creating an item adds it at the end. Deleting an item renumbers the items after it. Each of these changes happens in one transaction.
- **ID lists:** fields that hold IDs of other records (e.g. `tagIds`) are arrays of strings with no repeats. The order inside the array has no meaning unless the field says otherwise.

## 2. Entities

Every field in the tables is present in every record. In the **Required** column, *yes* means the value can't be empty, and *no* means it may be empty: `""` for text, `[]` for lists. Fields that may be `null` show it in their type, e.g. `string | null`.

### 2.1 Project

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | UUID |
| `name` | string | yes | 1–100 characters after trimming; unique across all projects, including archived ones, ignoring letter case |
| `description` | string | no | Default `""`; up to 2,000 characters |
| `archivedAt` | string \| null | yes | `null` = active; timestamp = archived |
| `createdAt` | string | yes | Set once |
| `updatedAt` | string | yes | Set when the project's own fields change (`name`, `description`, `archivedAt`); not changed by edits to the records it owns |

```json
{
  "id": "a1c4…",
  "name": "Garden planner",
  "description": "Plan beds and planting dates.",
  "archivedAt": null,
  "createdAt": "2026-11-04T22:41:00.000Z",
  "updatedAt": "2026-11-04T22:41:00.000Z"
}
```

**New project defaults:** creating a project also creates, in the same transaction:

- one task list named `"Tasks"`;
- four widgets in this order: To-Do (showing the `"Tasks"` list), Notes (showing no notes yet), Resume Context and Session History.

There is no default note or tag.

### 2.2 TaskList

A named group of tasks inside a project (design §5, e.g. "Literature", "Programming").

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | UUID |
| `projectId` | string | yes | Must reference an existing project |
| `name` | string | yes | 1–100 characters after trimming; unique within the project, ignoring letter case |
| `position` | number | yes | Order among the project's task lists (§1 Stored order) |
| `createdAt` | string | yes | Set once |
| `updatedAt` | string | yes | Set when `name` or `position` changes |

### 2.3 Task

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | UUID |
| `projectId` | string | yes | Must reference an existing project |
| `taskListId` | string | yes | Must reference a task list in the same project. Changing it moves the task to another list |
| `title` | string | yes | 1–200 characters after trimming |
| `status` | string | yes | `"todo"`, `"doing"` or `"done"`; new tasks start as `"todo"` |
| `tagIds` | string[] | no | Tags from the same project; default `[]` |
| `createdAt` | string | yes | Set once |
| `updatedAt` | string | yes | Set on every change |

`projectId` is kept on the task even though its list also has one. It allows finding and deleting all of a project's tasks directly, and it must always match the list's `projectId`.

### 2.4 Note

A titled, independently editable piece of text (design §5, e.g. "Lecture Notes", "Reading Journal"). Notes are separate from session summaries.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | UUID |
| `projectId` | string | yes | Must reference an existing project |
| `title` | string | yes | 1–200 characters after trimming; doesn't have to be unique |
| `body` | string | no | Plain text; default `""`; up to 50,000 characters |
| `tagIds` | string[] | no | Tags from the same project; default `[]` |
| `position` | number | yes | Order among the project's notes (§1 Stored order) |
| `createdAt` | string | yes | Set once |
| `updatedAt` | string | yes | Set on every change |

### 2.5 Tag

A project-specific label for tasks and notes (design §5, e.g. `Literature`, `Lab`).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | UUID |
| `projectId` | string | yes | Must reference an existing project |
| `name` | string | yes | 1–50 characters after trimming; unique within the project, ignoring letter case |
| `createdAt` | string | yes | Set once |
| `updatedAt` | string | yes | Set when `name` changes |

Tags aren't manually ordered; they are listed alphabetically (§4).

### 2.6 Widget

A container in the project workspace that displays content (design §4). A widget doesn't own content. It only stores which content to show and how.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | UUID |
| `projectId` | string | yes | Must reference an existing project |
| `type` | string | yes | `"todo"`, `"notes"`, `"resumeContext"`, `"sessionHistory"` or `"tags"`; never changes |
| `title` | string | yes | 1–100 characters after trimming; defaults to the type's name ("To-Do", "Notes", "Resume Context", "Session History", "Tags"); doesn't have to be unique |
| `position` | number | yes | Order among the project's widgets (§1 Stored order) |
| `config` | object | yes | Display settings; its shape depends on `type` (below) |
| `createdAt` | string | yes | Set once |
| `updatedAt` | string | yes | Set on every change |

**`config` by type:**

| Type | `config` | Meaning |
|---|---|---|
| `todo` | `{ "taskListIds": [], "tagIds": [], "collapsedIds": [] }` | `taskListIds`: the lists this widget shows (lists from the same project), displayed in their `position` order. `tagIds`: if not empty, only tasks with **at least one** of these tags are shown. `collapsedIds`: lists shown collapsed (must also be in `taskListIds`) |
| `notes` | `{ "noteIds": [], "tagIds": [], "collapsedIds": [] }` | Same, for notes. `collapsedIds` must also be in `noteIds` |
| `resumeContext` | `{}` | No settings |
| `sessionHistory` | `{}` | No settings; shows the 5 most recent ended sessions |
| `tags` | `{}` | No settings; shows the project's tags and the controls to manage them |

**Not stored:** layout details (column, width, height). The responsive layout decides those (design §4). Keeping `position` and `config` separate from the content records leaves room for adjustable widths or drag-and-drop later, without changing the content records.

### 2.7 WorkSession

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | UUID |
| `projectId` | string | yes | Must reference an existing project |
| `startedAt` | string | yes | Set when the session starts |
| `endedAt` | string \| null | yes | `null` = active |
| `summary` | string | yes, once ended | What was done; `""` while active, non-empty once ended |
| `nextAction` | string | yes, once ended | The first thing to do next time; `""` while active, non-empty once ended |
| `unresolvedQuestions` | string | no | Free text, one question per line; `""` if none |

A session's closing fields (`summary`, `nextAction`, `unresolvedQuestions`) are written when it ends. `summary` and `nextAction` are required to end a session; `unresolvedQuestions` may stay `""`. After that, the session can still be edited to fix typos, but `summary` and `nextAction` can't be cleared, and `startedAt` and `endedAt` stay fixed.

## 3. Rules (enforced by services)

1. **One active session:** at most one session in the whole app has `endedAt: null`. Starting a session while another is active is refused.
2. **Valid time order:** `endedAt` must not be earlier than `startedAt`.
3. **Complete closing notes:** a session can only end with a non-empty `summary` and `nextAction` (after trimming). Ending without them is refused. Edits to an ended session can't clear them.
4. **Cancelling and deleting sessions and tasks:** an active session can be cancelled, which deletes it without saving anything. An ended session or a task can be deleted after the user confirms. All of these remove the record permanently; there is no trash.
5. **Valid references:** a task list, task, note, tag, widget or session's `projectId` must point to an existing project. Every other reference (`taskListId`, `tagIds`, and the IDs in a widget's `config`) must point to an existing record **in the same project**.
6. **Archived projects are read-only:** an archived project and everything it owns (task lists, tasks, notes, tags, widgets and sessions) can't be added to, edited, reordered or deleted. This includes changing task status, starting sessions and editing the project's own fields. The only changes allowed are unarchiving it, deleting the whole project (rule 7), and collapsing or expanding lists and notes in its widgets (the widget's `config.collapsedIds`). Collapsing is a view setting, not content, so it's the one edit allowed and it doesn't count as changing the project. A project with an active session can't be archived until that session ends or is cancelled.
7. **Deleting a project** also deletes everything it owns (task lists, tasks, notes, tags, widgets and sessions) in the same transaction, after the user confirms. Archived projects can be deleted too. A project with an active session can't be deleted until that session ends or is cancelled.
8. **Removing a widget** deletes only the widget record. The task lists, tasks, notes, tags and sessions it displayed are kept and can be shown again by adding them to a widget. No confirmation is needed, because no content is lost.
9. **Deleting a task list** requires the user to choose what happens to its tasks, after confirming:
   - **move** them to another task list in the same project, or
   - **delete** them along with the list.

   If the project has no other list, only "delete" is offered. The list's ID is also removed from every widget's `taskListIds` and `collapsedIds`. Everything happens in one transaction.
10. **Deleting a note** happens after the user confirms. Its ID is removed from every widget's `noteIds` and `collapsedIds` in the same transaction.
11. **Removing a tag** deletes the tag and removes its ID from every task's and note's `tagIds` and every widget's `tagIds` filter, in one transaction. The tasks and notes themselves are kept. No confirmation is needed, because no content is lost.
12. **Adding content from a widget:** a task list created from a To-Do widget is added to that widget's `taskListIds`. A note created from a Notes widget is added to its `noteIds`. Content created elsewhere isn't added to any widget automatically.

## 4. Derived data (computed, never stored)

- **Resume context** for a project: the session with that `projectId`, a non-null `endedAt`, and the latest `endedAt`. Shows its `summary`, `nextAction` and `unresolvedQuestions`. If no session has ended yet, there is no resume context. Because it is computed, deleting the latest ended session automatically falls back to the one before it.
- **Active session:** the single session with `endedAt: null`, if any.
- **Task counts** per status: computed from the project's tasks.
- **Task order:** within a list, tasks that aren't done (`"todo"` or `"doing"`) come before `"done"` tasks (design §5). Within each group, tasks are ordered by `createdAt`, oldest first. There is no manual ordering of tasks in the MVP. The not-done-first grouping is new in v0.3.
- **Tag order:** alphabetical by `name`, ignoring letter case.
- **Session history:** a project's ended sessions, newest `endedAt` first.
- **Last worked on** for a project: the latest `startedAt` among its sessions, if any. Used to sort projects by recent activity.

## 5. IndexedDB layout

- **Database name:** `project-workbench`
- **Database version:** `1`. v0.3 doesn't increase it: no data has been stored with v0.2 yet, so version 1 simply includes all stores below.

| Object store | Key path | Indexes |
|---|---|---|
| `projects` | `id` | — |
| `taskLists` | `id` | `byProject` → `projectId` |
| `tasks` | `id` | `byProject` → `projectId`; `byTaskList` → `taskListId`; `byTag` → `tagIds` (multiEntry) |
| `notes` | `id` | `byProject` → `projectId`; `byTag` → `tagIds` (multiEntry) |
| `tags` | `id` | `byProject` → `projectId` |
| `widgets` | `id` | `byProject` → `projectId` |
| `workSessions` | `id` | `byProject` → `projectId` |

A **multiEntry** index adds one index entry for each ID in the array, so "all tasks with tag X" is a single lookup. It's used when removing a tag (rule 11).

**Note:** IndexedDB leaves records out of an index when the indexed field is `null`, so an index on `endedAt` can't find the active session. For the MVP, the service finds the active session by scanning `workSessions`, which is fast for single-user data volumes.

**Schema changes:** any change to stores or indexes increases the database version and adds a step to the `onupgradeneeded` handler. Steps run in order and never rewrite earlier ones.

**Keeping data safe:**

- **Persistent storage:** at startup, the app calls `navigator.storage.persist()` (if available) so the browser doesn't clear the data when the device runs low on space. If the browser says no, the app still works; the result can be checked with `navigator.storage.persisted()`.
- **Open in two places:** the app may be open in more than one tab or window at once (e.g. Acode's preview and a desktop browser on the same address). Every open connection listens for `versionchange` and closes itself, so a database upgrade in another tab isn't stuck. Opening the database handles `blocked` by telling the user to close the app's other tabs.

## 6. JSON export/import format

```json
{
  "format": "project-workbench-export",
  "schemaVersion": 1,
  "exportedAt": "2026-11-04T22:41:00.000Z",
  "data": {
    "projects": [],
    "taskLists": [],
    "tasks": [],
    "notes": [],
    "tags": [],
    "widgets": [],
    "workSessions": []
  }
}
```

`taskLists`, `notes`, `tags` and `widgets` are added to the export, so a backup includes workspace configuration (design §3E). `schemaVersion` stays `1` for the same reason as the database version.

**Import validation** (the whole file is rejected if any check fails, and nothing is written):

- `format` matches exactly, and `schemaVersion` is supported (older versions are upgraded during import).
- Every record has exactly the fields in §2 (no missing or extra fields), with the right types, and passes the rules in §2 and §3. For widgets, `config` has exactly the fields listed for its `type`.
- Every timestamp is in the `toISOString()` format shown in §1 and is a real date.
- IDs are unique within each list, project names are unique (ignoring letter case), and every `projectId` points to a project in the file.
- Task list and tag names are unique within their project (ignoring letter case). Every `taskListId`, `tagIds` entry and widget `config` ID points to a record in the file **from the same project**. ID arrays have no repeats. `position` values are `0, 1, 2, …` with no gaps or repeats per project and record type.
- At most one session has `endedAt: null`.

**Import behaviour:** replaces all local data in a single transaction, after the user confirms. There is no merge option in the MVP.

`schemaVersion` describes the export file's format and is versioned separately from the IndexedDB database version.

## 7. Open decisions

None. New questions are added here as they come up.
