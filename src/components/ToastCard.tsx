import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { resolveToastTheme } from "../themes";
import type {
  ToastCloseReason,
  ToastProviderProps,
  ToastRecord,
} from "../types";
import { DefaultToastIcon } from "./DefaultToastIcon";
import {
  CENTER_SCALE,
  DEFAULT_PROGRESS_TICK,
  SWIPE_DISMISS_DISTANCE,
} from "../provider/constants";
import {
  getToastProgress,
  measureToastHeight,
  type TimerEntry,
} from "../provider/utils";

function getDescriptionOverflowMode(description: string | undefined): "single-line" | "multi-line" {
  if (!description) {
    return "multi-line";
  }

  const tokens = description.trim().split(/\s+/);
  const hasLongToken = tokens.some((token) => token.length >= 24);
  const looksLikeUrl = /^https?:\/\//i.test(description.trim());

  return hasLongToken || looksLikeUrl ? "single-line" : "multi-line";
}

export const ToastCard = memo(function ToastCard(props: {
  toastRecord: ToastRecord;
  top: number;
  scale: number;
  opacity: number;
  zIndex: number;
  expanded: boolean;
  collapsedIndex: number;
  stackCount: number;
  stackDepth: number;
  canToggleStack: boolean;
  interactive: boolean;
  defaultShowProgress: boolean;
  timer: TimerEntry | undefined;
  swipeToDismiss: boolean;
  onDismiss: (id: string, reason?: ToastCloseReason) => void;
  onAction: (id: string) => void;
  onPress: (id: string) => void;
  onMeasure: (id: string, height: number) => void;
  onPointerEnter: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerLeave: (event: ReactPointerEvent<HTMLDivElement>) => void;
  providerAppearance: ToastProviderProps["appearance"];
}) {
  const {
    toastRecord,
    top,
    scale,
    opacity,
    zIndex,
    expanded,
    collapsedIndex,
    stackCount,
    stackDepth,
    canToggleStack,
    interactive,
    defaultShowProgress,
    timer,
    swipeToDismiss,
    onDismiss,
    onAction,
    onPress,
    onMeasure,
    onPointerEnter,
    onPointerMove,
    onPointerDown,
    onPointerLeave,
    providerAppearance,
  } = props;
  const ref = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({
    pointerId: -1,
    pointerType: "",
    startX: 0,
    startY: 0,
    offset: 0,
    dragging: false,
    moved: false,
  });
  const [dragOffset, setDragOffset] = useState(0);
  const [progressNow, setProgressNow] = useState(() => Date.now());

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return;
    }

    onMeasure(toastRecord.id, measureToastHeight(node));

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      onMeasure(toastRecord.id, measureToastHeight(entry.target as HTMLElement));
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [onMeasure, toastRecord.id]);

  const theme = useMemo(
    () =>
      resolveToastTheme(
        toastRecord.theme,
        toastRecord.intent,
        providerAppearance,
        toastRecord.appearance,
      ),
    [
      providerAppearance,
      toastRecord.appearance,
      toastRecord.intent,
      toastRecord.theme,
    ],
  );
  const shouldTickProgress = Boolean(
    (toastRecord.showProgress ?? defaultShowProgress) &&
    !toastRecord.loading &&
    typeof toastRecord.progress !== "number" &&
    !toastRecord.persistent &&
    timer?.autoCloseDuration,
  );

  useEffect(() => {
    if (!shouldTickProgress) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setProgressNow(Date.now());
    }, DEFAULT_PROGRESS_TICK);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [shouldTickProgress]);

  const progress = useMemo(
    () => getToastProgress(toastRecord, timer, progressNow, defaultShowProgress),
    [defaultShowProgress, progressNow, timer, toastRecord],
  );

  const transformScale =
    toastRecord.phase === "center" || toastRecord.phase === "docking"
      ? CENTER_SCALE
      : toastRecord.phase === "closing"
        ? Math.max(scale - 0.04, 0.84)
        : scale;
  const dragRotation = dragOffset === 0 ? 0 : dragOffset * 0.02;
  const composedOpacity = Math.max(
    0,
    opacity - Math.min(Math.abs(dragOffset) / 240, 0.42),
  );
  const transform = `translate3d(calc(-50% + ${Math.round(dragOffset)}px), 0, 0) scale(${transformScale}) rotate(${dragRotation}deg)`;
  const showCloseButton =
    toastRecord.closable &&
    (toastRecord.phase === "stack" || toastRecord.phase === "closing");
  const showProgress =
    progress.mode !== "off" &&
    toastRecord.phase !== "center" &&
    toastRecord.phase !== "docking";
  const hasCustomBody = toastRecord.body !== undefined && toastRecord.body !== null;
  const descriptionOverflowMode = getDescriptionOverflowMode(toastRecord.description);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerDown(event);

      if (
        !interactive ||
        (event.pointerType !== "touch" && event.pointerType !== "pen") ||
        (event.target !== event.currentTarget &&
          isInteractiveElementTarget(event.target))
      ) {
        return;
      }

      dragStateRef.current = {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        offset: 0,
        dragging: true,
        moved: false,
      };
      ref.current?.setPointerCapture?.(event.pointerId);
    },
    [interactive, onPointerDown],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (
        !canToggleStack ||
        (event.target !== event.currentTarget && isInteractiveElementTarget(event.target))
      ) {
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onPress(toastRecord.id);
        return;
      }

      if (event.key === "Escape" && expanded) {
        event.preventDefault();
        onPress(toastRecord.id);
      }
    },
    [canToggleStack, expanded, onPress, toastRecord.id],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerMove(event);

      const dragState = dragStateRef.current;

      if (!dragState.dragging || dragState.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      if (Math.hypot(deltaX, deltaY) >= 8) {
        dragState.moved = true;
      }

      if (!swipeToDismiss) {
        return;
      }

      if (Math.abs(deltaX) < 6 || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      dragState.offset = deltaX;
      setDragOffset(deltaX);
    },
    [onPointerMove, swipeToDismiss],
  );

  const releaseDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
      const dragState = dragStateRef.current;

      if (!dragState.dragging || dragState.pointerId !== event.pointerId) {
        return;
      }

      const shouldDismiss =
        !cancelled &&
        swipeToDismiss &&
        Math.abs(dragState.offset) >= SWIPE_DISMISS_DISTANCE;
      const shouldPress =
        !cancelled &&
        !dragState.moved &&
        dragState.pointerType !== "mouse" &&
        Math.abs(dragState.offset) < 6;

      dragState.dragging = false;
      dragState.pointerId = -1;
      dragState.pointerType = "";
      dragState.moved = false;
      ref.current?.releasePointerCapture?.(event.pointerId);

      if (shouldDismiss) {
        const dismissOffset = Math.sign(dragState.offset || 1) * getSwipeExitOffset();
        dragState.offset = dismissOffset;
        setDragOffset(dismissOffset);
        onDismiss(toastRecord.id, "swipe");
        return;
      }

      dragState.offset = 0;
      setDragOffset(0);

      if (shouldPress) {
        onPress(toastRecord.id);
      }
    },
    [onDismiss, onPress, swipeToDismiss, toastRecord.id],
  );

  return (
    <div
      ref={ref}
      className="toaststar-toast"
      data-toaststar-card="true"
      data-phase={toastRecord.phase}
      data-expanded={expanded ? "true" : "false"}
      data-collapsed-index={String(collapsedIndex)}
      data-has-stack={stackCount > 0 ? "true" : "false"}
      data-stack-depth={String(stackDepth)}
      data-compact={
        hasCustomBody || toastRecord.description || toastRecord.action
          ? "false"
          : "true"
      }
      data-custom-body={hasCustomBody ? "true" : "false"}
      data-loading={toastRecord.loading ? "true" : "false"}
      data-swiping={dragOffset !== 0 ? "true" : "false"}
      role={canToggleStack ? "button" : undefined}
      tabIndex={canToggleStack ? 0 : undefined}
      aria-expanded={canToggleStack ? (expanded ? "true" : "false") : undefined}
      aria-label={
        canToggleStack
          ? `${expanded ? "Collapse" : "Expand"} notification stack: ${toastRecord.title}`
          : undefined
      }
      onPointerEnter={interactive ? onPointerEnter : undefined}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerDown={interactive ? handlePointerDown : undefined}
      onPointerLeave={interactive ? onPointerLeave : undefined}
      onPointerUp={interactive ? releaseDrag : undefined}
      onPointerCancel={interactive ? (event) => releaseDrag(event, true) : undefined}
      onKeyDown={canToggleStack ? handleKeyDown : undefined}
      style={{
        top,
        zIndex,
        opacity: composedOpacity,
        pointerEvents: interactive ? "auto" : "none",
        transform,
        ["--toaststar-radius" as string]: theme.radius,
        ["--toaststar-background" as string]: theme.background,
        ["--toaststar-border" as string]: theme.border,
        ["--toaststar-color" as string]: theme.color,
        ["--toaststar-shadow" as string]: theme.shadow,
        ["--toaststar-blur" as string]: theme.blur,
        ["--toaststar-width" as string]: theme.width,
        ["--toaststar-accent" as string]: theme.accent,
        ["--toaststar-close-background" as string]:
          theme.closeButtonBackground,
      }}
    >
      <span className="toaststar-icon-slot" aria-hidden="true">
        <span className="toaststar-icon-frame">
          {toastRecord.icon ? (
            <span className="toaststar-custom-icon">{toastRecord.icon}</span>
          ) : (
            <span className="toaststar-default-icon">
              <DefaultToastIcon intent={toastRecord.intent} />
            </span>
          )}
        </span>
      </span>
      <div className="toaststar-body">
        {hasCustomBody ? (
          <div className="toaststar-custom-body">{toastRecord.body}</div>
        ) : (
          <>
            <div className="toaststar-title-row">
              <div className="toaststar-title">{toastRecord.title}</div>
            </div>
            {toastRecord.description ? (
              <div
                className="toaststar-description"
                data-overflow-mode={descriptionOverflowMode}
              >
                {toastRecord.description}
              </div>
            ) : null}
            {toastRecord.action ? (
              <div className="toaststar-actions">
                <button
                  type="button"
                  className="toaststar-action"
                  onClick={() => onAction(toastRecord.id)}
                >
                  {toastRecord.action.label}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
      <div className="toaststar-chrome">
        {showCloseButton ? (
          <button
            type="button"
            aria-label="Close notification"
            className="toaststar-close"
            onClick={() => onDismiss(toastRecord.id, "dismiss")}
          >
            ×
          </button>
        ) : (
          <div className="toaststar-close-slot" aria-hidden="true" />
        )}
      </div>
      {showProgress ? (
        <div className="toaststar-progress" data-mode={progress.mode}>
          <span
            className="toaststar-progress-fill"
            style={
              progress.mode === "determinate"
                ? {
                  transform: `scaleX(${progress.value})`,
                }
                : undefined
            }
          />
        </div>
      ) : null}
    </div>
  );
});

ToastCard.displayName = "ToastCard";

function isInteractiveElementTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    ? Boolean(
      target.closest("button, a, input, select, textarea, [role='button']"),
    )
    : false;
}

function getSwipeExitOffset(): number {
  if (typeof window === "undefined" || !Number.isFinite(window.innerWidth)) {
    return 420;
  }

  return Math.max(window.innerWidth, SWIPE_DISMISS_DISTANCE * 2);
}
