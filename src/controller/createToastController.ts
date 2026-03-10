import { resolveToastScope } from "../utils/identity";
import type {
  ToastContentInput,
  ToastController,
  ToastInput,
  ToastIntent,
  ToastLoadingInput,
  ToastPromiseOptions,
  ToastUpdateInput,
  ToastVariantInput,
} from "../types";
import {
  normalizeLoadingInput,
  normalizeShowInput,
  normalizeVariantInput,
  resolvePromiseInput,
} from "./normalizeToastInput";

export type ToastCommand =
  | { type: "show"; input: ToastInput & { id: string } }
  | { type: "update"; id: string; input: ToastUpdateInput }
  | { type: "dismiss"; id: string }
  | { type: "clear" };

type ToastListener = (command: ToastCommand) => void;

const listenersByScope = new Map<string, Set<ToastListener>>();
const pendingCommandsByScope = new Map<string, ToastCommand[]>();
const controllerScopes = new WeakMap<ToastController, string | undefined>();

function createToastId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `toaststar_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getScopeKey(scope?: string): string {
  return resolveToastScope(scope);
}

function getScopedListeners(scopeKey: string): Set<ToastListener> {
  let listeners = listenersByScope.get(scopeKey);

  if (!listeners) {
    listeners = new Set<ToastListener>();
    listenersByScope.set(scopeKey, listeners);
  }

  return listeners;
}

function queuePendingCommand(scopeKey: string, command: ToastCommand): void {
  const queuedCommands = pendingCommandsByScope.get(scopeKey) ?? [];
  queuedCommands.push(command);
  pendingCommandsByScope.set(scopeKey, queuedCommands);
}

function flushPendingCommands(scopeKey: string, listener: ToastListener): void {
  const queuedCommands = pendingCommandsByScope.get(scopeKey);

  if (!queuedCommands?.length) {
    return;
  }

  pendingCommandsByScope.delete(scopeKey);

  for (const command of queuedCommands) {
    listener(command);
  }
}

function emit(scope: string | undefined, command: ToastCommand): void {
  const scopeKey = getScopeKey(scope);
  const listeners = listenersByScope.get(scopeKey);

  if (!listeners || listeners.size === 0) {
    queuePendingCommand(scopeKey, command);
    return;
  }

  for (const listener of listeners) {
    listener(command);
  }
}

function createVariant(
  intent: ToastIntent,
  show: (input: ToastContentInput) => string,
) {
  return (input: ToastVariantInput) => show(normalizeVariantInput(input, intent));
}

export function subscribeToToastCommands(
  listener: ToastListener,
  scope?: string,
): () => void {
  const scopeKey = getScopeKey(scope);
  const listeners = getScopedListeners(scopeKey);
  listeners.add(listener);
  flushPendingCommands(scopeKey, listener);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      listenersByScope.delete(scopeKey);
    }
  };
}

export function createToastController(scope?: string): ToastController {
  const show = (input: ToastContentInput): string => {
    const normalizedInput = normalizeShowInput(input);
    const id = normalizedInput.id ?? createToastId();

    emit(scope, {
      type: "show",
      input: {
        ...normalizedInput,
        id,
      },
    });

    return id;
  };

  const controller: ToastController = {
    show,
    loading(input: ToastLoadingInput): string {
      return show(normalizeLoadingInput(input));
    },
    update(id: string, input: ToastUpdateInput): void {
      emit(scope, { type: "update", id, input });
    },
    promise<T>(
      promiseOrFactory: Promise<T> | (() => Promise<T>),
      options: ToastPromiseOptions<T>,
    ): Promise<T> {
      const id = controller.loading(options.loading);
      const runPromise =
        typeof promiseOrFactory === "function"
          ? Promise.resolve().then(promiseOrFactory)
          : promiseOrFactory;

      return runPromise.then(
        (value) => {
          controller.update(id, resolvePromiseInput(options.success, value, "success"));
          return value;
        },
        (error) => {
          controller.update(id, resolvePromiseInput(options.error, error, "error"));
          throw error;
        },
      );
    },
    success: createVariant("success", show),
    error: createVariant("error", show),
    info: createVariant("info", show),
    warning: createVariant("warning", show),
    dismiss(id: string): void {
      emit(scope, { type: "dismiss", id });
    },
    clear(): void {
      emit(scope, { type: "clear" });
    },
    scope(nextScope: string): ToastController {
      return createToastController(nextScope);
    },
  };

  controllerScopes.set(controller, scope);
  return controller;
}

export function getToastControllerScope(
  controller: ToastController,
): string | undefined {
  return controllerScopes.get(controller);
}
