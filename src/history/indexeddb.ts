import type { ToastHistoryItem } from "../types";
import type { ToastHistoryAdapter } from "./memory";
import type { NormalizedToastHistoryOptions } from "./normalizeHistoryOptions";

interface StoredToastHistoryItem extends ToastHistoryItem {
  namespace: string;
}

const DATABASE_VERSION = 2;
const STORE_NAME = "history";
const INDEX_NAMESPACE = "namespace";
const INDEX_NAMESPACE_CREATED_AT = "namespaceCreatedAt";

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

      const store = database.objectStoreNames.contains(STORE_NAME)
        ? transaction?.objectStore(STORE_NAME)
        : database.createObjectStore(STORE_NAME, { keyPath: "id" });

      if (!store) {
        return;
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

function deleteRowsById(database: IDBDatabase, ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    for (const id of ids) {
      store.delete(id);
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
  const rowsToDelete = rows.slice(options.limit).map((row) => row.id);

  await deleteRowsById(database, rowsToDelete);
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
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const payload: StoredToastHistoryItem = {
          ...item,
          namespace: options.namespace,
        };

        store.put(payload);

        transaction.oncomplete = () => {
          resolve();
        };

        transaction.onerror = () => {
          reject(transaction.error);
        };
      });

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
      await deleteRowsById(
        database,
        rows.map((row) => row.id),
      );
    } finally {
      database.close();
    }
  },
};
