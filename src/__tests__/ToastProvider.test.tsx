import { useEffect } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastHistoryPanel } from "../ToastHistoryPanel";
import { ToastProvider } from "../ToastProvider";
import { createToastScope } from "../controller";
import { useToastHistory } from "../hooks/useToast";
import type { ToastHistoryContextValue } from "../types";

function HistoryHarness(props: {
  onReady: (value: ToastHistoryContextValue) => void;
}) {
  const historyApi = useToastHistory();

  useEffect(() => {
    props.onReady(historyApi);
  }, [historyApi, props.onReady]);

  return (
    <div>
      {historyApi.history.map((item) => (
        <span key={item.id}>{item.title}</span>
      ))}
    </div>
  );
}

describe("ToastProvider", () => {
  it("renders isolated layers for different scopes", async () => {
    render(
      <>
        <ToastProvider scope="alpha-layer" portalTarget={false}>
          <div>Alpha app</div>
        </ToastProvider>
        <ToastProvider scope="beta-layer" portalTarget={false}>
          <div>Beta app</div>
        </ToastProvider>
      </>,
    );

    await act(async () => {
      createToastScope("alpha-layer").show("Alpha only");
    });

    expect(await screen.findAllByText("Alpha only")).toHaveLength(1);
    expect(screen.queryByText("Beta only")).not.toBeInTheDocument();

    await act(async () => {
      createToastScope("beta-layer").show("Beta only");
    });

    expect(await screen.findAllByText("Beta only")).toHaveLength(1);
    expect(screen.getAllByText("Alpha only")).toHaveLength(1);
  });

  it("uses single-line truncation for url-like descriptions", async () => {
    render(
      <ToastProvider scope="style-check" portalTarget={false}>
        <div>Style check</div>
      </ToastProvider>,
    );

    await act(async () => {
      createToastScope("style-check").show({
        title: "Published",
        description: "http://localhost:5174/ytg1scv28f9mak8ohd1sj7o42f76dlongvalue",
      });
    });

    expect(await screen.findByText("Published")).toBeInTheDocument();
    expect(
      screen
        .getByText("http://localhost:5174/ytg1scv28f9mak8ohd1sj7o42f76dlongvalue")
        .closest(".toaststar-description"),
    ).toHaveAttribute("data-overflow-mode", "single-line");
  });

  it("injects multiline title styles for long titles", () => {
    render(
      <ToastProvider scope="title-style" portalTarget={false}>
        <div>Title style</div>
      </ToastProvider>,
    );

    const styleTag = document.head.querySelector("#toaststar-styles");

    expect(styleTag?.textContent).toContain(".toaststar-title");
    expect(styleTag?.textContent).toContain("-webkit-line-clamp: 2;");
    expect(styleTag?.textContent).toContain("white-space: normal;");
    expect(styleTag?.textContent).toContain("overflow-wrap: anywhere;");
  });

  it("clears memory-backed history from the panel", async () => {
    render(
      <ToastProvider
        scope="history-panel"
        history={{ enabled: true, storage: "memory", limit: 12 }}
        portalTarget={false}
      >
        <ToastHistoryPanel
          title="Recent notifications"
          emptyMessage="Nothing stored yet."
        />
      </ToastProvider>,
    );

    await act(async () => {
      createToastScope("history-panel").show("History toast");
    });

    expect(await screen.findByText("Recent notifications")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Clear" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => {
      expect(screen.getByText("Nothing stored yet.")).toBeInTheDocument();
    });
  });

  it("keeps the top toast visible when maxCollapsed is zero", async () => {
    render(
      <ToastProvider scope="collapsed-zero" portalTarget={false} maxCollapsed={0}>
        <div>Collapsed zero</div>
      </ToastProvider>,
    );

    await act(async () => {
      createToastScope("collapsed-zero").show("Visible toast");
    });

    const toastCard = (await screen.findByText("Visible toast")).closest(".toaststar-toast");

    expect(toastCard).toHaveStyle({ opacity: "1" });
  });

  it("supports keyboard expansion for collapsed stacks", async () => {
    render(
      <ToastProvider scope="keyboard-stack" portalTarget={false} maxCollapsed={1}>
        <div>Keyboard stack</div>
      </ToastProvider>,
    );

    await act(async () => {
      const scopedToast = createToastScope("keyboard-stack");
      scopedToast.show("Older toast");
      scopedToast.show("Newest toast");
    });

    expect(screen.queryByText("Older toast")).not.toBeInTheDocument();

    const topToastCard = (await screen.findByText("Newest toast")).closest(
      ".toaststar-toast",
    ) as HTMLElement | null;

    expect(topToastCard).toHaveAttribute("role", "button");
    expect(topToastCard).toHaveAttribute("tabindex", "0");
    expect(topToastCard).toHaveAttribute("aria-expanded", "false");

    topToastCard?.focus();
    fireEvent.keyDown(topToastCard as HTMLElement, { key: "Enter" });

    expect(await screen.findByText("Older toast")).toBeInTheDocument();
    expect(topToastCard).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(topToastCard as HTMLElement, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByText("Older toast")).not.toBeInTheDocument();
    });
  });

  it("keeps stored history in sync when a toast is updated", async () => {
    render(
      <ToastProvider
        scope="history-sync"
        history={{ enabled: true, storage: "memory", limit: 12 }}
        headless
        portalTarget={false}
      >
        <ToastHistoryPanel
          title="Recent notifications"
          emptyMessage="Nothing stored yet."
        />
      </ToastProvider>,
    );

    const historyToast = createToastScope("history-sync");
    let toastId = "";

    await act(async () => {
      toastId = historyToast.loading({
        title: "Saving profile",
        description: "Waiting for the API to finish.",
      });
    });

    expect(await screen.findByText("Saving profile")).toBeInTheDocument();

    await act(async () => {
      historyToast.update(toastId, {
        title: "Profile saved",
        description: "Your latest settings are live.",
        intent: "success",
        loading: false,
        persistent: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Profile saved")).toBeInTheDocument();
      expect(screen.queryByText("Saving profile")).not.toBeInTheDocument();
    });
  });

  it("exports, posts, fetches, and rehydrates history snapshots", async () => {
    const handleReady = vi.fn<(value: ToastHistoryContextValue) => void>();
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    try {
      render(
        <ToastProvider
          scope="history-api"
          history={{ enabled: true, storage: "memory", limit: 12 }}
          headless
          portalTarget={false}
        >
          <HistoryHarness onReady={handleReady} />
        </ToastProvider>,
      );

      const getHistoryApi = () => {
        const latestCall = handleReady.mock.lastCall?.[0];

        expect(latestCall).toBeTruthy();
        return latestCall as ToastHistoryContextValue;
      };

      await act(async () => {
        createToastScope("history-api").show("Local history item");
      });

      await waitFor(() => {
        expect(getHistoryApi().history).toHaveLength(1);
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: "Created",
        json: async () => ({}),
      } as Response);

      await act(async () => {
        await getHistoryApi().postHistory("/api/history", { method: "PUT" });
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/history",
        expect.objectContaining({
          method: "PUT",
        }),
      );
      expect(
        JSON.parse(
          (fetchMock.mock.calls[0]?.[1] as RequestInit & { body?: string }).body ?? "{}",
        ),
      ).toEqual(
        expect.objectContaining({
          items: [
            expect.objectContaining({ title: "Local history item" }),
          ],
        }),
      );

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({
          history: [
            {
              id: "remote-toast",
              title: "Remote restored item",
              description: "Loaded from API.",
              theme: "ocean",
              intent: "info",
              createdAt: 99,
            },
          ],
        }),
      } as Response);

      await act(async () => {
        await getHistoryApi().fetchHistory("/api/history", undefined, "replace");
      });

      await waitFor(() => {
        expect(screen.getByText("Remote restored item")).toBeInTheDocument();
        expect(screen.queryByText("Local history item")).not.toBeInTheDocument();
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("throws when postHistory receives a non-ok response", async () => {
    const handleReady = vi.fn<(value: ToastHistoryContextValue) => void>();
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    try {
      render(
        <ToastProvider
          scope="history-post-error"
          history={{ enabled: true, storage: "memory", limit: 12 }}
          headless
          portalTarget={false}
        >
          <HistoryHarness onReady={handleReady} />
        </ToastProvider>,
      );

      await act(async () => {
        createToastScope("history-post-error").show("Needs sync");
      });

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      } as Response);

      await expect(
        handleReady.mock.lastCall?.[0].postHistory("/api/history"),
      ).rejects.toThrow("toaststar history post failed: 503 Service Unavailable");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("allows temporary visible overflow during bursts when configured", async () => {
    render(
      <ToastProvider
        scope="burst-latency"
        portalTarget={false}
        maxVisible={3}
        burstMaxVisible={10}
        burstWindow={1000}
        maxCollapsed={12}
      >
        <div>Burst test</div>
      </ToastProvider>,
    );

    const burstToast = createToastScope("burst-latency");

    await act(async () => {
      for (const index of Array.from({ length: 10 }, (_, value) => value + 1)) {
        burstToast.show(`Burst toast ${index}`);
      }
    });

    expect(screen.getAllByText(/Burst toast \d+/)).toHaveLength(10);
  });

  it("keeps the default toast singleton connected after route changes", async () => {
    window.history.replaceState({}, "", "/alpha");
    vi.resetModules();

    const [{ ToastProvider: DynamicToastProvider }, { toast: defaultToast }] =
      await Promise.all([import("../ToastProvider"), import("../controller")]);

    render(
      <DynamicToastProvider portalTarget={false}>
        <div>Single app</div>
      </DynamicToastProvider>,
    );

    await act(async () => {
      defaultToast.show("Alpha route toast");
    });

    expect(await screen.findByText("Alpha route toast")).toBeInTheDocument();

    window.history.replaceState({}, "", "/beta");

    await act(async () => {
      defaultToast.show("Beta route toast");
    });

    expect(await screen.findByText("Beta route toast")).toBeInTheDocument();
  });

  it("renders layered cards immediately during the landing-page welcome burst", async () => {
    vi.useFakeTimers();

    render(
      <ToastProvider scope="welcome-burst" portalTarget={false} maxCollapsed={4}>
        <div>Welcome burst</div>
      </ToastProvider>,
    );

    const burstToast = createToastScope("welcome-burst");

    await act(async () => {
      burstToast.show({
        title: "Workspace loaded",
        description: "Your configurations are synced.",
      });
      vi.advanceTimersByTime(150);
      burstToast.show({
        title: "New update",
        description: "Hover the stack to fan out.",
      });
      vi.advanceTimersByTime(150);
      burstToast.show({
        title: "History pulse",
        description: "Persisted history stays available after the stack closes.",
      });
    });

    expect(screen.getByText("History pulse")).toBeInTheDocument();
    expect(screen.getByText("New update")).toBeInTheDocument();
    expect(screen.getByText("Workspace loaded")).toBeInTheDocument();
    expect(
      screen.getByText("Persisted history stays available after the stack closes."),
    ).toBeInTheDocument();
    expect(screen.getByText("Hover the stack to fan out.")).toBeInTheDocument();
    expect(screen.getByText("Your configurations are synced.")).toBeInTheDocument();

    const layeredCards = document.querySelectorAll("[data-toaststar-card='true']");

    expect(layeredCards).toHaveLength(3);
    expect(layeredCards[0]).toHaveAttribute("data-collapsed-index", "0");
    expect(layeredCards[1]).toHaveAttribute("data-collapsed-index", "1");
    expect(layeredCards[2]).toHaveAttribute("data-collapsed-index", "2");
    expect(layeredCards[1]).toHaveAttribute("data-phase", "stack");
    expect(layeredCards[2]).toHaveAttribute("data-phase", "stack");
    expect(layeredCards[1]).toHaveAttribute("data-compact", "false");
    expect(layeredCards[2]).toHaveAttribute("data-compact", "false");
  });

  it("expands a collapsed stack when the top toast is tapped on touch devices", async () => {
    vi.useFakeTimers();

    render(
      <ToastProvider
        scope="mobile-fanout"
        portalTarget={false}
        maxCollapsed={3}
        introDuration={0}
      >
        <div>Touch stack</div>
      </ToastProvider>,
    );

    const touchToast = createToastScope("mobile-fanout");

    await act(async () => {
      touchToast.show("First toast");
      touchToast.show("Second toast");
      touchToast.show("Third toast");
      vi.advanceTimersByTime(60);
    });

    expect(screen.getByText("Third toast")).toBeInTheDocument();
    expect(screen.getByText("Second toast")).toBeInTheDocument();
    expect(screen.getByText("First toast")).toBeInTheDocument();

    const collapsedCards = document.querySelectorAll("[data-toaststar-card='true']");
    expect(collapsedCards).toHaveLength(3);
    expect(collapsedCards[1]).toHaveAttribute("data-phase", "stack");
    expect(collapsedCards[2]).toHaveAttribute("data-phase", "stack");

    const topToast = screen
      .getByText("Third toast")
      .closest("[data-toaststar-card='true']");

    expect(topToast).toHaveAttribute("data-expanded", "false");

    await act(async () => {
      fireEvent.pointerDown(topToast as HTMLElement, {
        pointerId: 7,
        pointerType: "touch",
        clientX: 180,
        clientY: 44,
      });
      fireEvent.pointerUp(topToast as HTMLElement, {
        pointerId: 7,
        pointerType: "touch",
        clientX: 180,
        clientY: 44,
      });
    });

    expect(
      screen
        .getByText("Third toast")
        .closest("[data-toaststar-card='true']"),
    ).toHaveAttribute("data-expanded", "true");
    expect(
      document.querySelectorAll("[data-toaststar-card='true']")[1],
    ).toHaveAttribute("data-expanded", "true");
  });

  it("keeps swipe-dismissed toasts offset instead of snapping them back first", async () => {
    vi.useFakeTimers();

    render(
      <ToastProvider scope="swipe-dismiss" portalTarget={false} introDuration={0}>
        <div>Swipe test</div>
      </ToastProvider>,
    );

    const swipeToast = createToastScope("swipe-dismiss");

    await act(async () => {
      swipeToast.show("Swipe me");
      vi.advanceTimersByTime(60);
    });

    await act(async () => {
      const toastCard = screen
        .getByText("Swipe me")
        .closest("[data-toaststar-card='true']") as HTMLElement;

      fireEvent.pointerDown(toastCard, {
        pointerId: 11,
        pointerType: "touch",
        clientX: 160,
        clientY: 42,
      });
      fireEvent.pointerMove(toastCard, {
        pointerId: 11,
        pointerType: "touch",
        clientX: 280,
        clientY: 46,
      });
      fireEvent.pointerUp(toastCard, {
        pointerId: 11,
        pointerType: "touch",
        clientX: 280,
        clientY: 46,
      });
    });

    const closingToast = screen
      .getByText("Swipe me")
      .closest("[data-toaststar-card='true']") as HTMLElement;

    expect(closingToast).toHaveAttribute("data-phase", "closing");
    expect(closingToast).toHaveAttribute("data-swiping", "true");
    expect(closingToast.style.transform).not.toContain("calc(-50% + 0px)");

    await act(async () => {
      vi.advanceTimersByTime(260);
    });

    expect(screen.queryByText("Swipe me")).not.toBeInTheDocument();
  });
});
