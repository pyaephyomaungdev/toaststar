import { resolveHistoryDatabaseName, resolveHistoryNamespace } from "../utils/identity";
import type { ToastHistoryOptions, ToastHistoryStorage } from "../types";

const DEFAULT_LIMIT = 50;

export interface NormalizedToastHistoryOptions {
  enabled: boolean;
  namespace: string;
  limit: number;
  databaseName: string;
  storage: ToastHistoryStorage;
}

export function normalizeHistoryOptions(
  options: boolean | ToastHistoryOptions | undefined,
  scope?: string,
): NormalizedToastHistoryOptions {
  if (!options) {
    return {
      enabled: false,
      namespace: resolveHistoryNamespace(scope),
      limit: DEFAULT_LIMIT,
      databaseName: resolveHistoryDatabaseName(scope),
      storage: "indexeddb",
    };
  }

  if (options === true) {
    return {
      enabled: true,
      namespace: resolveHistoryNamespace(scope),
      limit: DEFAULT_LIMIT,
      databaseName: resolveHistoryDatabaseName(scope),
      storage: "indexeddb",
    };
  }

  return {
    enabled: options.enabled ?? true,
    namespace: options.namespace ?? resolveHistoryNamespace(scope),
    limit: options.limit ?? DEFAULT_LIMIT,
    databaseName: options.databaseName ?? resolveHistoryDatabaseName(scope),
    storage: options.storage ?? "indexeddb",
  };
}
