import { describe, expect, it } from "vitest";
import {
  clampProgress,
  normalizeLimit,
  normalizeUpdateInput,
  formatViewportTop,
  areHistoryItemsEqual,
  mergeHistoryItems,
  getToastProgress,
  resolvePortalTarget,
  getOpenToasts,
  isToastCardTarget,
  clearManagedTimeout,
  toastToHistoryItem,
} from "../provider/utils";
import type { ToastHistoryItem, ToastRecord } from "../types";

describe("clampProgress", () => {
  it("returns undefined for non-number inputs", () => {
    expect(clampProgress(undefined)).toBeUndefined();
    expect(clampProgress(Number.NaN)).toBeUndefined();
  });

  it("clamps values to [0, 1]", () => {
    expect(clampProgress(-0.5)).toBe(0);
    expect(clampProgress(0)).toBe(0);
    expect(clampProgress(0.5)).toBe(0.5);
    expect(clampProgress(1)).toBe(1);
    expect(clampProgress(1.5)).toBe(1);
  });
});

describe("normalizeLimit", () => {
  it("returns the fallback for non-finite values", () => {
    expect(normalizeLimit(undefined, 10)).toBe(10);
    expect(normalizeLimit(Number.NaN, 10)).toBe(10);
    expect(normalizeLimit(Infinity, 10)).toBe(10);
  });

  it("floors and clamps to >= 0", () => {
    expect(normalizeLimit(-5, 10)).toBe(0);
    expect(normalizeLimit(3.7, 10)).toBe(3);
    expect(normalizeLimit(0, 10)).toBe(0);
    expect(normalizeLimit(100, 10)).toBe(100);
  });
});

describe("normalizeUpdateInput", () => {
  it("converts a string to a title-only patch", () => {
    const result = normalizeUpdateInput("New title");
    expect(result).toEqual({
      title: "New title",
      description: undefined,
      body: undefined,
      action: undefined,
      loading: false,
      progress: undefined,
      showProgress: false,
    });
  });

  it("passes objects through unchanged", () => {
    const input = { title: "Updated", description: "New desc" };
    expect(normalizeUpdateInput(input)).toBe(input);
  });
});

describe("formatViewportTop", () => {
  it("computes top position for top-aligned toasts", () => {
    expect(formatViewportTop("top", 900, 100, 28, 0)).toBe(28);
    expect(formatViewportTop("top", 900, 100, 28, 50)).toBe(78);
  });

  it("computes top position for bottom-aligned toasts", () => {
    expect(formatViewportTop("bottom", 900, 100, 28, 0)).toBe(772);
    expect(formatViewportTop("bottom", 900, 100, 28, 50)).toBe(722);
  });
});

describe("areHistoryItemsEqual", () => {
  const base: ToastHistoryItem = {
    id: "t1",
    title: "Test",
    theme: "glass",
    intent: "success",
    createdAt: 1000,
  };

  it("returns true for identical items", () => {
    expect(areHistoryItemsEqual(base, { ...base })).toBe(true);
  });

  it("returns false when title differs", () => {
    expect(areHistoryItemsEqual(base, { ...base, title: "Changed" })).toBe(false);
  });

  it("returns false when description differs", () => {
    expect(areHistoryItemsEqual(base, { ...base, description: "Added desc" })).toBe(false);
  });

  it("returns false when metadata differs", () => {
    expect(
      areHistoryItemsEqual({ ...base, metadata: { a: 1 } }, { ...base, metadata: { a: 2 } }),
    ).toBe(false);
  });

  it("returns true when metadata is shallowly equal", () => {
    expect(
      areHistoryItemsEqual({ ...base, metadata: { a: 1 } }, { ...base, metadata: { a: 1 } }),
    ).toBe(true);
  });
});

describe("mergeHistoryItems", () => {
  it("merges and deduplicates by id, keeping the newest", () => {
    const current: ToastHistoryItem[] = [
      { id: "t1", title: "Old", theme: "glass", intent: "default", createdAt: 1 },
    ];
    const incoming: ToastHistoryItem[] = [
      { id: "t1", title: "New", theme: "glass", intent: "default", createdAt: 2 },
      { id: "t2", title: "Second", theme: "glass", intent: "default", createdAt: 3 },
    ];

    const result = mergeHistoryItems(current, incoming, 10);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("t2");
    expect(result[1].id).toBe("t1");
    expect(result[1].title).toBe("New");
  });

  it("respects the limit", () => {
    const items: ToastHistoryItem[] = Array.from({ length: 5 }, (_, i) => ({
      id: `t${i}`,
      title: `Toast ${i}`,
      theme: "glass" as const,
      intent: "default" as const,
      createdAt: i,
    }));

    const result = mergeHistoryItems([], items, 3);
    expect(result).toHaveLength(3);
    expect(result[0].createdAt).toBe(4);
  });
});

