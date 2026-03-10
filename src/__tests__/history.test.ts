import { describe, expect, it } from "vitest";
import {
  clearHistoryItems,
  listHistory,
  normalizeHistoryOptions,
  saveHistoryItem,
} from "../history";
import {
  STORED_HISTORY_KEY_PATH,
  getStoredHistoryKey,
} from "../history/indexeddb";
import {
  areHistoryItemsEqual,
  toastToHistoryItem,
} from "../provider/utils";
import type { ToastRecord } from "../types";

describe("history adapters", () => {
  it("keeps memory-backed history isolated per scope", async () => {
    const alphaOptions = normalizeHistoryOptions(
      { enabled: true, storage: "memory", limit: 10 },
      "alpha-app",
    );
    const betaOptions = normalizeHistoryOptions(
      { enabled: true, storage: "memory", limit: 10 },
      "beta-app",
    );

    await clearHistoryItems(alphaOptions);
    await clearHistoryItems(betaOptions);

    await saveHistoryItem(alphaOptions, {
      id: "alpha-toast",
      title: "Alpha saved",
      theme: "glass",
      intent: "success",
      createdAt: 1,
    });
    await saveHistoryItem(betaOptions, {
      id: "beta-toast",
      title: "Beta saved",
      theme: "glass",
      intent: "info",
      createdAt: 2,
    });

    await expect(listHistory(alphaOptions)).resolves.toEqual([
      expect.objectContaining({ id: "alpha-toast", title: "Alpha saved" }),
    ]);
    await expect(listHistory(betaOptions)).resolves.toEqual([
      expect.objectContaining({ id: "beta-toast", title: "Beta saved" }),
    ]);
  });

  it("derives different default namespaces for different explicit scopes", () => {
    const alphaOptions = normalizeHistoryOptions(true, "alpha-app");
    const betaOptions = normalizeHistoryOptions(true, "beta-app");

    expect(alphaOptions.namespace).not.toBe(betaOptions.namespace);
    expect(alphaOptions.databaseName).not.toBe(betaOptions.databaseName);
  });

  it("uses namespace-aware primary keys for IndexedDB history rows", () => {
    expect(STORED_HISTORY_KEY_PATH).toEqual(["namespace", "id"]);
    expect(getStoredHistoryKey("alpha", "toast-1")).toEqual([
      "alpha",
      "toast-1",
    ]);
  });

  it("ignores progress-only toast changes when syncing history", () => {
    const baseToast: ToastRecord = {
      id: "toast-1",
      title: "Uploading assets",
      description: "Still in progress.",
      theme: "glass",
      intent: "info",
      closable: true,
      duration: 4200,
      createdAt: 1,
      persistent: true,
      loading: true,
      progress: 0.2,
      phase: "stack",
    };
    const updatedToast: ToastRecord = {
      ...baseToast,
      loading: false,
      progress: 0.9,
      persistent: false,
    };

    expect(
      areHistoryItemsEqual(
        toastToHistoryItem(baseToast),
        toastToHistoryItem(updatedToast),
      ),
    ).toBe(true);
  });
});
