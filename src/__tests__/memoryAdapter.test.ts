import { describe, expect, it } from "vitest";
import { memoryHistoryAdapter } from "../history/memory";
import { normalizeHistoryOptions } from "../history/normalizeHistoryOptions";

function createOptions(limit: number) {
  return normalizeHistoryOptions(
    { enabled: true, storage: "memory", limit },
    `memory-adapter-test-${Math.random()}`,
  );
}

function makeItem(id: string, createdAt: number) {
  return {
    id,
    title: `Toast ${id}`,
    theme: "glass" as const,
    intent: "default" as const,
    createdAt,
  };
}

describe("memoryHistoryAdapter", () => {
  it("returns only up to limit items after many saves", async () => {
    const options = createOptions(5);

    for (let i = 0; i < 100; i++) {
      await memoryHistoryAdapter.save(options, makeItem(`item-${i}`, i));
    }

    const items = await memoryHistoryAdapter.list(options);
    expect(items).toHaveLength(5);
    expect(items[0].id).toBe("item-99");
    expect(items[4].id).toBe("item-95");
  });

  it("handles limit=0 correctly", async () => {
    const options = createOptions(0);

    await memoryHistoryAdapter.save(options, makeItem("zero-1", 1));
    await memoryHistoryAdapter.save(options, makeItem("zero-2", 2));

    const items = await memoryHistoryAdapter.list(options);
    expect(items).toHaveLength(0);
  });

  it("deduplicates items by id on save", async () => {
    const options = createOptions(10);

    await memoryHistoryAdapter.save(options, makeItem("dup", 1));
    await memoryHistoryAdapter.save(options, { ...makeItem("dup", 2), title: "Updated" });

    const items = await memoryHistoryAdapter.list(options);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Updated");
    expect(items[0].createdAt).toBe(2);
  });

  it("handles concurrent saves without duplicates", async () => {
    const options = createOptions(20);

    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        memoryHistoryAdapter.save(options, makeItem(`concurrent-${i}`, i)),
      ),
    );

    const items = await memoryHistoryAdapter.list(options);
    const ids = new Set(items.map((item) => item.id));
    expect(ids.size).toBe(items.length);
    expect(items.length).toBeLessThanOrEqual(20);
  });

  it("respects limit on replace", async () => {
    const options = createOptions(3);
    const manyItems = Array.from({ length: 10 }, (_, i) => makeItem(`replace-${i}`, i));

    await memoryHistoryAdapter.replace(options, manyItems);

    const items = await memoryHistoryAdapter.list(options);
    expect(items).toHaveLength(3);
  });

  it("clears all items", async () => {
    const options = createOptions(10);

    await memoryHistoryAdapter.save(options, makeItem("clear-1", 1));
    await memoryHistoryAdapter.save(options, makeItem("clear-2", 2));
    await memoryHistoryAdapter.clear(options);

    const items = await memoryHistoryAdapter.list(options);
    expect(items).toHaveLength(0);
  });
});
