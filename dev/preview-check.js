// Runs the module, randomUUID and IndexedDB checks for preview-check.html.
import { greeting } from './preview-check-helper.js';

window.moduleRan = true;
report('ES module import', greeting === 'hello', 'imported value: ' + greeting);

// crypto.randomUUID
try {
  const id = crypto.randomUUID();
  report('crypto.randomUUID()', /^[0-9a-f-]{36}$/.test(id), id);
} catch (err) {
  report('crypto.randomUUID()', false, String(err));
}

// IndexedDB: open, write, read back, and count loads to show data survives a reload.
function checkIndexedDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('indexedDB not available'));
    const open = indexedDB.open('preview-check', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('kv');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('kv', 'readwrite');
      const store = tx.objectStore('kv');
      const get = store.get('loads');
      get.onsuccess = () => {
        const loads = (get.result || 0) + 1;
        store.put(loads, 'loads');
        tx.oncomplete = () => { db.close(); resolve(loads); };
      };
      tx.onerror = () => reject(tx.error);
    };
  });
}

checkIndexedDB().then(
  (loads) => {
    report('IndexedDB read/write', true, 'page loads recorded: ' + loads);
    report('IndexedDB keeps data after reload', loads > 1 ? true : null,
      loads > 1 ? 'yes' : 'reload the page to check');
  },
  (err) => report('IndexedDB read/write', false, String(err))
);
