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
import { ToastContext } from "./context/toastContext";
import {
  clearHistoryItems,
  listHistory,
  normalizeHistoryOptions,
  saveHistoryItem,
} from "./history";
import {
  CENTER_STAGE_DELAY,
  DEFAULT_DURATION,
  DEFAULT_EDGE_OFFSET,
  DEFAULT_EXIT_DURATION,
  DEFAULT_EXPANDED_OFFSET,
  DEFAULT_GAP,
  DEFAULT_INTRO_DURATION,
  DEFAULT_MAX_COLLAPSED,
  DEFAULT_MAX_VISIBLE,
  DEFAULT_PROGRESS_TICK,
  DEFAULT_QUEUE_LIMIT,
  DEFAULT_Z_INDEX,
  EXPAND_HOVER_DISTANCE,
} from "./provider/constants";
import {
  clearManagedTimeout,
  clampProgress,
  formatViewportTop,
  getOpenToasts,
  getToastProgress,
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
  ToastCloseReason,
  ToastContentInput,
  ToastContextValue,
  ToastController,
  ToastHistoryItem,
  ToastInput,
  ToastProviderProps,
  ToastRecord,
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
  const [progressNow, setProgressNow] = useState(() => Date.now());
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const timersRef = useRef<Map<string, TimerEntry>>(new Map());
  const toastsRef = useRef<ToastRecord[]>([]);
  const pendingQueueRef = useRef<QueuedToastInput[]>([]);
  const aliasMapRef = useRef<Map<string, string>>(new Map());
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
    startTransition(() => {
      setQueueCount(pendingQueueRef.current.length);
    });
  }, []);

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
      const nextToasts = updater(toastsRef.current);
      toastsRef.current = nextToasts;
      startTransition(() => {
        setToasts(nextToasts);
      });
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

  const removeToast = useCallback(
    (id: string) => {
      const canonicalId = resolveToastId(id);
      clearToastTracking(canonicalId);
      commitToasts((currentToasts) =>
        currentToasts.filter((toastRecord) => toastRecord.id !== canonicalId),
      );
      startTransition(() => {
        setMeasuredHeights((currentHeights) => {
          if (!(canonicalId in currentHeights)) {
            return currentHeights;
          }

          const nextHeights = { ...currentHeights };
          delete nextHeights[canonicalId];
          return nextHeights;
        });
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

      commitToasts((currentToasts) => {
        const targetToast = currentToasts.find((toastRecord) => toastRecord.id === canonicalId);

        if (!targetToast || targetToast.phase === "closing") {
          return currentToasts;
        }

        const updatedToast = mergeToastRecord(targetToast, patch);
        return [
          updatedToast,
          ...currentToasts.filter((toastRecord) => toastRecord.id !== canonicalId),
        ];
      });

      const updatedToast = toastsRef.current.find(
        (toastRecord) => toastRecord.id === canonicalId,
      );

      if (!updatedToast) {
        return false;
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
    [commitToasts, mergeToastRecord, resolveToastId, scheduleDismiss, updateQueuedToast],
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

      const openToasts = getOpenToasts(toastsRef.current);

      if (openToasts.length >= resolvedMaxVisible) {
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
        ...currentToasts.filter((toastRecord) => toastRecord.id !== nextToast.id),
      ]);
      notifyOpened(nextToast);

      if (historyOptions.enabled) {
        const historyItem = toastToHistoryItem(nextToast);
        startTransition(() => {
          setHistoryItems((currentHistory) =>
            mergeHistoryItems(currentHistory, [historyItem], historyOptions.limit),
          );
        });
        void saveHistoryItem(historyOptions, historyItem).catch((error) => {
          swallowHistoryError(error, "save");
        });
      }

      const timers = timersRef.current.get(nextToast.id) ?? {};
      clearManagedTimeout(timers.dock);
      clearManagedTimeout(timers.stack);
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
      historyOptions,
      introDuration,
      notifyOpened,
      overflowStrategy,
      reorderToastToFront,
      resolvedMaxVisible,
      scheduleDismiss,
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

  const hasLiveProgress = useMemo(
    () =>
      toasts.some((toastRecord) => {
        if (toastRecord.phase === "closing") {
          return false;
        }

        const shouldShowProgress = toastRecord.showProgress ?? showProgress;

        if (!shouldShowProgress) {
          return false;
        }

        if (toastRecord.loading || typeof toastRecord.progress === "number") {
          return true;
        }

        const timers = timersRef.current.get(toastRecord.id);
        return Boolean(!toastRecord.persistent && timers?.autoCloseDuration);
      }),
    [showProgress, toasts],
  );

  useEffect(() => {
    if (!hasLiveProgress) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setProgressNow(Date.now());
    }, DEFAULT_PROGRESS_TICK);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasLiveProgress]);

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
    startTransition(() => {
      setMeasuredHeights((currentHeights) => {
        if (currentHeights[id] === height) {
          return currentHeights;
        }

        return {
          ...currentHeights,
          [id]: height,
        };
      });
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

  const visibleToasts = useMemo(
    () => (expanded ? toasts : toasts.slice(0, Math.max(1, maxCollapsed))),
    [expanded, maxCollapsed, toasts],
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

  const contextValue: ToastContextValue = useMemo(
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
      toasts,
      history: historyItems,
      clearHistory,
      position,
    }),
    [
      clearHistory,
      historyItems,
      loading,
      position,
      promise,
      show,
      toastController.clear,
      toastController.dismiss,
      toastController.error,
      toastController.info,
      toastController.success,
      toastController.warning,
      toasts,
      update,
    ],
  );

  let runningOffset = expanded ? expandedOffset : 0;
  const layer = headless ? null : (
    <div
      className="toaststar-layer"
      aria-live="polite"
      aria-atomic="false"
      style={{ zIndex }}
    >
      {visibleToasts.map((toastRecord, index) => {
        const height = measuredHeights[toastRecord.id] ?? 108;
        const collapsedOffset = Math.min(index, maxCollapsed - 1) * 14;
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
          : Math.max(0.82, 0.96 - Math.min(index, maxCollapsed - 1) * 0.05);
        const opacity = expanded
          ? 1
          : index < maxCollapsed
            ? Math.max(0, 1 - Math.min(index, maxCollapsed - 1) * 0.16)
            : 0;
        const interactive =
          (expanded ? true : index === 0) &&
          toastRecord.phase !== "center" &&
          toastRecord.phase !== "docking";
        const stackCount = !expanded && index === 0 ? collapsedCount : 0;
        const progress = getToastProgress(
          toastRecord,
          timersRef.current.get(toastRecord.id),
          progressNow,
          showProgress,
        );
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
            stackCount={stackCount}
            interactive={interactive}
            progress={progress}
            swipeToDismiss={swipeToDismiss}
            onDismiss={dismissToast}
            onAction={handleAction}
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
    <ToastContext.Provider value={contextValue}>
      {children}
      {layer
        ? portalNode
          ? createPortal(layer, portalNode)
          : layer
        : null}
    </ToastContext.Provider>
  );
}
