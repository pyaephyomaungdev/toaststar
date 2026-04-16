import { startTransition, useCallback, useMemo, useState } from "react";
import {
  clearHistoryItems,
  createToastHistorySnapshot,
  listHistory,
  mergeStoredHistoryItems,
  normalizeHistoryOptions,
  parseToastHistoryPayload,
  replaceStoredHistoryItems,
  saveHistoryItem,
} from "../history";
import { mergeHistoryItems, swallowHistoryError, toastToHistoryItem } from "../provider/utils";
import type {
  ToastHistoryContextValue,
  ToastHistoryImportBehavior,
  ToastHistoryImportSource,
  ToastHistoryItem,
  ToastHistoryPostInit,
  ToastRecord,
} from "../types";
import { useEffect } from "react";

export interface UseToastHistoryManagerOptions {
  history: boolean | import("../types").ToastHistoryOptions | undefined;
  controllerScope: string | undefined;
}

export function useToastHistoryManager({
  history,
  controllerScope,
}: UseToastHistoryManagerOptions) {
  const historyOptions = useMemo(
    () => normalizeHistoryOptions(history, controllerScope),
    [controllerScope, history],
  );
  const [historyItems, setHistoryItems] = useState<ToastHistoryItem[]>([]);

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
      void saveHistoryItem(historyOptions, historyItem).catch((error: unknown) => {
        swallowHistoryError(error, "save");
      });
    },
    [historyOptions],
  );

  // Load history on mount
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
      .catch((error: unknown) => {
        swallowHistoryError(error, "load");
      });

    return () => {
      active = false;
    };
  }, [historyOptions]);

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
    async (source: ToastHistoryImportSource, behavior: ToastHistoryImportBehavior = "merge") => {
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

      const payload: unknown = await response.json();
      return importHistory(payload as ToastHistoryImportSource, behavior);
    },
    [importHistory],
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

  return {
    historyOptions,
    historyItems,
    syncHistoryItem,
    historyContextValue,
  };
}
