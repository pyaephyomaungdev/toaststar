import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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

export const ToastCard = memo(function ToastCard(props: {
  toastRecord: ToastRecord;
  top: number;
  scale: number;
  opacity: number;
  zIndex: number;
  expanded: boolean;
  stackCount: number;
  interactive: boolean;
  defaultShowProgress: boolean;
  timer: TimerEntry | undefined;
  swipeToDismiss: boolean;
  onDismiss: (id: string, reason?: ToastCloseReason) => void;
  onAction: (id: string) => void;
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
    stackCount,
    interactive,
    defaultShowProgress,
    timer,
    swipeToDismiss,
    onDismiss,
    onAction,
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
    startX: 0,
    startY: 0,
    offset: 0,
    dragging: false,
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

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerDown(event);

      if (
        !interactive ||
        !swipeToDismiss ||
        (event.pointerType !== "touch" && event.pointerType !== "pen")
      ) {
        return;
      }

      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offset: 0,
        dragging: true,
      };
      ref.current?.setPointerCapture(event.pointerId);
    },
    [interactive, onPointerDown, swipeToDismiss],
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

      if (Math.abs(deltaX) < 6 || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      dragState.offset = deltaX;
      setDragOffset(deltaX);
    },
    [onPointerMove],
  );

  const releaseDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
      const dragState = dragStateRef.current;

      if (!dragState.dragging || dragState.pointerId !== event.pointerId) {
        return;
      }

      dragState.dragging = false;
      dragState.pointerId = -1;
      ref.current?.releasePointerCapture?.(event.pointerId);

      if (!cancelled && Math.abs(dragState.offset) >= SWIPE_DISMISS_DISTANCE) {
        onDismiss(toastRecord.id, "swipe");
      }

      dragState.offset = 0;
      setDragOffset(0);
    },
    [onDismiss, toastRecord.id],
  );

  return (
    <div
      ref={ref}
      className="toaststar-toast"
      data-toaststar-card="true"
      data-phase={toastRecord.phase}
      data-expanded={expanded ? "true" : "false"}
      data-compact={
        hasCustomBody || toastRecord.description || toastRecord.action
          ? "false"
          : "true"
      }
      data-custom-body={hasCustomBody ? "true" : "false"}
      data-loading={toastRecord.loading ? "true" : "false"}
      data-swiping={dragOffset !== 0 ? "true" : "false"}
      onPointerEnter={interactive ? onPointerEnter : undefined}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerDown={interactive ? handlePointerDown : undefined}
      onPointerLeave={interactive ? onPointerLeave : undefined}
      onPointerUp={interactive ? releaseDrag : undefined}
      onPointerCancel={interactive ? (event) => releaseDrag(event, true) : undefined}
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
              <div className="toaststar-description">{toastRecord.description}</div>
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
        {!expanded && stackCount > 0 ? (
          <span className="toaststar-count">+{stackCount}</span>
        ) : null}
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
