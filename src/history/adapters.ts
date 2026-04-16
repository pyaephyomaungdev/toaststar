import type { ToastHistoryItem } from "../types";
import { indexedDbHistoryAdapter } from "./indexeddb";
import { memoryHistoryAdapter, type ToastHistoryAdapter } from "./memory";
import type { NormalizedToastHistoryOptions } from "./normalizeHistoryOptions";
import { normalizeToastHistoryItems } from "./snapshot";

function resolvePrimaryAdapter(options: NormalizedToastHistoryOptions): ToastHistoryAdapter {
  return options.storage === "memory" ? memoryHistoryAdapter : indexedDbHistoryAdapter;
}

async function runWithFallback<T>(
  options: NormalizedToastHistoryOptions,
  operation: (adapter: ToastHistoryAdapter) => Promise<T>,
  fallbackValue: T,
): Promise<T> {
  const primaryAdapter = resolvePrimaryAdapter(options);

  try {
    return await operation(primaryAdapter);
  } catch {
    if (primaryAdapter === memoryHistoryAdapter) {
      return fallbackValue;
    }

    return operation(memoryHistoryAdapter);
  }
}

export async function listHistory(
  options: NormalizedToastHistoryOptions,
): Promise<ToastHistoryItem[]> {
  if (!options.enabled) {
    return [];
  }

  return runWithFallback(options, (adapter) => adapter.list(options), []);
}

export async function saveHistoryItem(
  options: NormalizedToastHistoryOptions,
  item: ToastHistoryItem,
): Promise<void> {
  if (!options.enabled) {
    return;
  }

  await runWithFallback(options, (adapter) => adapter.save(options, item), undefined);
}

export async function clearHistoryItems(options: NormalizedToastHistoryOptions): Promise<void> {
  if (!options.enabled) {
    return;
  }

  await runWithFallback(options, (adapter) => adapter.clear(options), undefined);
}

export async function replaceStoredHistoryItems(
  options: NormalizedToastHistoryOptions,
  items: ToastHistoryItem[],
): Promise<ToastHistoryItem[]> {
  if (!options.enabled) {
    return normalizeToastHistoryItems(items, options.limit);
  }

  const normalizedItems = normalizeToastHistoryItems(items, options.limit);

  await runWithFallback(options, (adapter) => adapter.replace(options, normalizedItems), undefined);

  return normalizedItems;
}

export async function mergeStoredHistoryItems(
  options: NormalizedToastHistoryOptions,
  items: ToastHistoryItem[],
): Promise<ToastHistoryItem[]> {
  const incomingItems = normalizeToastHistoryItems(items, options.limit);

  if (!options.enabled) {
    return incomingItems;
  }

  const currentItems = await listHistory(options);
  const nextItems = normalizeToastHistoryItems([...incomingItems, ...currentItems], options.limit);

  await runWithFallback(options, (adapter) => adapter.replace(options, nextItems), undefined);

  return nextItems;
}
