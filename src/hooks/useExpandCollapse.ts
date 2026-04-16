import { useCallback, useEffect, useRef, useState } from "react";
import { clearManagedTimeout, isToastCardTarget } from "../provider/utils";
import { EXPAND_HOVER_DISTANCE } from "../provider/constants";
import type { PointerEvent as ReactPointerEvent } from "react";

export interface UseExpandCollapseOptions {
  expandOnHover: boolean;
  pauseOnHover: boolean;
  pauseAllToasts: () => void;
  resumeAllToasts: () => void;
}

export function useExpandCollapse({
  expandOnHover,
  pauseOnHover,
  pauseAllToasts,
  resumeAllToasts,
}: UseExpandCollapseOptions) {
  const [expanded, setExpanded] = useState(false);
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

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    hoverIntentRef.current.blocked = true;
    hoverIntentRef.current.enteredX = event.clientX;
    hoverIntentRef.current.enteredY = event.clientY;
  }, []);

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

  // Collapse when clicking outside the toast stack
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

  // Cleanup collapse timer on unmount
  useEffect(() => {
    return () => {
      clearCollapseTimer();
    };
  }, [clearCollapseTimer]);

  return {
    expanded,
    expandedRef,
    expandToastStack,
    collapseToastStack,
    clearCollapseTimer,
    handlePointerEnter,
    handlePointerMove,
    handlePointerDown,
    handlePointerLeave,
  };
}
