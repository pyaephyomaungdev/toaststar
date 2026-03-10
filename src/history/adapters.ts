import type { ToastHistoryItem } from "../types";
import { indexedDbHistoryAdapter } from "./indexeddb";
import { memoryHistoryAdapter, type ToastHistoryAdapter } from "./memory";
import type { NormalizedToastHistoryOptions } from "./normalizeHistoryOptions";

function resolvePrimaryAdapter(
  options: NormalizedToastHistoryOptions,
): ToastHistoryAdapter {
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

export async function clearHistoryItems(
  options: NormalizedToastHistoryOptions,
): Promise<void> {
  if (!options.enabled) {
    return;
  }

  await runWithFallback(options, (adapter) => adapter.clear(options), undefined);
}
