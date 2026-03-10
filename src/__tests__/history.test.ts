import { describe, expect, it } from "vitest";
import {
  clearHistoryItems,
  listHistory,
  normalizeHistoryOptions,
  saveHistoryItem,
} from "../history";

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
});
