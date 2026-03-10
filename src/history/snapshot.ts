import type {
  ToastAppearance,
  ToastHistoryImportSource,
  ToastHistoryItem,
  ToastHistorySnapshot,
  ToastIntent,
  ToastThemeName,
} from "../types";
import type { NormalizedToastHistoryOptions } from "./normalizeHistoryOptions";

const VALID_TOAST_THEMES = new Set<ToastThemeName>([
  "glass",
  "midnight",
  "sunset",
  "forest",
  "ocean",
]);
const VALID_TOAST_INTENTS = new Set<ToastIntent>([
  "default",
  "success",
  "error",
  "warning",
  "info",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cloneAppearance(
  value: unknown,
): ToastAppearance | undefined {
  return isRecord(value) ? { ...value } : undefined;
}

function cloneMetadata(
  value: unknown,
): Record<string, unknown> | undefined {
  return isRecord(value) ? { ...value } : undefined;
}

export function normalizeToastHistoryItem(
  value: unknown,
): ToastHistoryItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description =
    typeof value.description === "string" ? value.description : undefined;
  const createdAt =
    typeof value.createdAt === "number" && Number.isFinite(value.createdAt)
      ? value.createdAt
      : undefined;
  const theme =
    typeof value.theme === "string" && VALID_TOAST_THEMES.has(value.theme as ToastThemeName)
      ? (value.theme as ToastThemeName)
      : "glass";
  const intent =
    typeof value.intent === "string" && VALID_TOAST_INTENTS.has(value.intent as ToastIntent)
      ? (value.intent as ToastIntent)
      : "default";

  if (!id || !title || typeof createdAt !== "number") {
    return null;
  }

  return {
    id,
    title,
    description,
    createdAt,
    theme,
    intent,
    appearance: cloneAppearance(value.appearance),
    metadata: cloneMetadata(value.metadata),
  };
}

export function normalizeToastHistoryItems(
  values: readonly unknown[],
  limit = Number.POSITIVE_INFINITY,
): ToastHistoryItem[] {
  const uniqueItems = new Map<string, ToastHistoryItem>();

  for (const value of values) {
    const item = normalizeToastHistoryItem(value);

    if (!item) {
      continue;
    }

    const existingItem = uniqueItems.get(item.id);

    if (!existingItem || existingItem.createdAt < item.createdAt) {
      uniqueItems.set(item.id, item);
    }
  }

  return [...uniqueItems.values()]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, limit);
}

export function parseToastHistoryPayload(
  source: ToastHistoryImportSource | unknown,
  limit = Number.POSITIVE_INFINITY,
): ToastHistoryItem[] {
  if (Array.isArray(source)) {
    return normalizeToastHistoryItems(source, limit);
  }

  if (!isRecord(source)) {
    return [];
  }

  const rawItems = Array.isArray(source.items)
    ? source.items
    : Array.isArray(source.history)
      ? source.history
      : [];

  return normalizeToastHistoryItems(rawItems, limit);
}

export function createToastHistorySnapshot(
  items: readonly ToastHistoryItem[],
  options: Pick<
    NormalizedToastHistoryOptions,
    "databaseName" | "limit" | "namespace" | "storage"
  >,
  scope?: string,
): ToastHistorySnapshot {
  return {
    version: 1,
    exportedAt: Date.now(),
    scope,
    namespace: options.namespace,
    databaseName: options.databaseName,
    storage: options.storage,
    items: normalizeToastHistoryItems(items, options.limit),
  };
}
