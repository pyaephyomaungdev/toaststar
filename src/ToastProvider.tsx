import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  createToastController,
  getToastControllerScope,
  subscribeToToastCommands,
  toast,
} from "./controller";
import {
  ToastActionsContext,
  ToastHistoryContext,
  ToastStateContext,
} from "./context/toastContext";
import {
  clearHistoryItems,
  createToastHistorySnapshot,
  listHistory,
  mergeStoredHistoryItems,
  normalizeHistoryOptions,
  parseToastHistoryPayload,
  replaceStoredHistoryItems,
  saveHistoryItem,
} from "./history";
import {
  CENTER_STAGE_DELAY,
  DEFAULT_BURST_WINDOW,
  DEFAULT_DURATION,
  DEFAULT_EDGE_OFFSET,
  DEFAULT_EXIT_DURATION,
  DEFAULT_EXPANDED_OFFSET,
  DEFAULT_GAP,
  DEFAULT_INTRO_DURATION,
  DEFAULT_MAX_COLLAPSED,
  DEFAULT_MAX_VISIBLE,
  DEFAULT_QUEUE_LIMIT,
  DEFAULT_Z_INDEX,
  EXPAND_HOVER_DISTANCE,
} from "./provider/constants";
import {
  areHistoryItemsEqual,
  clearManagedTimeout,
  clampProgress,
  formatViewportTop,
  getOpenToasts,
  isToastCardTarget,
  mergeHistoryItems,
  normalizeLimit,
  normalizeUpdateInput,
  resolvePortalTarget,
  swallowHistoryError,
  toastToHistoryItem,
  type QueuedToastInput,
  type TimerEntry,
} from "./provider/utils";
import { useToaststarStyles } from "./styles";
import type {
  ToastActionContextValue,
  ToastCloseReason,
  ToastContentInput,
  ToastController,
  ToastHistoryImportBehavior,
  ToastHistoryImportSource,
  ToastHistoryContextValue,
  ToastHistoryItem,
  ToastHistoryPostInit,
  ToastInput,
  ToastProviderProps,
  ToastRecord,
  ToastStateContextValue,
  ToastUpdateInput,
} from "./types";
import { ToastCard } from "./components/ToastCard";

function buildLocalController(
  controller: ToastController | undefined,
  scope: string | undefined,
): ToastController {
  if (controller) {
    return controller;
  }

  if (scope) {
    return createToastController(scope);
  }

  return toast;
}

