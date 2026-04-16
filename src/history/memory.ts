import type { ToastHistoryItem } from "../types";
import type { NormalizedToastHistoryOptions } from "./normalizeHistoryOptions";

export interface ToastHistoryAdapter {
  list: (options: NormalizedToastHistoryOptions) => Promise<ToastHistoryItem[]>;
  save: (options: NormalizedToastHistoryOptions, item: ToastHistoryItem) => Promise<void>;
  replace: (options: NormalizedToastHistoryOptions, items: ToastHistoryItem[]) => Promise<void>;
  clear: (options: NormalizedToastHistoryOptions) => Promise<void>;
}

const memoryStore = new Map<string, ToastHistoryItem[]>();

function getStorageKey(options: NormalizedToastHistoryOptions): string {
  return `${options.databaseName}::${options.namespace}`;
}

export const memoryHistoryAdapter: ToastHistoryAdapter = {
  list(options) {
    return Promise.resolve((memoryStore.get(getStorageKey(options)) ?? []).slice(0, options.limit));
  },
  save(options, item) {
    const storageKey = getStorageKey(options);
    const rawItems = memoryStore.get(storageKey) ?? [];
    const existingItems =
      rawItems.length > options.limit * 2 ? rawItems.slice(0, options.limit) : rawItems;
    const nextItems = [item, ...existingItems.filter((entry) => entry.id !== item.id)]
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, options.limit);

    memoryStore.set(storageKey, nextItems);
    return Promise.resolve();
  },
  clear(options) {
    memoryStore.delete(getStorageKey(options));
    return Promise.resolve();
  },
  replace(options, items) {
    memoryStore.set(getStorageKey(options), items.slice(0, options.limit));
    return Promise.resolve();
  },
};
