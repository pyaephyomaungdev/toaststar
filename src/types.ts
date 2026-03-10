import type { CSSProperties, ReactNode } from "react";

export type ToastPosition = "top" | "bottom";
export type ToastIntent = "default" | "success" | "error" | "warning" | "info";
export type ToastThemeName =
  | "glass"
  | "midnight"
  | "sunset"
  | "forest"
  | "ocean";
export type ToastOverflowStrategy = "queue" | "drop-oldest" | "drop-newest";
export type ToastDedupeBehavior = "ignore" | "update" | "reset-duration";
export type ToastHistoryStorage = "indexeddb" | "memory";
export type ToastHistoryImportBehavior = "merge" | "replace";
export type ToastCloseReason =
  | "dismiss"
  | "auto"
  | "clear"
  | "action"
  | "swipe"
  | "dedupe"
  | "overflow";

export interface ToastAppearance {
  radius?: number | string;
  background?: string;
  border?: string;
  color?: string;
  shadow?: string;
  blur?: number | string;
  width?: number | string;
  accent?: string;
  closeButtonBackground?: string;
}

export interface ToastAction {
  label: string;
  onClick: () => void;
  dismissOnClick?: boolean;
}

export interface ToastInput {
  id?: string;
  title: string;
  description?: string;
  body?: ReactNode;
  icon?: ReactNode;
  duration?: number;
  theme?: ToastThemeName;
  appearance?: ToastAppearance;
  closable?: boolean;
  intent?: ToastIntent;
  action?: ToastAction;
  createdAt?: number;
  persistent?: boolean;
  loading?: boolean;
  progress?: number;
  showProgress?: boolean;
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
  onOpen?: (id: string) => void;
  onClose?: (id: string, reason: ToastCloseReason) => void;
  onAutoClose?: (id: string) => void;
  onAction?: (id: string) => void;
}

export type ToastContentInput = string | ToastInput;
export type ToastUpdateInput = string | Partial<Omit<ToastInput, "id" | "createdAt">>;
export type ToastVariantInput = string | Omit<ToastInput, "intent">;
export type ToastLoadingInput = string | Omit<ToastInput, "loading">;
export type ToastPromiseResultInput = string | ToastInput;
export type ToastPromiseResolver<T> =
  | ToastPromiseResultInput
  | ((value: T) => ToastPromiseResultInput);

export interface ToastPromiseOptions<T> {
  loading: ToastContentInput;
  success: ToastPromiseResolver<T>;
  error: ToastPromiseResolver<unknown>;
}

export interface ToastController {
  show: (input: ToastContentInput) => string;
  loading: (input: ToastLoadingInput) => string;
  update: (id: string, input: ToastUpdateInput) => void;
  promise: <T>(
    promiseOrFactory: Promise<T> | (() => Promise<T>),
    options: ToastPromiseOptions<T>,
  ) => Promise<T>;
  success: (input: ToastVariantInput) => string;
  error: (input: ToastVariantInput) => string;
  info: (input: ToastVariantInput) => string;
  warning: (input: ToastVariantInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
  scope: (scope: string) => ToastController;
}

export interface ToastRecord extends ToastInput {
  id: string;
  theme: ToastThemeName;
  intent: ToastIntent;
  closable: boolean;
  duration: number;
  createdAt: number;
  persistent: boolean;
  loading: boolean;
  phase: "center" | "docking" | "stack" | "closing";
}

export interface ToastHistoryItem {
  id: string;
  title: string;
  description?: string;
  theme: ToastThemeName;
  intent: ToastIntent;
  createdAt: number;
  appearance?: ToastAppearance;
  metadata?: Record<string, unknown>;
}

export interface ToastHistoryOptions {
  enabled?: boolean;
  namespace?: string;
  limit?: number;
  databaseName?: string;
  storage?: ToastHistoryStorage;
}

export interface ToastHistorySnapshot {
  version: 1;
  exportedAt: number;
  scope?: string;
  namespace: string;
  databaseName: string;
  storage: ToastHistoryStorage;
  items: ToastHistoryItem[];
}

export type ToastHistoryImportSource =
  | ToastHistoryItem[]
  | ToastHistorySnapshot
  | { items?: ToastHistoryItem[] }
  | { history?: ToastHistoryItem[] };

export interface ToastHistoryPostInit
  extends Omit<RequestInit, "body" | "method"> {
  method?: "POST" | "PUT" | "PATCH";
}

export interface ToastProviderProps {
  children?: ReactNode;
  scope?: string;
  controller?: ToastController;
  position?: ToastPosition;
  defaultDuration?: number;
  introDuration?: number;
  exitDuration?: number;
  defaultTheme?: ToastThemeName;
  appearance?: ToastAppearance;
  showProgress?: boolean;
  maxCollapsed?: number;
  maxVisible?: number;
  burstMaxVisible?: number;
  burstWindow?: number;
  queueLimit?: number;
  overflowStrategy?: ToastOverflowStrategy;
  dedupeBehavior?: ToastDedupeBehavior;
  gap?: number;
  edgeOffset?: number;
  expandedOffset?: number;
  expandOnHover?: boolean;
  history?: boolean | ToastHistoryOptions;
  zIndex?: number;
  pauseOnHover?: boolean;
  headless?: boolean;
  portalTarget?: string | HTMLElement | false | null;
  swipeToDismiss?: boolean;
  onToastOpen?: (toast: ToastRecord) => void;
  onToastClose?: (toast: ToastRecord, reason: ToastCloseReason) => void;
  onToastAction?: (toast: ToastRecord) => void;
}

export interface ToastActionContextValue {
  show: (input: ToastContentInput) => string;
  notify: (input: ToastContentInput) => string;
  loading: (input: ToastLoadingInput) => string;
  update: (id: string, input: ToastUpdateInput) => void;
  promise: <T>(
    promiseOrFactory: Promise<T> | (() => Promise<T>),
    options: ToastPromiseOptions<T>,
  ) => Promise<T>;
  success: (input: ToastVariantInput) => string;
  error: (input: ToastVariantInput) => string;
  info: (input: ToastVariantInput) => string;
  warning: (input: ToastVariantInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export interface ToastStateContextValue {
  toasts: ToastRecord[];
  position: ToastPosition;
}

export interface ToastHistoryContextValue {
  history: ToastHistoryItem[];
  clearHistory: () => Promise<void>;
  exportHistory: () => ToastHistorySnapshot;
  reloadHistory: () => Promise<ToastHistoryItem[]>;
  importHistory: (
    source: ToastHistoryImportSource,
    behavior?: ToastHistoryImportBehavior,
  ) => Promise<ToastHistoryItem[]>;
  postHistory: (
    input: RequestInfo | URL,
    init?: ToastHistoryPostInit,
  ) => Promise<Response>;
  fetchHistory: (
    input: RequestInfo | URL,
    init?: RequestInit,
    behavior?: ToastHistoryImportBehavior,
  ) => Promise<ToastHistoryItem[]>;
}

export interface ToastContextValue
  extends ToastActionContextValue,
    ToastStateContextValue,
    ToastHistoryContextValue {}

export interface ToastHistoryPanelProps {
  title?: string;
  emptyMessage?: string;
  maxItems?: number;
  theme?: ToastThemeName;
  appearance?: ToastAppearance;
  style?: CSSProperties;
  className?: string;
}

export interface ResolvedToastTheme {
  radius: string;
  background: string;
  border: string;
  color: string;
  shadow: string;
  blur: string;
  width: string;
  accent: string;
  closeButtonBackground: string;
}
