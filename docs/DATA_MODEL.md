# Project Workbench — Data Model

**Version:** 0.2 (approved)  
**Scope:** MVP  
**Builds on:** [ARCHITECTURE.md](ARCHITECTURE.md) §3 (Core data entities) and §5 (Operating constraints).

This document defines the exact shape of stored records, the rules that keep them consistent, how they are laid out in IndexedDB, and the JSON backup format. All decisions in this version are approved by the owner. New proposals are marked **[Proposed]** until approved.

## 1. Shared conventions

- **IDs:** strings created with `crypto.randomUUID()`, e.g. `"3f2b8c1e-…"`. Never reused, never changed. `randomUUID()` only works on secure pages (HTTPS or `localhost`); if Acode's preview isn't one, a small fallback generator creates IDs in the same format.
- **Timestamps:** ISO 8601 strings in UTC, e.g. `"2026-11-04T22:41:00.000Z"` (`new Date().toISOString()`). Readable in exports and sortable as text.
- **Empty values:** optional text fields default to `""`; optional timestamps default to `null`. Fields are never left `undefined` in stored records.
- **Text input:** trimmed before saving. Length limits are measured with JavaScript `.length`, so some emoji count as 2 characters.
- **Ownership:** services create IDs and timestamps; the UI never sets them.

## 2. Entities

### 2.1 Project

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | UUID |
| `name` | string | yes | 1–100 characters after trimming; unique across all projects, including archived ones, ignoring letter case |
| `description` | string | no | Default `""`; up to 2,000 characters |
| `archivedAt` | string \| null | yes | `null` = active; timestamp = archived |
| `createdAt` | string | yes | Set once |
| `updatedAt` | string | yes | Set when the project's own fields change (`name`, `description`, `archivedAt`); not changed by edits to its tasks or sessions |

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

### 2.2 Task

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | UUID |
| `projectId` | string | yes | Must reference an existing project |
| `title` | string | yes | 1–200 characters after trimming |
| `status` | string | yes | `"todo"`, `"doing"` or `"done"`; new tasks start as `"todo"` |
| `createdAt` | string | yes | Set once |
| `updatedAt` | string | yes | Set on every change |

### 2.3 WorkSession

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | UUID |
| `projectId` | string | yes | Must reference an existing project |
| `startedAt` | string | yes | Set when the session starts |
| `endedAt` | string \| null | yes | `null` = active |
| `summary` | string | yes | What was done; `""` while active, non-empty once ended |
| `nextAction` | string | yes | The first thing to do next time; `""` while active, non-empty once ended |
| `unresolvedQuestions` | string | yes | Free text, one question per line; `""` if none |

A session's closing fields (`summary`, `nextAction`, `unresolvedQuestions`) are written when it ends. `summary` and `nextAction` are required to end a session; `unresolvedQuestions` may stay `""`. After that, the session can still be edited to fix typos, but `summary` and `nextAction` can't be cleared, and `startedAt` and `endedAt` stay fixed.

## 3. Rules (enforced by services)

1. **One active session:** at most one session in the whole app has `endedAt: null`. Starting a session while another is active is refused.
2. **Valid time order:** `endedAt` must not be earlier than `startedAt`.
3. **Complete closing notes:** a session can only end with a non-empty `summary` and `nextAction` (after trimming). Ending without them is refused. Edits to an ended session can't clear them.
4. **Cancelling and deleting sessions and tasks:** an active session can be cancelled, which deletes it without saving anything. An ended session or a task can be deleted after the user confirms. All of these remove the record permanently; there is no trash.
5. **Valid references:** a task or session's `projectId` must point to an existing project.
6. **Archived projects are read-only:** an archived project and its tasks and sessions can't be added to, edited or deleted. This includes changing task status, starting sessions and editing the project's own fields. The only changes allowed are unarchiving it and deleting the whole project (rule 7). A project with an active session can't be archived until that session ends or is cancelled.
7. **Deleting a project** also deletes its tasks and sessions in the same transaction, after the user confirms. Archived projects can be deleted too. A project with an active session can't be deleted until that session ends or is cancelled.

## 4. Derived data (computed, never stored)

- **Resume context** for a project: the session with that `projectId`, a non-null `endedAt`, and the latest `endedAt`. Shows its `summary`, `nextAction` and `unresolvedQuestions`. If no session has ended yet, there is no resume context. Because it is computed, deleting the latest ended session automatically falls back to the one before it.
- **Active session:** the single session with `endedAt: null`, if any.
- **Task counts** per status: computed from the project's tasks.
- **Task order:** tasks are listed by `createdAt`, oldest first. There is no manual ordering in the MVP.
- **Last worked on** for a project: the latest `startedAt` among its sessions, if any. Used to sort projects by recent activity.

## 5. IndexedDB layout

- **Database name:** `project-workbench`
- **Database version:** `1`

| Object store | Key path | Indexes |
|---|---|---|
| `projects` | `id` | — |
| `tasks` | `id` | `byProject` → `projectId` |
| `workSessions` | `id` | `byProject` → `projectId` |

**Note:** IndexedDB leaves records out of an index when the indexed field is `null`, so an index on `endedAt` can't find the active session. For the MVP, the service finds the active session by scanning `workSessions`, which is fast for single-user data volumes.

**Schema changes:** any change to stores or indexes increases the database version and adds a step to the `onupgradeneeded` handler. Steps run in order and never rewrite earlier ones.

## 6. JSON export/import format

```json
{
  "format": "project-workbench-export",
  "schemaVersion": 1,
  "exportedAt": "2026-11-04T22:41:00.000Z",
  "data": {
    "projects": [],
    "tasks": [],
    "workSessions": []
  }
}
```

**Import validation** (the whole file is rejected if any check fails, and nothing is written):

- `format` matches exactly, and `schemaVersion` is supported (older versions are upgraded during import).
- Every record has exactly the fields in §2 (no missing or extra fields), with the right types, and passes the rules in §2 and §3.
- Every timestamp is in the `toISOString()` format shown in §1 and is a real date.
- IDs are unique within each list, project names are unique (ignoring letter case), and every `projectId` points to a project in the file.
- At most one session has `endedAt: null`.

**Import behaviour:** replaces all local data in a single transaction, after the user confirms. There is no merge option in the MVP.

`schemaVersion` describes the export file's format and is versioned separately from the IndexedDB database version.

## 7. Open decisions

None. New questions are added here as they come up.
