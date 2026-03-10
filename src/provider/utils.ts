import type {
  ToastHistoryItem,
  ToastInput,
  ToastProviderProps,
  ToastRecord,
  ToastUpdateInput,
} from "../types";

export interface TimerEntry {
  dock?: number;
  stack?: number;
  close?: number;
  remove?: number;
  remaining?: number;
  closesAt?: number;
  autoCloseDuration?: number;
}

export interface ProgressVisual {
  mode: "off" | "determinate" | "indeterminate";
  value: number;
}

export interface QueuedToastInput extends ToastInput {
  id: string;
}

const DEFAULT_HEIGHT = 108;

export function clearManagedTimeout(timeoutId: number | undefined): void {
  if (typeof timeoutId === "number") {
    window.clearTimeout(timeoutId);
  }
}

export function isToastCardTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    ? Boolean(target.closest("[data-toaststar-card='true']"))
    : false;
}

export function clampProgress(value: number | undefined): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return Math.min(1, Math.max(0, value));
}

export function normalizeLimit(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

export function normalizeUpdateInput(
  input: ToastUpdateInput,
): Partial<Omit<ToastInput, "id" | "createdAt">> {
  if (typeof input === "string") {
    return {
      title: input,
      description: undefined,
      body: undefined,
      action: undefined,
      loading: false,
      progress: undefined,
      showProgress: false,
    };
  }

  return input;
}

export function getOpenToasts(toasts: ToastRecord[]): ToastRecord[] {
  return toasts.filter((toastRecord) => toastRecord.phase !== "closing");
}

export function measureToastHeight(node: HTMLElement): number {
  return Math.ceil(node.getBoundingClientRect().height || node.offsetHeight || DEFAULT_HEIGHT);
}

export function formatViewportTop(
  position: "top" | "bottom",
  viewportHeight: number,
  toastHeight: number,
  edgeOffset: number,
  offset: number,
): number {
  if (position === "top") {
    return edgeOffset + offset;
  }

  return viewportHeight - edgeOffset - toastHeight - offset;
}

export function toastToHistoryItem(toastRecord: ToastRecord): ToastHistoryItem {
  return {
    id: toastRecord.id,
    title: toastRecord.title,
    description: toastRecord.description,
    theme: toastRecord.theme,
    intent: toastRecord.intent,
    createdAt: toastRecord.createdAt,
    appearance: toastRecord.appearance,
    metadata: toastRecord.metadata,
  };
}

export function mergeHistoryItems(
  currentItems: ToastHistoryItem[],
  incomingItems: ToastHistoryItem[],
  limit: number,
): ToastHistoryItem[] {
  const nextItems = [...incomingItems, ...currentItems];
  const uniqueItems = new Map<string, ToastHistoryItem>();

  for (const item of nextItems) {
    const existingItem = uniqueItems.get(item.id);

    if (!existingItem || existingItem.createdAt < item.createdAt) {
      uniqueItems.set(item.id, item);
    }
  }

  return [...uniqueItems.values()]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, limit);
}

export function getToastProgress(
  toastRecord: ToastRecord,
  timer: TimerEntry | undefined,
  now: number,
  defaultShowProgress: boolean,
): ProgressVisual {
  const shouldShowProgress = toastRecord.showProgress ?? defaultShowProgress;

  if (!shouldShowProgress) {
    return {
      mode: "off",
      value: 0,
    };
  }

  const explicitProgress = clampProgress(toastRecord.progress);

  if (typeof explicitProgress === "number") {
    return {
      mode: "determinate",
      value: explicitProgress,
    };
  }

  if (toastRecord.loading) {
    return {
      mode: "indeterminate",
      value: 0,
    };
  }

  if (!timer?.autoCloseDuration || toastRecord.persistent) {
    return {
      mode: "off",
      value: 0,
    };
  }

  const remaining =
    typeof timer.closesAt === "number"
      ? Math.max(0, timer.closesAt - now)
      : timer.remaining ?? timer.autoCloseDuration;

  return {
    mode: "determinate",
    value: clampProgress(1 - remaining / timer.autoCloseDuration) ?? 0,
  };
}

export function resolvePortalTarget(
  target: ToastProviderProps["portalTarget"],
): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  if (target === false) {
    return null;
  }

  if (target == null) {
    return document.body;
  }

  if (typeof target === "string") {
    const resolvedTarget = document.querySelector(target);
    return resolvedTarget instanceof HTMLElement ? resolvedTarget : document.body;
  }

  return target;
}

export function swallowHistoryError(
  error: unknown,
  action: "clear" | "load" | "save",
): void {
  const nodeEnv = (
    globalThis as typeof globalThis & {
      process?: { env?: { NODE_ENV?: string } };
    }
  ).process?.env?.NODE_ENV;

  if (nodeEnv === "production") {
    return;
  }

  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(`toaststar history ${action} failed`, error);
  }
}
