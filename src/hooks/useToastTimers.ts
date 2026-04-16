import { useCallback, useEffect, useRef } from "react";
import { clearManagedTimeout, type TimerEntry } from "../provider/utils";
import type { ToastCloseReason } from "../types";

export interface UseToastTimersOptions {
  resolveToastId: (id: string) => string;
  deleteAlias: (id: string) => void;
  deleteAliasesTo: (targetId: string) => void;
  dismissToastRef: React.RefObject<(id: string, reason: ToastCloseReason) => boolean | void>;
}

export function useToastTimers({
  resolveToastId,
  deleteAlias,
  deleteAliasesTo,
  dismissToastRef,
}: UseToastTimersOptions) {
  const timersRef = useRef<Map<string, TimerEntry>>(new Map());

  const clearToastTracking = useCallback(
    (id: string) => {
      const timers = timersRef.current.get(id);
      clearManagedTimeout(timers?.dock);
      clearManagedTimeout(timers?.stack);
      clearManagedTimeout(timers?.close);
      clearManagedTimeout(timers?.remove);
      timersRef.current.delete(id);
      deleteAlias(id);
      deleteAliasesTo(id);
    },
    [deleteAlias, deleteAliasesTo],
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
      timers.autoCloseDuration = Number.isFinite(progressDuration) ? progressDuration : delay;
      timers.close = window.setTimeout(() => {
        dismissToastRef.current(canonicalId, "auto");
      }, delay);
      timersRef.current.set(canonicalId, timers);
    },
    [dismissToastRef, resolveToastId],
  );

  const pauseToast = useCallback(
    (id: string) => {
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
    },
    [resolveToastId],
  );

  const resumeToast = useCallback(
    (id: string) => {
      const canonicalId = resolveToastId(id);
      const timers = timersRef.current.get(canonicalId);

      if (!timers?.remaining || timers.remaining <= 0) {
        return;
      }

      scheduleDismiss(canonicalId, timers.remaining, timers.autoCloseDuration ?? timers.remaining);
    },
    [resolveToastId, scheduleDismiss],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const timers of timersRef.current.values()) {
        clearManagedTimeout(timers.dock);
        clearManagedTimeout(timers.stack);
        clearManagedTimeout(timers.close);
        clearManagedTimeout(timers.remove);
      }

      timersRef.current.clear();
    };
  }, []);

  return {
    timersRef,
    clearToastTracking,
    scheduleDismiss,
    pauseToast,
    resumeToast,
  };
}