describe("getToastProgress", () => {
  const baseToast: ToastRecord = {
    id: "t1",
    title: "Test",
    theme: "glass",
    intent: "default",
    closable: true,
    duration: 4200,
    createdAt: 1000,
    persistent: false,
    loading: false,
    phase: "stack",
  };

  it("returns off when showProgress is false", () => {
    const result = getToastProgress(baseToast, undefined, Date.now(), false);
    expect(result.mode).toBe("off");
  });

  it("returns determinate when explicit progress is set", () => {
    const toast = { ...baseToast, progress: 0.5, showProgress: true };
    const result = getToastProgress(toast, undefined, Date.now(), false);
    expect(result.mode).toBe("determinate");
    expect(result.value).toBe(0.5);
  });

  it("returns indeterminate when loading", () => {
    const toast = { ...baseToast, loading: true, showProgress: true };
    const result = getToastProgress(toast, undefined, Date.now(), false);
    expect(result.mode).toBe("indeterminate");
  });

  it("computes timer-based progress", () => {
    const toast = { ...baseToast, showProgress: true };
    const now = 2000;
    const timer = { autoCloseDuration: 4200, closesAt: 3000, remaining: 1000 };
    const result = getToastProgress(toast, timer, now, false);
    expect(result.mode).toBe("determinate");
    expect(result.value).toBeGreaterThan(0);
    expect(result.value).toBeLessThanOrEqual(1);
  });
});

describe("resolvePortalTarget", () => {
  it("returns document.body for null or undefined", () => {
    expect(resolvePortalTarget(null)).toBe(document.body);
    expect(resolvePortalTarget(undefined)).toBe(document.body);
  });

  it("returns null for false", () => {
    expect(resolvePortalTarget(false)).toBeNull();
  });

  it("returns document.body for non-matching selector", () => {
    expect(resolvePortalTarget("#nonexistent-portal-target")).toBe(document.body);
  });

  it("accepts a connected HTMLElement directly", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    expect(resolvePortalTarget(el)).toBe(el);
    document.body.removeChild(el);
  });

  it("falls back to document.body for a detached HTMLElement", () => {
    const el = document.createElement("div");
    expect(resolvePortalTarget(el)).toBe(document.body);
  });
});

describe("getOpenToasts", () => {
  it("filters out closing toasts", () => {
    const toasts: ToastRecord[] = [
      { ...makeToast("t1"), phase: "stack" },
      { ...makeToast("t2"), phase: "closing" },
      { ...makeToast("t3"), phase: "center" },
    ];
    const result = getOpenToasts(toasts);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(["t1", "t3"]);
  });
});

describe("toastToHistoryItem", () => {
  it("extracts only history-relevant fields", () => {
    const toast: ToastRecord = {
      ...makeToast("t1"),
      description: "Desc",
      metadata: { key: "value" },
    };
    const item = toastToHistoryItem(toast);
    expect(item).toEqual({
      id: "t1",
      title: "Test",
      description: "Desc",
      theme: "glass",
      intent: "default",
      createdAt: 1000,
      appearance: undefined,
      metadata: { key: "value" },
    });
    expect(item).not.toHaveProperty("phase");
    expect(item).not.toHaveProperty("duration");
  });
});

describe("clearManagedTimeout", () => {
  it("does not throw for undefined", () => {
    expect(() => clearManagedTimeout(undefined)).not.toThrow();
  });
});

describe("isToastCardTarget", () => {
  it("returns false for null", () => {
    expect(isToastCardTarget(null)).toBe(false);
  });

  it("returns true for elements with data-toaststar-card", () => {
    const el = document.createElement("div");
    el.setAttribute("data-toaststar-card", "true");
    document.body.appendChild(el);
    expect(isToastCardTarget(el)).toBe(true);
    document.body.removeChild(el);
  });
});

function makeToast(id: string): ToastRecord {
  return {
    id,
    title: "Test",
    theme: "glass",
    intent: "default",
    closable: true,
    duration: 4200,
    createdAt: 1000,
    persistent: false,
    loading: false,
    phase: "stack",
  };
}
