// Opens the IndexedDB database and runs transactions for the services.
// Layout: docs/DATA_MODEL.md §5. Transaction rules: docs/ARCHITECTURE.md §2.1.

import { ErrorCode, WorkbenchError } from "../errors.js";

const DB_NAME = "project-workbench";

export const STORES = Object.freeze({
  projects: "projects",
  taskLists: "taskLists",
  tasks: "tasks",
  notes: "notes",
  tags: "tags",
  widgets: "widgets",
  workSessions: "workSessions",
});

// One step per database version, run in order. Never change a step once it
// has shipped; add a new one instead (DATA_MODEL.md §5, "Schema changes").
const MIGRATIONS = [
  // Version 1
  (db) => {
    db.createObjectStore(STORES.projects, { keyPath: "id" });

    const taskLists = db.createObjectStore(STORES.taskLists, { keyPath: "id" });
    taskLists.createIndex("byProject", "projectId");

    const tasks = db.createObjectStore(STORES.tasks, { keyPath: "id" });
    tasks.createIndex("byProject", "projectId");
    tasks.createIndex("byTaskList", "taskListId");
    tasks.createIndex("byTag", "tagIds", { multiEntry: true });

    const notes = db.createObjectStore(STORES.notes, { keyPath: "id" });
    notes.createIndex("byProject", "projectId");
    notes.createIndex("byTag", "tagIds", { multiEntry: true });

    for (const name of [STORES.tags, STORES.widgets, STORES.workSessions]) {
      const store = db.createObjectStore(name, { keyPath: "id" });
      store.createIndex("byProject", "projectId");
    }
  },
];

const DB_VERSION = MIGRATIONS.length;

let dbPromise = null;

// Opens the database once and reuses the connection.
//
// Optional handlers let the UI tell the user what's going on, since this
// layer writes no user-facing text:
// - onBlocked: another tab holds an older version open. Opening waits until
//   that tab closes; the UI should ask the user to close the app's other tabs.
// - onVersionChange: another tab is upgrading the database. This connection
//   closes itself so the upgrade isn't stuck; the UI should ask for a reload.
export function openDb({ onBlocked, onVersionChange } = {}) {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      for (let v = event.oldVersion; v < event.newVersion; v++) {
        MIGRATIONS[v](request.result, request.transaction);
      }
    };

    request.onblocked = () => onBlocked?.();

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
        onVersionChange?.();
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(storageFailed("Could not open the database", request.error));
    };
  });

  return dbPromise;
}

// Runs `work(tx)` inside one transaction across `storeNames`.
// Resolves with work's result only after the transaction has completed,
// so a result means the data is saved. If work throws, the transaction is
// aborted (nothing is written) and the same error is rethrown.
//
// Inside work, only await repository calls. Waiting on anything else
// (timers, fetch, the UI) makes IndexedDB close the transaction early.
export async function withTransaction(storeNames, mode, work) {
  const db = await openDb();

  let tx;
  try {
    tx = db.transaction(storeNames, mode);
  } catch (error) {
    throw storageFailed("Could not start a transaction", error);
  }

  const finished = new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
  // Errors are handled below; this stops an early abort from being
  // reported as unhandled before we get there.
  finished.catch(() => {});

  let result;
  try {
    result = await work(tx);
  } catch (error) {
    try {
      tx.abort();
    } catch {
      // Already finished or aborted (e.g. a failed request aborted it).
    }
    throw toWorkbenchError(error);
  }

  try {
    await finished;
  } catch (error) {
    throw storageFailed("The transaction did not complete", error);
  }
  return result;
}

// Wraps one IndexedDB request in a promise. A failed request also aborts
// its transaction, which keeps every action all or nothing.
export function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Asks the browser not to clear the app's data when space runs low.
// Resolves with true if granted. The app works either way.
export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

// IndexedDB failures become storage-failed. WorkbenchErrors pass through,
// and anything else is a bug, which surfaces as it is (ARCHITECTURE.md §2.2).
function toWorkbenchError(error) {
  if (error instanceof DOMException) {
    return storageFailed("A database request failed", error);
  }
  return error;
}

function storageFailed(message, cause) {
  return new WorkbenchError(ErrorCode.STORAGE_FAILED, message, { cause });
}
