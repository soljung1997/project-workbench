// Data access for each object store. Every method takes the service's
// transaction as its first argument and never opens its own
// (docs/ARCHITECTURE.md §2.1). Repositories store and fetch records as they
// are; checking them is the services' job.
//
// List results come back in ID order, which has no meaning. Services sort
// them (docs/DATA_MODEL.md §4).

import { STORES, promisifyRequest } from "./db.js";

// Methods every store has.
function baseMethods(storeName) {
  const store = (tx) => tx.objectStore(storeName);
  return {
    // Resolves with the record, or null if there isn't one.
    async get(tx, id) {
      const record = await promisifyRequest(store(tx).get(id));
      return record ?? null;
    },
    getAll(tx) {
      return promisifyRequest(store(tx).getAll());
    },
    // Adds the record, or replaces the one with the same id.
    async put(tx, record) {
      await promisifyRequest(store(tx).put(record));
    },
    async delete(tx, id) {
      await promisifyRequest(store(tx).delete(id));
    },
    // Removes every record in the store (used by import).
    async clear(tx) {
      await promisifyRequest(store(tx).clear());
    },
  };
}

function listByIndex(tx, storeName, indexName, key) {
  const index = tx.objectStore(storeName).index(indexName);
  return promisifyRequest(index.getAll(key));
}

const byProject = (storeName) => (tx, projectId) =>
  listByIndex(tx, storeName, "byProject", projectId);

export const projectRepo = {
  ...baseMethods(STORES.projects),
};

export const taskListRepo = {
  ...baseMethods(STORES.taskLists),
  listByProject: byProject(STORES.taskLists),
};

export const taskRepo = {
  ...baseMethods(STORES.tasks),
  listByProject: byProject(STORES.tasks),
  listByTaskList: (tx, taskListId) =>
    listByIndex(tx, STORES.tasks, "byTaskList", taskListId),
  listByTag: (tx, tagId) => listByIndex(tx, STORES.tasks, "byTag", tagId),
};

export const noteRepo = {
  ...baseMethods(STORES.notes),
  listByProject: byProject(STORES.notes),
  listByTag: (tx, tagId) => listByIndex(tx, STORES.notes, "byTag", tagId),
};

export const tagRepo = {
  ...baseMethods(STORES.tags),
  listByProject: byProject(STORES.tags),
};

export const widgetRepo = {
  ...baseMethods(STORES.widgets),
  listByProject: byProject(STORES.widgets),
};

export const workSessionRepo = {
  ...baseMethods(STORES.workSessions),
  listByProject: byProject(STORES.workSessions),
};
