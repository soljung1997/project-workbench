# Project Workbench
**Design Specification | v0.3 (Draft)**

## 1. Product Goal
A lightweight, customizable personal workspace for organizing projects and resuming unfinished work without reconstructing context from memory.

**Design priorities:** Intuitive by default, flexible without becoming a full interface builder, and comfortable on both mobile and desktop.

## 2. Primary User Flow
1. Create a project and open its workspace.
2. Add or organize task lists, tasks, notes, and tags using workspace widgets.
3. Start a work session and optionally record progress, unresolved questions, and a next action.
4. End the session, or leave and return to the active session later.
5. Reopen the project and find the most recently completed session's context.

## 3. Main Screens

### A. Dashboard
**Shows:** Active projects, recent activity, each project's latest recorded next action (when present), and a prominent link to any active work session.

**Actions:** Create/open/edit a project, archive/restore a project, browse archived projects, and open Data Management.

**Empty states:** Explain how to create a first project; do not invent session context for new projects.

### B. Project Workspace
**Shows:** Project name and description plus a customizable collection of widgets. New projects start with useful default widgets: To-Do, Notes, Resume Context, and Session History. A Tags widget can be added as needed.

**Actions:** Start/resume a work session, add/remove/reorder widgets, edit project details, and manage content through each widget.

**Data rule:** The project owns its tasks, task lists, notes, tags, sessions, and widget configuration. Widgets present and organize content; they are not the content itself.

### C. Active Work Session
**Shows:** Project name, start time, elapsed time, and optional fields:
- **Progress summary:** What did I accomplish?
- **Next action:** What should I do first next time?
- **Unresolved questions:** What remains unclear or blocked?

**Actions:** Edit the fields, leave and return, or end the session. All three fields are optional, not validation requirements.

**Rules:** Only one active session exists across the entire app. Starting a second session redirects the user to the current one. Draft fields are saved locally during the session; a refresh or reopen must restore them. Ending a session records its end time and makes its context available to the workspace.

### D. Session History
**Shows:** A project's completed sessions, newest first, with date, duration, and recorded context.

**Actions:** Open a session to read the full record. Completed sessions are read-only in the MVP.

### E. Data Management
**Export:** Download all application data, including workspace configurations, as one versioned JSON backup.

**Import:** Select a backup, validate its format and relationships, preview that existing local data will be replaced, and require confirmation. Invalid files must not change stored data.

## 4. Modular Workspace Design

### Widget model
A **widget** is a reusable interface container. A **task list**, **task**, or **note** is a separate content record, not a subclass of Widget.

Initial widget types:

| Widget | What it contains or displays |
|---|---|
| **To-Do** | Multiple named task lists, each with its own tasks |
| **Notes** | Multiple titled, independently editable notes |
| **Resume Context** | The most recently completed session's saved context |
| **Session History** | A compact view of recent sessions |
| **Tags** | Project-specific tags and filtering controls |

Multiple instances of a widget type are allowed. Each widget can have its own title and display configuration, including which lists or notes it shows. Users can collapse individual task lists and note entries to keep the workspace manageable. A project may contain task lists and notes without currently displaying them in a widget.

### Widget layout
- **Desktop:** Two equal-width columns.
- **Mobile:** One full-width column.
- **Width:** Fixed by the responsive column layout for the MVP.
- **Height:** Grows or shrinks based on content; long lists can be collapsed.
- **Ordering:** Users can move widgets up or down using explicit controls.
- **Placement:** Use predictable row-based ordering. Empty space below a shorter widget is acceptable in the MVP.
- **Future:** Keep widget content separate from its layout configuration so adjustable widths and drag-and-drop can be added later, without rewriting the content widgets.

No manual width or height resizing, arbitrary grid positioning, nested widgets, or widget-building tools in the MVP.

### Removing content versus removing a widget
Removing a widget removes its placement and configuration, **not** the underlying task lists, tasks, notes, tags, or sessions. Hidden content must remain available to display again through a widget.

Deleting an individual task list or note is a separate, explicit action with confirmation where data would be lost. Deleting a task list must not silently delete its tasks. The UI must require an explicit choice about what happens to those tasks.

## 5. Content Organization

### Task lists and tasks
- Each project may contain multiple named task lists (for example, Literature and Programming).
- Each list may contain multiple tasks.
- Users can create, rename, reorder, and delete lists; create/edit/complete/reopen tasks; and move tasks between lists.
- Incomplete tasks appear before completed tasks by default.
- A To-Do widget can display multiple lists, not just one task list.

### Notes
- Each project may contain multiple titled notes (for example, Lecture Notes, Essay Ideas, Reading Journal).
- Notes are independently editable and persist separately from work-session summaries.
- A Notes widget can display multiple notes, with each note expandable for reading or editing.
- Users can create, rename, reorder, and delete notes.

### Tags
- Tags are project-specific labels such as `Literature` or `Lab`.
- Users can create, rename, and remove tags, and assign them to tasks and notes.
- Widget display configuration may filter visible content by tags. Removing a tag must not delete content previously associated with it.

### Resume Context
- Uses the most recently **completed** session for that project, not standalone notes.
- Displays any available progress summary, next action, and unresolved questions with the session date.
- If those fields were left blank, show a neutral empty state rather than making content up.

## 6. Interaction and Accessibility Rules
- Mobile-first, responsive interface with clear navigation back to the Dashboard.
- Useful defaults: recent projects/sessions first; incomplete tasks before completed ones.
- Widget management should be discoverable but not obstruct ordinary work.
- Autosave active-session drafts; preserve data across app reloads.
- Confirm destructive actions and communicate import/export failures clearly.
- Use semantic controls, keyboard-accessible actions, visible focus indicators, readable text, and understandable validation messages.
- Archived projects retain all content and can be restored.

## 7. MVP Acceptance Checks
The MVP is complete when a user can:

1. Create projects, edit them, archive them, and restore them without losing content.
2. Add a To-Do widget containing two or more named lists, each with several manageable tasks.
3. Add a Notes widget containing multiple independently editable titled notes.
4. Add, remove, rename, and reorder widgets; remove a widget and later redisplay its preserved content.
5. Create and assign project-specific tags to tasks and notes, and use them to filter widget content.
6. Start a session, enter optional context, refresh the app, and recover the same active session.
7. End a session and view its saved context in the workspace and chronological session history.
8. Export data and restore it from a valid backup without losing relationships or widget configurations.
9. Complete these flows in Spck's Android preview and in a desktop browser.

## 8. Deferred Features
Accounts, cloud sync, collaboration, calendar integration, notifications, AI features, advanced analytics, custom user-defined widget types, nested widgets, freely draggable layouts, adjustable widget widths, and native desktop integrations.

## 9. Pending Design Work
- Visual design: typography, colors, spacing, icons, and detailed wireframes.
- Final details for list-deletion handling and widget content-selection controls.
- Confirm technical compatibility of the chosen module/storage approach in Spck.

**Related documents:** `PROJECT.md` or the project brief defines purpose; `ARCHITECTURE.md` defines technical layers and storage. Because this revision adds widget, task-list, note, and tag entities, the architecture document should be updated to reflect those models before implementation.
