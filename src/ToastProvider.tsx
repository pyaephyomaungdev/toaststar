import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  SWIPE_DISMISS_DISTANCE,
} from "./provider/constants";
import {
  areHistoryItemsEqual,
  clearManagedTimeout,
  clampProgress,
  formatViewportTop,
  getOpenToasts,
  normalizeLimit,
  normalizeUpdateInput,
  resolvePortalTarget,
  toastToHistoryItem,
  type QueuedToastInput,
} from "./provider/utils";
import { useToaststarStyles } from "./styles";
import type {
  ToastActionContextValue,
  ToastCloseReason,
  ToastContentInput,
  ToastController,
  ToastInput,
  ToastProviderProps,
  ToastRecord,
  ToastStateContextValue,
  ToastUpdateInput,
} from "./types";
import { ToastCard } from "./components/ToastCard";
import { ToastErrorBoundary } from "./components/ToastErrorBoundary";
import { useExpandCollapse } from "./hooks/useExpandCollapse";
import { useToastHistoryManager } from "./hooks/useToastHistoryManager";
import { useToastNotifications } from "./hooks/useToastNotifications";
import { useToastAliasing } from "./hooks/useToastAliasing";
import { useBurstDetection } from "./hooks/useBurstDetection";
import { useToastQueue } from "./hooks/useToastQueue";
import { useToastTimers } from "./hooks/useToastTimers";

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
  swipeDismissDistance,
  onToastOpen,
  onToastClose,
  onToastAction,
}: ToastProviderProps) {
  useToaststarStyles();

  // ── Controller & config ─────────────────────────────────────────────
  const toastController = useMemo(
    () => buildLocalController(controller, scope),
    [controller, scope],
  );
  const controllerScope = useMemo(
    () => getToastControllerScope(toastController) ?? scope,
    [scope, toastController],
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

  // ── Core state ──────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [viewportHeight, setViewportHeight] = useState(900);
  const [viewportWidth, setViewportWidth] = useState(400);
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});

  const resolvedSwipeDistance = useMemo(() => {
    if (typeof swipeDismissDistance === "string" && swipeDismissDistance.endsWith("%")) {
      const pct = parseFloat(swipeDismissDistance);

      if (Number.isFinite(pct)) {
        return Math.max(20, (pct / 100) * viewportWidth);
      }
    }

    if (typeof swipeDismissDistance === "number" && Number.isFinite(swipeDismissDistance)) {
      return Math.max(20, swipeDismissDistance);
    }

    return SWIPE_DISMISS_DISTANCE;
  }, [swipeDismissDistance, viewportWidth]);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const toastsRef = useRef<ToastRecord[]>([]);
  const dismissToastRef = useRef<(id: string, reason: ToastCloseReason) => boolean | void>(
    () => false,
  );

  // ── Extracted hooks ─────────────────────────────────────────────────
  const { syncHistoryItem, historyContextValue } = useToastHistoryManager({
    history,
    controllerScope,
  });

  const { notifyOpened, notifyClosed, notifyAction } = useToastNotifications({
    onToastOpen,
    onToastClose,
    onToastAction,
  });

  const { aliasMapRef, resolveToastId, setAlias, deleteAlias, deleteAliasesTo } =
    useToastAliasing();

  const { registerBurstEvent } = useBurstDetection({ burstWindow });

  const {
    timersRef,
    clearToastTracking,
    scheduleDismiss,
    pauseToast,
    resumeToast,
  } = useToastTimers({
    resolveToastId,
    deleteAlias,
    deleteAliasesTo,
    dismissToastRef,
  });

  const {
    pendingQueueRef,
    queueCount,
    syncQueueCount,
    enqueueToast,
    dropQueuedToast,
    updateQueuedToast,
  } = useToastQueue({
    resolvedQueueLimit,
    overflowStrategy,
    resolveToastId,
    deleteAlias,
  });

  // ── Pause / resume wrappers ─────────────────────────────────────────
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

  // ── Expand / collapse (extracted hook) ──────────────────────────────
  const {
    expanded,
    expandedRef,
    expandToastStack,
    collapseToastStack,
    handlePointerEnter,
    handlePointerMove,
    handlePointerDown,
    handlePointerLeave,
  } = useExpandCollapse({
    expandOnHover,
    pauseOnHover,
    pauseAllToasts,
    resumeAllToasts,
  });

  // ── Core helpers ────────────────────────────────────────────────────
  const commitToasts = useCallback((updater: (currentToasts: ToastRecord[]) => ToastRecord[]) => {
    const currentToasts = toastsRef.current;
    const nextToasts = updater(currentToasts);

    if (nextToasts === currentToasts) {
      return nextToasts;
    }

    toastsRef.current = nextToasts;
    setToasts(nextToasts);
    return nextToasts;
  }, []);

  // ── Toast lifecycle (remove, dismiss, evict) ────────────────────────
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

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  function dismissToast(id: string, reason: ToastCloseReason = "dismiss"): boolean {
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
              phase: "closing" as const,
            }
          : toastRecord,
      ),
    );

    const toastExitDuration = existing.exitDuration ?? exitDuration;
    timers.remove = window.setTimeout(() => {
      removeToast(canonicalId);
    }, toastExitDuration);
    timersRef.current.set(canonicalId, timers);
    return true;
  }
  dismissToastRef.current = dismissToast;

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

  // ── Toast update helpers ────────────────────────────────────────────
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
          patch.progress !== undefined ? clampProgress(patch.progress) : toastRecord.progress,
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

  const updateToastFromInput = useCallback(
    (id: string, input: ToastUpdateInput) => {
      if (updateQueuedToast(id, input)) {
        return true;
      }

      const patch = normalizeUpdateInput(input);
      const canonicalId = resolveToastId(id);

      const currentToast = toastsRef.current.find((toastRecord) => toastRecord.id === canonicalId);

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
      timersRef,
      updateQueuedToast,
    ],
  );

  // ── Add toast (core orchestration) ──────────────────────────────────
  const addToast = useCallback(
    (input: QueuedToastInput, fromQueue = false) => {
      if (input.dedupeKey) {
        const queuedDuplicate = pendingQueueRef.current.find(
          (queuedToast) => queuedToast.dedupeKey === input.dedupeKey,
        );

        if (queuedDuplicate) {
          setAlias(input.id, queuedDuplicate.id);

          if (dedupeBehavior === "update") {
            updateQueuedToast(queuedDuplicate.id, input);
          }

          return;
        }

        const existingDuplicate = toastsRef.current.find(
          (toastRecord) =>
            toastRecord.phase !== "closing" && toastRecord.dedupeKey === input.dedupeKey,
        );

        if (existingDuplicate) {
          setAlias(input.id, existingDuplicate.id);

          if (dedupeBehavior === "update") {
            updateToastFromInput(existingDuplicate.id, input);
          } else if (dedupeBehavior === "reset-duration") {
            reorderToastToFront(existingDuplicate.id);

            if (!existingDuplicate.persistent && Number.isFinite(existingDuplicate.duration)) {
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
        !fromQueue && burstCount >= 2 && resolvedBurstMaxVisible > resolvedMaxVisible
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
      }, CENTER_STAGE_DELAY + (nextToast.introDuration ?? introDuration));
      timersRef.current.set(nextToast.id, timers);

      if (!nextToast.persistent && Number.isFinite(nextToast.duration)) {
        const toastIntroDuration = nextToast.introDuration ?? introDuration;
        scheduleDismiss(
          nextToast.id,
          CENTER_STAGE_DELAY + toastIntroDuration + nextToast.duration,
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
      pendingQueueRef,
      registerBurstEvent,
      reorderToastToFront,
      resolvedBurstMaxVisible,
      resolvedMaxVisible,
      scheduleDismiss,
      setAlias,
      syncHistoryItem,
      timersRef,
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
    [notifyAction, resolveToastId],
  );

  // ── Command subscription ────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToToastCommands((command) => {
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
    }, controllerScope);

    return unsubscribe;
  }, [addToast, controllerScope, syncQueueCount, updateToastFromInput]);

  // ── Viewport resize ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateViewport = () => {
      setViewportHeight(window.innerHeight);
      setViewportWidth(window.innerWidth);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport, { passive: true });

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  // ── Portal target ───────────────────────────────────────────────────
  useEffect(() => {
    setPortalNode(resolvePortalTarget(portalTarget));
  }, [portalTarget]);

  // ── Queue drain ─────────────────────────────────────────────────────
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
  }, [addToast, pendingQueueRef, resolvedMaxVisible, syncQueueCount, toasts]);

  // ── Measurement ─────────────────────────────────────────────────────
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
    [collapseToastStack, expandToastStack, expandedRef, resolveToastId],
  );

  // ── Context values ──────────────────────────────────────────────────
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

  const update = useCallback(
    (id: string, input: ToastUpdateInput) => {
      toastController.update(id, input);
    },
    [toastController],
  );

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

  // ── Render ──────────────────────────────────────────────────────────
  let runningOffset = expanded ? expandedOffset : 0;
  const collapsedVisibleCount = Math.max(1, resolvedMaxCollapsed);
  const collapsedStackDepth = Math.min(Math.max(collapsedVisibleCount - 1, 0), 2);
  const layer = headless ? null : (
    <div className="toaststar-layer" aria-live="polite" aria-atomic="false" style={{ zIndex }}>
      {visibleToasts.map((toastRecord, index) => {
        const height = measuredHeights[toastRecord.id] ?? 108;
        const collapsedIndex = Math.min(index, collapsedVisibleCount - 1);
        const collapsedOffset = collapsedIndex * 18;
        const offset = expanded ? runningOffset : collapsedOffset;
        const top = formatViewportTop(position, viewportHeight, height, edgeOffset, offset);
        const scale = expanded ? 1 : Math.max(0.84, 1 - collapsedIndex * 0.055);
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
            top={toastRecord.phase === "center" ? viewportHeight / 2 - height / 2 : top}
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
            introDuration={toastRecord.introDuration ?? introDuration}
            exitDuration={toastRecord.exitDuration ?? exitDuration}
            timer={timersRef.current.get(toastRecord.id)}
            swipeToDismiss={swipeToDismiss}
            swipeDismissDistance={resolvedSwipeDistance}
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
          <ToastErrorBoundary>
            {layer ? (portalNode ? createPortal(layer, portalNode) : layer) : null}
          </ToastErrorBoundary>
        </ToastHistoryContext.Provider>
      </ToastStateContext.Provider>
    </ToastActionsContext.Provider>
  );
}
