import type { ToastHistorySnapshot } from "toaststar";
import { useCallback, useEffect, useState } from "react";

export const DEMO_HISTORY_API_PATH = "/api/demo-toast-history";
const DEMO_HISTORY_API_STORAGE_KEY = "toaststar-demo-history-api";

function isRequestInstance(value: RequestInfo | URL): value is Request {
  return typeof Request !== "undefined" && value instanceof Request;
}

function resolveDemoRequestUrl(input: RequestInfo | URL): URL | null {
  if (typeof window === "undefined") {
    return null;
  }

  const href =
    input instanceof URL
      ? input.toString()
      : typeof input === "string"
        ? input
        : isRequestInstance(input)
          ? input.url
          : String(input);

  try {
    return new URL(href, window.location.origin);
  } catch {
    return null;
  }
}

function parseDemoHistorySnapshot(raw: string | null): ToastHistorySnapshot | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as { items?: unknown[] }).items)
    ) {
      return null;
    }

    return parsed as ToastHistorySnapshot;
  } catch {
    return null;
  }
}

function readDemoHistorySnapshot(): ToastHistorySnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  return parseDemoHistorySnapshot(
    window.localStorage.getItem(DEMO_HISTORY_API_STORAGE_KEY),
  );
}

function writeDemoHistorySnapshot(snapshot: ToastHistorySnapshot | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!snapshot) {
    window.localStorage.removeItem(DEMO_HISTORY_API_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    DEMO_HISTORY_API_STORAGE_KEY,
    JSON.stringify(snapshot),
  );
}

async function readRequestBody(input: RequestInfo | URL, init?: RequestInit) {
  if (typeof init?.body === "string") {
    return init.body;
  }

  if (init?.body instanceof Blob) {
    return init.body.text();
  }

  if (isRequestInstance(input)) {
    return input.clone().text();
  }

  return "";
}

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

export function useDemoHistoryApiBridge() {
  const [remoteSnapshot, setRemoteSnapshot] = useState<ToastHistorySnapshot | null>(
    () => readDemoHistorySnapshot(),
  );

  const refreshRemoteSnapshot = useCallback(() => {
    const snapshot = readDemoHistorySnapshot();
    setRemoteSnapshot(snapshot);
    return snapshot;
  }, []);

  const clearRemoteSnapshot = useCallback(() => {
    writeDemoHistorySnapshot(null);
    setRemoteSnapshot(null);
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.fetch !== "function" ||
      typeof Response === "undefined"
    ) {
      return;
    }

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      const url = resolveDemoRequestUrl(input);

      if (!url || url.pathname !== DEMO_HISTORY_API_PATH) {
        return originalFetch(input, init);
      }

      const method = (
        init?.method ??
        (isRequestInstance(input) ? input.method : "GET")
      ).toUpperCase();

      if (method === "GET") {
        return createJsonResponse(readDemoHistorySnapshot() ?? { history: [] });
      }

      if (method === "DELETE") {
        clearRemoteSnapshot();
        return createJsonResponse({ ok: true, cleared: true });
      }

      if (method === "POST" || method === "PUT" || method === "PATCH") {
        const rawBody = await readRequestBody(input, init);
        const snapshot = parseDemoHistorySnapshot(rawBody);

        if (!snapshot) {
          return createJsonResponse(
            { ok: false, message: "Invalid history snapshot payload." },
            400,
          );
        }

        writeDemoHistorySnapshot(snapshot);
        setRemoteSnapshot(snapshot);

        return createJsonResponse({
          ok: true,
          storedAt: Date.now(),
          itemCount: snapshot.items.length,
        });
      }

      return createJsonResponse(
        { ok: false, message: `Method ${method} is not supported.` },
        405,
      );
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [clearRemoteSnapshot]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DEMO_HISTORY_API_STORAGE_KEY) {
        return;
      }

      setRemoteSnapshot(parseDemoHistorySnapshot(event.newValue));
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return {
    remoteSnapshot,
    clearRemoteSnapshot,
    refreshRemoteSnapshot,
  };
}

export function useHaptic() {
  const trigger = useCallback(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  return { trigger };
}

export function useHeroIntro() {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [introActive, setIntroActive] = useState(!prefersReducedMotion);
  const [contentVisible, setContentVisible] = useState(prefersReducedMotion);
  const [targetVisible, setTargetVisible] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setContentVisible(true);
      setTargetVisible(true);
      setIntroActive(false);
      return;
    }

    const revealTimer = window.setTimeout(() => setContentVisible(true), 880);
    const targetTimer = window.setTimeout(() => setTargetVisible(true), 1160);
    const finishTimer = window.setTimeout(() => setIntroActive(false), 1320);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(targetTimer);
      window.clearTimeout(finishTimer);
    };
  }, [prefersReducedMotion]);

  return {
    contentVisible,
    introActive,
    targetVisible,
  };
}
