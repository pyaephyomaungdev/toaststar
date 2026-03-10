import type { ToastHistoryItem } from "../types";
import type { ToastHistoryAdapter } from "./memory";
import type { NormalizedToastHistoryOptions } from "./normalizeHistoryOptions";

interface StoredToastHistoryItem extends ToastHistoryItem {
  namespace: string;
}

const DATABASE_VERSION = 3;
const STORE_NAME = "history";
const INDEX_NAMESPACE = "namespace";
const INDEX_NAMESPACE_CREATED_AT = "namespaceCreatedAt";
export const STORED_HISTORY_KEY_PATH: [string, string] = ["namespace", "id"];

export function getStoredHistoryKey(
  namespace: string,
  id: string,
): [string, string] {
  return [namespace, id];
}

function hasCompositeStoreKeyPath(
  keyPath: string | string[] | null,
): keyPath is typeof STORED_HISTORY_KEY_PATH {
  return (
    Array.isArray(keyPath) &&
    keyPath.length === 2 &&
    keyPath[0] === STORED_HISTORY_KEY_PATH[0] &&
    keyPath[1] === STORED_HISTORY_KEY_PATH[1]
  );
}

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined" && typeof IDBKeyRange !== "undefined";
}

function openDatabase(databaseName: string): Promise<IDBDatabase | null> {
  if (!isIndexedDbAvailable()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      const transaction = request.transaction;
      let store: IDBObjectStore;

      if (database.objectStoreNames.contains(STORE_NAME)) {
        const existingStore = transaction?.objectStore(STORE_NAME);

        if (!existingStore) {
          return;
        }

        if (!hasCompositeStoreKeyPath(existingStore.keyPath)) {
          // History is a cache, so it is safe to rebuild the store when the
          // primary key changes to preserve namespace isolation.
          database.deleteObjectStore(STORE_NAME);
          store = database.createObjectStore(STORE_NAME, {
            keyPath: STORED_HISTORY_KEY_PATH,
          });
        } else {
          store = existingStore;
        }
      } else {
        store = database.createObjectStore(STORE_NAME, {
          keyPath: STORED_HISTORY_KEY_PATH,
        });
      }

      if (!store.indexNames.contains(INDEX_NAMESPACE)) {
        store.createIndex(INDEX_NAMESPACE, "namespace", { unique: false });
      }

      if (!store.indexNames.contains(INDEX_NAMESPACE_CREATED_AT)) {
        store.createIndex(INDEX_NAMESPACE_CREATED_AT, ["namespace", "createdAt"], {
          unique: false,
        });
      }
    };

    request.onblocked = () => {
      reject(new Error(`toaststar IndexedDB upgrade blocked for ${databaseName}`));
    };

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
      };
      resolve(database);
    };
  });
}

function readRowsByNamespace(
  database: IDBDatabase,
  namespace: string,
  limit = Number.POSITIVE_INFINITY,
): Promise<StoredToastHistoryItem[]> {
  return new Promise((resolve, reject) => {
    const rows: StoredToastHistoryItem[] = [];
    const transaction = database.transaction(STORE_NAME, "readonly");
    const index = transaction.objectStore(STORE_NAME).index(INDEX_NAMESPACE_CREATED_AT);
    const range = IDBKeyRange.bound([namespace, 0], [namespace, Number.MAX_SAFE_INTEGER]);
    const request = index.openCursor(range, "prev");

    transaction.onerror = () => {
      reject(transaction.error);
    };

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor || rows.length >= limit) {
        resolve(rows);
        return;
      }

      rows.push(cursor.value as StoredToastHistoryItem);
      cursor.continue();
    };
  });
}

function deleteRowsByKey(
  database: IDBDatabase,
  rows: StoredToastHistoryItem[],
): Promise<void> {
  if (rows.length === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    for (const row of rows) {
      store.delete(getStoredHistoryKey(row.namespace, row.id));
    }

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

function putRows(
  database: IDBDatabase,
  options: NormalizedToastHistoryOptions,
  items: ToastHistoryItem[],
): Promise<void> {
  if (items.length === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    for (const item of items) {
      const payload: StoredToastHistoryItem = {
        ...item,
        namespace: options.namespace,
      };
      store.put(payload);
    }

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

async function pruneHistory(
  database: IDBDatabase,
  options: NormalizedToastHistoryOptions,
): Promise<void> {
  const rows = await readRowsByNamespace(database, options.namespace);
  const rowsToDelete = rows.slice(options.limit);

  await deleteRowsByKey(database, rowsToDelete);
}

export const indexedDbHistoryAdapter: ToastHistoryAdapter = {
  async list(options) {
    const database = await openDatabase(options.databaseName);

    if (!database) {
      return [];
    }

    try {
      const rows = await readRowsByNamespace(database, options.namespace, options.limit);
      return rows.map(({ namespace: _namespace, ...row }) => row);
    } finally {
      database.close();
    }
  },
  async save(options, item) {
    const database = await openDatabase(options.databaseName);

    if (!database) {
      return;
    }

    try {
      await putRows(database, options, [item]);

      await pruneHistory(database, options);
    } finally {
      database.close();
    }
  },
  async clear(options) {
    const database = await openDatabase(options.databaseName);

    if (!database) {
      return;
    }

    try {
      const rows = await readRowsByNamespace(database, options.namespace);
      await deleteRowsByKey(database, rows);
    } finally {
      database.close();
    }
  },
  async replace(options, items) {
    const database = await openDatabase(options.databaseName);

    if (!database) {
      return;
    }

    try {
      const rows = await readRowsByNamespace(database, options.namespace);
      await deleteRowsByKey(database, rows);
      await putRows(database, options, items.slice(0, options.limit));
    } finally {
      database.close();
    }
  },
};