export function ToastProvider({
  children,
  scope,
  controller,
  position = "top",
  defaultDuration = DEFAULT_DURATION,
  introDuration = DEFAULT_INTRO_DURATION,
  exitDuration = DEFAULT_EXIT_DURATION,
  defaultTheme = "glass",
  appearance,
  showProgress = false,
  maxCollapsed = DEFAULT_MAX_COLLAPSED,
  maxVisible = DEFAULT_MAX_VISIBLE,
  burstMaxVisible,
  burstWindow = DEFAULT_BURST_WINDOW,
  queueLimit = DEFAULT_QUEUE_LIMIT,
  overflowStrategy = "queue",
  dedupeBehavior = "ignore",
  gap = DEFAULT_GAP,
  edgeOffset = DEFAULT_EDGE_OFFSET,
  expandedOffset = DEFAULT_EXPANDED_OFFSET,
  expandOnHover = true,
  history,
  zIndex = DEFAULT_Z_INDEX,
  pauseOnHover = true,
  headless = false,
  portalTarget = null,
  swipeToDismiss = true,
  onToastOpen,
  onToastClose,
  onToastAction,
}: ToastProviderProps) {
  useToaststarStyles();

  const toastController = useMemo(
    () => buildLocalController(controller, scope),
    [controller, scope],
  );
  const controllerScope = useMemo(
    () => getToastControllerScope(toastController) ?? scope,
    [scope, toastController],
  );
  const historyOptions = useMemo(
    () => normalizeHistoryOptions(history, controllerScope),
    [controllerScope, history],
  );
  const resolvedMaxVisible = useMemo(
    () => normalizeLimit(maxVisible, DEFAULT_MAX_VISIBLE),
    [maxVisible],
  );
  const resolvedMaxCollapsed = useMemo(
    () => normalizeLimit(maxCollapsed, DEFAULT_MAX_COLLAPSED),
    [maxCollapsed],
  );
  const resolvedBurstMaxVisible = useMemo(() => {
    if (!Number.isFinite(resolvedMaxVisible)) {
      return resolvedMaxVisible;
    }

    if (typeof burstMaxVisible !== "number" || !Number.isFinite(burstMaxVisible)) {
      return resolvedMaxVisible;
    }

    return Math.max(resolvedMaxVisible, Math.floor(burstMaxVisible));
  }, [burstMaxVisible, resolvedMaxVisible]);
  const resolvedQueueLimit = useMemo(
    () => normalizeLimit(queueLimit, DEFAULT_QUEUE_LIMIT),
    [queueLimit],
  );
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [historyItems, setHistoryItems] = useState<ToastHistoryItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(900);
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>(
    {},
  );
  const [queueCount, setQueueCount] = useState(0);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const timersRef = useRef<Map<string, TimerEntry>>(new Map());
  const toastsRef = useRef<ToastRecord[]>([]);
  const pendingQueueRef = useRef<QueuedToastInput[]>([]);
  const aliasMapRef = useRef<Map<string, string>>(new Map());
  const burstEventsRef = useRef<number[]>([]);
  const expandedRef = useRef(false);
  const collapseTimerRef = useRef<number>();
  const hoverIntentRef = useRef({
    blocked: false,
    enteredX: 0,
    enteredY: 0,
  });

  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  const syncQueueCount = useCallback(() => {
    const nextQueueCount = pendingQueueRef.current.length;
    setQueueCount((currentQueueCount) => {
      return currentQueueCount === nextQueueCount
        ? currentQueueCount
        : nextQueueCount;
    });
  }, []);

  const registerBurstEvent = useCallback(() => {
    const now = Date.now();
    const activeEvents = burstEventsRef.current.filter(
      (eventTime) => now - eventTime <= burstWindow,
    );
    activeEvents.push(now);
    burstEventsRef.current = activeEvents;
    return activeEvents.length;
  }, [burstWindow]);

  const resolveToastId = useCallback((id: string): string => {
    let currentId = id;
    const seen = new Set<string>();

    while (!seen.has(currentId) && aliasMapRef.current.has(currentId)) {
      seen.add(currentId);
      currentId = aliasMapRef.current.get(currentId) ?? currentId;
    }

    return currentId;
  }, []);

  const commitToasts = useCallback(
    (updater: (currentToasts: ToastRecord[]) => ToastRecord[]) => {
      const currentToasts = toastsRef.current;
      const nextToasts = updater(currentToasts);

      if (nextToasts === currentToasts) {
        return nextToasts;
      }

      toastsRef.current = nextToasts;
      setToasts(nextToasts);
      return nextToasts;
    },
    [],
  );

  const clearToastTracking = useCallback((id: string) => {
    const timers = timersRef.current.get(id);
    clearManagedTimeout(timers?.dock);
    clearManagedTimeout(timers?.stack);
    clearManagedTimeout(timers?.close);
    clearManagedTimeout(timers?.remove);
    timersRef.current.delete(id);
    aliasMapRef.current.delete(id);

    for (const [key, value] of aliasMapRef.current.entries()) {
      if (value === id) {
        aliasMapRef.current.delete(key);
      }
    }
  }, []);

  const notifyOpened = useCallback(
    (toastRecord: ToastRecord) => {
      toastRecord.onOpen?.(toastRecord.id);
      onToastOpen?.(toastRecord);
    },
    [onToastOpen],
  );

  const notifyClosed = useCallback(
    (toastRecord: ToastRecord, reason: ToastCloseReason) => {
      if (reason === "auto") {
        toastRecord.onAutoClose?.(toastRecord.id);
      }

      toastRecord.onClose?.(toastRecord.id, reason);
      onToastClose?.(toastRecord, reason);
    },
    [onToastClose],
  );

  const notifyAction = useCallback(
    (toastRecord: ToastRecord) => {
      toastRecord.onAction?.(toastRecord.id);
      onToastAction?.(toastRecord);
    },
    [onToastAction],
  );

  const syncHistoryItem = useCallback(
    (toastRecord: ToastRecord) => {
      if (!historyOptions.enabled) {
        return;
      }

      const historyItem = toastToHistoryItem(toastRecord);
      startTransition(() => {
        setHistoryItems((currentHistory) =>
          mergeHistoryItems(currentHistory, [historyItem], historyOptions.limit),
        );
      });
      void saveHistoryItem(historyOptions, historyItem).catch((error) => {
        swallowHistoryError(error, "save");
      });
    },
    [historyOptions],
  );

  const removeToast = useCallback(
    (id: string) => {
      const canonicalId = resolveToastId(id);
      clearToastTracking(canonicalId);
      commitToasts((currentToasts) =>
        currentToasts.filter((toastRecord) => toastRecord.id !== canonicalId),
      );
      setMeasuredHeights((currentHeights) => {
        if (!(canonicalId in currentHeights)) {
          return currentHeights;
        }

        const nextHeights = { ...currentHeights };
        delete nextHeights[canonicalId];
        return nextHeights;
      });
    },
    [clearToastTracking, commitToasts, resolveToastId],
  );

  const dropQueuedToast = useCallback(
    (id: string) => {
      const canonicalId = resolveToastId(id);
      const nextQueue = pendingQueueRef.current.filter(
        (queuedToast) => queuedToast.id !== canonicalId && queuedToast.id !== id,
      );

      if (nextQueue.length === pendingQueueRef.current.length) {
        return false;
      }

      pendingQueueRef.current = nextQueue;
      aliasMapRef.current.delete(id);
      syncQueueCount();
      return true;
    },
    [resolveToastId, syncQueueCount],
  );

  const dismissToast = useCallback(
    (id: string, reason: ToastCloseReason = "dismiss") => {
      const canonicalId = resolveToastId(id);
      const existing = toastsRef.current.find((toastRecord) => toastRecord.id === canonicalId);

      if (!existing) {
        return dropQueuedToast(id);
      }

      if (existing.phase === "closing") {
        return true;
      }

      const timers = timersRef.current.get(canonicalId) ?? {};
      clearManagedTimeout(timers.close);
      clearManagedTimeout(timers.dock);
      clearManagedTimeout(timers.stack);
      clearManagedTimeout(timers.remove);
      timers.close = undefined;
      timers.closesAt = undefined;
      timers.remaining = undefined;

      notifyClosed(existing, reason);
      commitToasts((currentToasts) =>
        currentToasts.map((toastRecord) =>
          toastRecord.id === canonicalId
            ? {
                ...toastRecord,
                phase: "closing",
              }
            : toastRecord,
        ),
      );

      timers.remove = window.setTimeout(() => {
        removeToast(canonicalId);
      }, exitDuration);
      timersRef.current.set(canonicalId, timers);
      return true;
    },
    [commitToasts, dropQueuedToast, exitDuration, notifyClosed, removeToast, resolveToastId],
  );

  const evictToast = useCallback(
    (id: string, reason: ToastCloseReason) => {
      const canonicalId = resolveToastId(id);
      const existing = toastsRef.current.find((toastRecord) => toastRecord.id === canonicalId);

      if (!existing) {
        return;
      }

      notifyClosed(existing, reason);
      removeToast(canonicalId);
    },
    [notifyClosed, removeToast, resolveToastId],
  );

  const scheduleDismiss = useCallback(
    (id: string, delay: number, progressDuration = delay) => {
      const canonicalId = resolveToastId(id);

      if (!Number.isFinite(delay) || delay <= 0) {
        return;
      }

      const timers = timersRef.current.get(canonicalId) ?? {};
      clearManagedTimeout(timers.close);
      timers.remaining = delay;
      timers.closesAt = Date.now() + delay;
      timers.autoCloseDuration = Number.isFinite(progressDuration)
        ? progressDuration
        : delay;
      timers.close = window.setTimeout(() => {
        dismissToast(canonicalId, "auto");
      }, delay);
      timersRef.current.set(canonicalId, timers);
    },
    [dismissToast, resolveToastId],
  );

  const pauseToast = useCallback((id: string) => {
    const canonicalId = resolveToastId(id);
    const timers = timersRef.current.get(canonicalId);

    if (!timers?.close || typeof timers.closesAt !== "number") {
      return;
    }

    clearManagedTimeout(timers.close);
    timers.remaining = Math.max(0, timers.closesAt - Date.now());
    timers.close = undefined;
    timers.closesAt = undefined;
    timersRef.current.set(canonicalId, timers);
  }, [resolveToastId]);

  const resumeToast = useCallback(
    (id: string) => {
      const canonicalId = resolveToastId(id);
      const timers = timersRef.current.get(canonicalId);

      if (!timers?.remaining || timers.remaining <= 0) {
        return;
      }

      scheduleDismiss(
        canonicalId,
        timers.remaining,
        timers.autoCloseDuration ?? timers.remaining,
      );
    },
    [resolveToastId, scheduleDismiss],
  );

  const clearCollapseTimer = useCallback(() => {
    clearManagedTimeout(collapseTimerRef.current);
    collapseTimerRef.current = undefined;
  }, []);

  const queueCollapse = useCallback(() => {
    clearCollapseTimer();
    collapseTimerRef.current = window.setTimeout(() => {
      setExpanded(false);
    }, 140);
  }, [clearCollapseTimer]);

  const pauseAllToasts = useCallback(() => {
    for (const toastRecord of toastsRef.current) {
      pauseToast(toastRecord.id);
    }
  }, [pauseToast]);

  const resumeAllToasts = useCallback(() => {
    for (const toastRecord of toastsRef.current) {
      resumeToast(toastRecord.id);
    }
  }, [resumeToast]);

  const expandToastStack = useCallback(() => {
    clearCollapseTimer();
    hoverIntentRef.current.blocked = false;

    if (!expandedRef.current && pauseOnHover) {
      pauseAllToasts();
    }

    setExpanded(true);
  }, [clearCollapseTimer, pauseAllToasts, pauseOnHover]);

  const collapseToastStack = useCallback(() => {
    clearCollapseTimer();
    hoverIntentRef.current.blocked = false;

    if (!expandedRef.current) {
      return;
    }

    setExpanded(false);

    if (pauseOnHover) {
      resumeAllToasts();
    }
  }, [clearCollapseTimer, pauseOnHover, resumeAllToasts]);

  const mergeToastRecord = useCallback(
    (
      toastRecord: ToastRecord,
      patch: Partial<Omit<ToastInput, "id" | "createdAt">>,
    ): ToastRecord => {
      const nextToast: ToastRecord = {
        ...toastRecord,
        ...patch,
        id: toastRecord.id,
        createdAt: toastRecord.createdAt,
        theme: patch.theme ?? toastRecord.theme ?? defaultTheme,
        intent: patch.intent ?? toastRecord.intent ?? "default",
        closable: patch.closable ?? toastRecord.closable,
        duration: patch.duration ?? toastRecord.duration ?? defaultDuration,
        persistent: patch.persistent ?? toastRecord.persistent,
        loading: patch.loading ?? toastRecord.loading,
        progress:
          patch.progress !== undefined
            ? clampProgress(patch.progress)
            : toastRecord.progress,
      };

      if (nextToast.loading && patch.persistent === undefined) {
        nextToast.persistent = true;
      }

      return nextToast;
    },
    [defaultDuration, defaultTheme],
  );

  const reorderToastToFront = useCallback(
    (id: string) => {
      commitToasts((currentToasts) => {
        const index = currentToasts.findIndex((toastRecord) => toastRecord.id === id);

        if (index <= 0) {
          return currentToasts;
        }

        const nextToasts = currentToasts.slice();
        const [movedToast] = nextToasts.splice(index, 1);
        nextToasts.unshift(movedToast);
        return nextToasts;
      });
    },
    [commitToasts],
  );

  const updateQueuedToast = useCallback(
    (id: string, input: ToastUpdateInput) => {
      const patch = normalizeUpdateInput(input);
      const canonicalId = resolveToastId(id);
      const queueIndex = pendingQueueRef.current.findIndex(
        (queuedToast) => queuedToast.id === canonicalId || queuedToast.id === id,
      );

      if (queueIndex === -1) {
        return false;
      }

      const currentToast = pendingQueueRef.current[queueIndex];
      pendingQueueRef.current[queueIndex] = {
        ...currentToast,
        ...patch,
        id: currentToast.id,
      };
      syncQueueCount();
      return true;
    },
    [resolveToastId, syncQueueCount],
  );

  const updateToastFromInput = useCallback(
    (id: string, input: ToastUpdateInput) => {
      if (updateQueuedToast(id, input)) {
        return true;
      }

      const patch = normalizeUpdateInput(input);
      const canonicalId = resolveToastId(id);

      const currentToast = toastsRef.current.find(
        (toastRecord) => toastRecord.id === canonicalId,
      );

      if (!currentToast || currentToast.phase === "closing") {
        return false;
      }

      const updatedToast = mergeToastRecord(currentToast, patch);
      const previousHistoryItem = toastToHistoryItem(currentToast);
      const nextHistoryItem = toastToHistoryItem(updatedToast);

      commitToasts((currentToasts) => [
        updatedToast,
        ...currentToasts.filter((toastRecord) => toastRecord.id !== canonicalId),
      ]);

      if (!areHistoryItemsEqual(previousHistoryItem, nextHistoryItem)) {
        syncHistoryItem(updatedToast);
      }

      const timers = timersRef.current.get(canonicalId) ?? {};

      if (updatedToast.persistent || !Number.isFinite(updatedToast.duration)) {
        clearManagedTimeout(timers.close);
        timers.close = undefined;
        timers.closesAt = undefined;
        timers.remaining = undefined;
        timers.autoCloseDuration = undefined;
        timersRef.current.set(canonicalId, timers);
      } else {
        scheduleDismiss(canonicalId, updatedToast.duration, updatedToast.duration);
      }

      return true;
    },
    [
      commitToasts,
      mergeToastRecord,
      resolveToastId,
      scheduleDismiss,
      syncHistoryItem,
      updateQueuedToast,
    ],
  );

  const enqueueToast = useCallback(
    (input: QueuedToastInput) => {
      if (resolvedQueueLimit === 0) {
        return false;
      }

      if (pendingQueueRef.current.length >= resolvedQueueLimit) {
        if (overflowStrategy === "drop-oldest") {
          pendingQueueRef.current.shift();
        } else {
          return false;
        }
      }

      pendingQueueRef.current.push(input);
      syncQueueCount();
      return true;
    },
    [overflowStrategy, resolvedQueueLimit, syncQueueCount],
  );

  const addToast = useCallback(
    (input: QueuedToastInput, fromQueue = false) => {
      if (input.dedupeKey) {
        const queuedDuplicate = pendingQueueRef.current.find(
          (queuedToast) => queuedToast.dedupeKey === input.dedupeKey,
        );

        if (queuedDuplicate) {
          aliasMapRef.current.set(input.id, queuedDuplicate.id);

          if (dedupeBehavior === "update") {
            updateQueuedToast(queuedDuplicate.id, input);
          }

          return;
        }

        const existingDuplicate = toastsRef.current.find(
          (toastRecord) =>
            toastRecord.phase !== "closing" &&
            toastRecord.dedupeKey === input.dedupeKey,
        );

        if (existingDuplicate) {
          aliasMapRef.current.set(input.id, existingDuplicate.id);

          if (dedupeBehavior === "update") {
            updateToastFromInput(existingDuplicate.id, input);
          } else if (dedupeBehavior === "reset-duration") {
            reorderToastToFront(existingDuplicate.id);

            if (
              !existingDuplicate.persistent &&
              Number.isFinite(existingDuplicate.duration)
            ) {
              scheduleDismiss(
                existingDuplicate.id,
                existingDuplicate.duration,
                existingDuplicate.duration,
              );
            }
          }

          return;
        }
      }

      const burstCount = fromQueue ? 0 : registerBurstEvent();
      const visibleLimit =
        !fromQueue &&
        burstCount >= 2 &&
        resolvedBurstMaxVisible > resolvedMaxVisible
          ? resolvedBurstMaxVisible
          : resolvedMaxVisible;
      const openToasts = getOpenToasts(toastsRef.current);

      if (openToasts.length >= visibleLimit) {
        if (overflowStrategy === "queue" && !fromQueue) {
          enqueueToast(input);
          return;
        }

        if (overflowStrategy === "drop-newest" && !fromQueue) {
          return;
        }

        const oldestToast = [...openToasts].reverse()[0];

        if (oldestToast) {
          evictToast(oldestToast.id, "overflow");
        }
      }

      const nextToast: ToastRecord = {
        ...input,
        theme: input.theme ?? defaultTheme,
        intent: input.intent ?? "default",
        closable: input.closable ?? true,
        duration: input.duration ?? defaultDuration,
        createdAt: input.createdAt ?? Date.now(),
        persistent: input.persistent ?? false,
        loading: input.loading ?? false,
        progress: clampProgress(input.progress),
        phase: "center",
      };

      if (nextToast.loading && input.persistent === undefined) {
        nextToast.persistent = true;
      }

      commitToasts((currentToasts) => [
        nextToast,
        ...currentToasts
          .filter((toastRecord) => toastRecord.id !== nextToast.id)
          .map<ToastRecord>((toastRecord) =>
            toastRecord.phase === "closing" || toastRecord.phase === "stack"
              ? toastRecord
              : {
                  ...toastRecord,
                  phase: "stack",
                },
          ),
      ]);
      notifyOpened(nextToast);

      syncHistoryItem(nextToast);

      const timers = timersRef.current.get(nextToast.id) ?? {};
      clearManagedTimeout(timers.dock);
      clearManagedTimeout(timers.stack);
      for (const toastRecord of toastsRef.current) {
        if (toastRecord.id === nextToast.id || toastRecord.phase === "closing") {
          continue;
        }

        const siblingTimers = timersRef.current.get(toastRecord.id);
        clearManagedTimeout(siblingTimers?.dock);
        clearManagedTimeout(siblingTimers?.stack);

        if (siblingTimers) {
          siblingTimers.dock = undefined;
          siblingTimers.stack = undefined;
          timersRef.current.set(toastRecord.id, siblingTimers);
        }
      }
      timers.dock = window.setTimeout(() => {
        commitToasts((currentToasts) =>
          currentToasts.map((toastRecord) =>
            toastRecord.id === nextToast.id && toastRecord.phase === "center"
              ? {
                  ...toastRecord,
                  phase: "docking",
                }
              : toastRecord,
          ),
        );
      }, CENTER_STAGE_DELAY);
      timers.stack = window.setTimeout(() => {
        commitToasts((currentToasts) =>
          currentToasts.map((toastRecord) =>
            toastRecord.id === nextToast.id && toastRecord.phase !== "closing"
              ? {
                  ...toastRecord,
                  phase: "stack",
                }
              : toastRecord,
          ),
        );
      }, CENTER_STAGE_DELAY + introDuration);
      timersRef.current.set(nextToast.id, timers);

      if (!nextToast.persistent && Number.isFinite(nextToast.duration)) {
        scheduleDismiss(
          nextToast.id,
          CENTER_STAGE_DELAY + introDuration + nextToast.duration,
          nextToast.duration,
        );
      }
    },
    [
      commitToasts,
      dedupeBehavior,
      defaultDuration,
      defaultTheme,
      enqueueToast,
      evictToast,
      introDuration,
      notifyOpened,
      overflowStrategy,
      registerBurstEvent,
      reorderToastToFront,
      resolvedBurstMaxVisible,
      resolvedMaxVisible,
      scheduleDismiss,
      syncHistoryItem,
      updateQueuedToast,
      updateToastFromInput,
    ],
  );

  const handleAction = useCallback(
    (id: string) => {
      const canonicalId = resolveToastId(id);
      const toastRecord = toastsRef.current.find((item) => item.id === canonicalId);

      if (!toastRecord?.action) {
        return;
      }

      toastRecord.action.onClick();
      notifyAction(toastRecord);

      if (toastRecord.action.dismissOnClick !== false) {
        dismissToast(canonicalId, "action");
      }
    },
    [dismissToast, notifyAction, resolveToastId],
  );

  useEffect(() => {
    const unsubscribe = subscribeToToastCommands(
      (command) => {
        if (command.type === "show") {
          addToast(command.input);
          return;
        }

        if (command.type === "update") {
          updateToastFromInput(command.id, command.input);
          return;
        }

        if (command.type === "dismiss") {
          dismissToast(command.id);
          return;
        }

        pendingQueueRef.current = [];
        syncQueueCount();

        for (const toastRecord of toastsRef.current) {
          dismissToast(toastRecord.id, "clear");
        }
      },
      controllerScope,
    );

    return unsubscribe;
  }, [addToast, controllerScope, dismissToast, syncQueueCount, updateToastFromInput]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateViewport = () => {
      setViewportHeight(window.innerHeight);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport, { passive: true });

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    setPortalNode(resolvePortalTarget(portalTarget));
  }, [portalTarget]);

  useEffect(() => {
    if (!historyOptions.enabled) {
      setHistoryItems([]);
      return;
    }

    let active = true;

    void listHistory(historyOptions)
      .then((items) => {
        if (active) {
          startTransition(() => {
            setHistoryItems((currentHistory) =>
              mergeHistoryItems(currentHistory, items, historyOptions.limit),
            );
          });
        }
      })
      .catch((error) => {
        swallowHistoryError(error, "load");
      });

    return () => {
      active = false;
    };
  }, [historyOptions]);

  useEffect(() => {
    if (!pendingQueueRef.current.length || !Number.isFinite(resolvedMaxVisible)) {
      return;
    }

    let openCount = getOpenToasts(toastsRef.current).length;

    while (openCount < resolvedMaxVisible && pendingQueueRef.current.length > 0) {
      const nextQueuedToast = pendingQueueRef.current.shift();

      if (!nextQueuedToast) {
        break;
      }

      addToast(nextQueuedToast, true);
      openCount = getOpenToasts(toastsRef.current).length;
    }

    syncQueueCount();
  }, [addToast, resolvedMaxVisible, syncQueueCount, toasts]);

  useEffect(() => {
    return () => {
      clearCollapseTimer();

      for (const timers of timersRef.current.values()) {
        clearManagedTimeout(timers.dock);
        clearManagedTimeout(timers.stack);
        clearManagedTimeout(timers.close);
        clearManagedTimeout(timers.remove);
      }

      timersRef.current.clear();
    };
  }, [clearCollapseTimer]);

  const handleMeasure = useCallback((id: string, height: number) => {
    setMeasuredHeights((currentHeights) => {
      if (currentHeights[id] === height) {
        return currentHeights;
      }

      return {
        ...currentHeights,
        [id]: height,
      };
    });
  }, []);

  const handlePointerEnter = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      clearCollapseTimer();
      hoverIntentRef.current.blocked = event.buttons !== 0;
      hoverIntentRef.current.enteredX = event.clientX;
      hoverIntentRef.current.enteredY = event.clientY;

      if (pauseOnHover) {
        pauseAllToasts();
      }
    },
    [clearCollapseTimer, pauseAllToasts, pauseOnHover],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!expandOnHover || expandedRef.current) {
        return;
      }

      if (event.buttons !== 0 || hoverIntentRef.current.blocked) {
        return;
      }

      const deltaX = event.clientX - hoverIntentRef.current.enteredX;
      const deltaY = event.clientY - hoverIntentRef.current.enteredY;

      if (Math.hypot(deltaX, deltaY) < EXPAND_HOVER_DISTANCE) {
        return;
      }

      setExpanded(true);
    },
    [expandOnHover],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      hoverIntentRef.current.blocked = true;
      hoverIntentRef.current.enteredX = event.clientX;
      hoverIntentRef.current.enteredY = event.clientY;
    },
    [],
  );

  const handlePointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isToastCardTarget(event.relatedTarget)) {
        return;
      }

      hoverIntentRef.current.blocked = false;

      if (pauseOnHover) {
        resumeAllToasts();
      }

      if (expandOnHover) {
        queueCollapse();
      }
    },
    [expandOnHover, pauseOnHover, queueCollapse, resumeAllToasts],
  );

  const handleToastPress = useCallback(
    (id: string) => {
      const openToasts = getOpenToasts(toastsRef.current);

      if (!expandedRef.current) {
        if (openToasts.length <= 1) {
          return;
        }

        expandToastStack();
        return;
      }

      const topToast = openToasts[0];

      if (topToast && topToast.id === resolveToastId(id)) {
        collapseToastStack();
      }
    },
    [collapseToastStack, expandToastStack, resolveToastId],
  );

  useEffect(() => {
    if (!expanded || typeof document === "undefined") {
      return;
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (isToastCardTarget(event.target)) {
        return;
      }

      collapseToastStack();
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
    };
  }, [collapseToastStack, expanded]);

  const clearHistory = useCallback(async () => {
    if (!historyOptions.enabled) {
      setHistoryItems([]);
      return;
    }

    try {
      await clearHistoryItems(historyOptions);
      setHistoryItems([]);
    } catch (error) {
      swallowHistoryError(error, "clear");
    }
  }, [historyOptions]);

  const reloadHistory = useCallback(async () => {
    if (!historyOptions.enabled) {
      setHistoryItems([]);
      return [];
    }

    try {
      const items = await listHistory(historyOptions);
      startTransition(() => {
        setHistoryItems(items);
      });
      return items;
    } catch (error) {
      swallowHistoryError(error, "load");
      return historyItems;
    }
  }, [historyItems, historyOptions]);

  const importHistory = useCallback(
    async (
      source: ToastHistoryImportSource,
      behavior: ToastHistoryImportBehavior = "merge",
    ) => {
      const items = parseToastHistoryPayload(source, historyOptions.limit);

      if (!historyOptions.enabled) {
        return items;
      }

      try {
        const nextItems =
          behavior === "replace"
            ? await replaceStoredHistoryItems(historyOptions, items)
            : await mergeStoredHistoryItems(historyOptions, items);

        startTransition(() => {
          setHistoryItems((currentHistory) =>
            behavior === "replace"
              ? nextItems
              : mergeHistoryItems(currentHistory, nextItems, historyOptions.limit),
          );
        });

        return nextItems;
      } catch (error) {
        swallowHistoryError(error, "save");
        return historyItems;
      }
    },
    [historyItems, historyOptions],
  );

  const exportHistory = useCallback(
    () => createToastHistorySnapshot(historyItems, historyOptions, controllerScope),
    [controllerScope, historyItems, historyOptions],
  );

  const postHistory = useCallback(
    async (input: RequestInfo | URL, init?: ToastHistoryPostInit) => {
      if (typeof fetch !== "function") {
        throw new Error("toaststar history post requires fetch support");
      }

      const headers = new Headers(init?.headers);

      if (!headers.has("accept")) {
        headers.set("accept", "application/json");
      }

      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }

      const response = await fetch(input, {
        ...init,
        method: init?.method ?? "POST",
        headers,
        body: JSON.stringify(exportHistory()),
      });

      if (!response.ok) {
        throw new Error(
          `toaststar history post failed: ${response.status} ${response.statusText}`.trim(),
        );
      }

      return response;
    },
    [exportHistory],
  );

  const fetchHistory = useCallback(
    async (
      input: RequestInfo | URL,
      init?: RequestInit,
      behavior: ToastHistoryImportBehavior = "replace",
    ) => {
      if (typeof fetch !== "function") {
        throw new Error("toaststar history fetch requires fetch support");
      }

      const headers = new Headers(init?.headers);

      if (!headers.has("accept")) {
        headers.set("accept", "application/json");
      }

      const response = await fetch(input, {
        ...init,
        headers,
      });

      if (!response.ok) {
        throw new Error(
          `toaststar history fetch failed: ${response.status} ${response.statusText}`.trim(),
        );
      }

      const payload = await response.json();
      return importHistory(payload, behavior);
    },
    [importHistory],
  );

  const visibleToasts = useMemo(
    () => (expanded ? toasts : toasts.slice(0, Math.max(1, resolvedMaxCollapsed))),
    [expanded, resolvedMaxCollapsed, toasts],
  );
  const collapsedCount = useMemo(
    () => Math.max(getOpenToasts(toasts).length - 1 + queueCount, 0),
    [queueCount, toasts],
  );

  const show = useCallback(
    (input: ToastContentInput) => toastController.show(input),
    [toastController],
  );

  const loading = useCallback(
    (input: ToastInput | string) => toastController.loading(input),
    [toastController],
  );

  const update = useCallback((id: string, input: ToastUpdateInput) => {
    toastController.update(id, input);
  }, [toastController]);

  const promise = useCallback(
    <T,>(
      promiseOrFactory: Promise<T> | (() => Promise<T>),
      options: Parameters<typeof toastController.promise<T>>[1],
    ) => toastController.promise(promiseOrFactory, options),
    [toastController],
  );

  const actionsContextValue: ToastActionContextValue = useMemo(
    () => ({
      show,
      notify: show,
      loading,
      update,
      promise,
      success: toastController.success,
      error: toastController.error,
      info: toastController.info,
      warning: toastController.warning,
      dismiss: toastController.dismiss,
      clear: toastController.clear,
    }),
    [
      loading,
      promise,
      show,
      toastController.clear,
      toastController.dismiss,
      toastController.error,
      toastController.info,
      toastController.success,
      toastController.warning,
      update,
    ],
  );
  const stateContextValue: ToastStateContextValue = useMemo(
    () => ({
      toasts,
      position,
    }),
    [position, toasts],
  );
  const historyContextValue: ToastHistoryContextValue = useMemo(
    () => ({
      history: historyItems,
      clearHistory,
      exportHistory,
      reloadHistory,
      importHistory,
      postHistory,
      fetchHistory,
    }),
    [
      clearHistory,
      exportHistory,
      fetchHistory,
      historyItems,
      importHistory,
      postHistory,
      reloadHistory,
    ],
  );

  let runningOffset = expanded ? expandedOffset : 0;
  const collapsedVisibleCount = Math.max(1, resolvedMaxCollapsed);
  const collapsedStackDepth = Math.min(Math.max(collapsedVisibleCount - 1, 0), 2);
  const layer = headless ? null : (
    <div
      className="toaststar-layer"
      aria-live="polite"
      aria-atomic="false"
      style={{ zIndex }}
    >
      {visibleToasts.map((toastRecord, index) => {
        const height = measuredHeights[toastRecord.id] ?? 108;
        const collapsedIndex = Math.min(index, collapsedVisibleCount - 1);
        const collapsedOffset = collapsedIndex * 18;
        const offset = expanded ? runningOffset : collapsedOffset;
        const top = formatViewportTop(
          position,
          viewportHeight,
          height,
          edgeOffset,
          offset,
        );
        const scale = expanded
          ? 1
          : Math.max(0.84, 1 - collapsedIndex * 0.055);
        const opacity = expanded
          ? 1
          : index < collapsedVisibleCount
            ? Math.max(0, 1 - collapsedIndex * 0.12)
            : 0;
        const interactive =
          (expanded ? true : index === 0) &&
          toastRecord.phase !== "center" &&
          toastRecord.phase !== "docking";
        const stackCount = !expanded && index === 0 ? collapsedCount : 0;
        const stackDepth = Math.min(stackCount, collapsedStackDepth);
        const canToggleStack = index === 0 && collapsedCount > 0;
        const nextCard = (
          <ToastCard
            key={toastRecord.id}
            toastRecord={toastRecord}
            top={
              toastRecord.phase === "center"
                ? viewportHeight / 2 - height / 2
                : top
            }
            scale={scale}
            opacity={opacity}
            zIndex={zIndex - index}
            expanded={expanded}
            collapsedIndex={collapsedIndex}
            stackCount={stackCount}
            stackDepth={stackDepth}
            canToggleStack={canToggleStack}
            interactive={interactive}
            defaultShowProgress={showProgress}
            timer={timersRef.current.get(toastRecord.id)}
            swipeToDismiss={swipeToDismiss}
            onDismiss={dismissToast}
            onAction={handleAction}
            onPress={handleToastPress}
            onMeasure={handleMeasure}
            onPointerEnter={handlePointerEnter}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            onPointerLeave={handlePointerLeave}
            providerAppearance={appearance}
          />
        );

        if (expanded) {
          runningOffset += height + gap;
        }

        return nextCard;
      })}
    </div>
  );

  return (
    <ToastActionsContext.Provider value={actionsContextValue}>
      <ToastStateContext.Provider value={stateContextValue}>
        <ToastHistoryContext.Provider value={historyContextValue}>
          {children}
          {layer
            ? portalNode
              ? createPortal(layer, portalNode)
              : layer
            : null}
        </ToastHistoryContext.Provider>
      </ToastStateContext.Provider>
    </ToastActionsContext.Provider>
  );
}
