import { useCallback, useRef, useState } from "react";
import {
  normalizeUpdateInput,
  type QueuedToastInput,
} from "../provider/utils";
import type { ToastOverflowStrategy, ToastUpdateInput } from "../types";

export interface UseToastQueueOptions {
  resolvedQueueLimit: number;
  overflowStrategy: ToastOverflowStrategy;
  resolveToastId: (id: string) => string;
  deleteAlias: (id: string) => void;
}

export function useToastQueue({
  resolvedQueueLimit,
  overflowStrategy,
  resolveToastId,
  deleteAlias,
}: UseToastQueueOptions) {
  const pendingQueueRef = useRef<QueuedToastInput[]>([]);
  const [queueCount, setQueueCount] = useState(0);

  const syncQueueCount = useCallback(() => {
    const nextQueueCount = pendingQueueRef.current.length;
    setQueueCount((currentQueueCount) => {
      return currentQueueCount === nextQueueCount ? currentQueueCount : nextQueueCount;
    });
  }, []);

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
      deleteAlias(id);
      syncQueueCount();
      return true;
    },
    [deleteAlias, resolveToastId, syncQueueCount],
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

  return {
    pendingQueueRef,
    queueCount,
    syncQueueCount,
    enqueueToast,
    dropQueuedToast,
    updateQueuedToast,
  };
}
