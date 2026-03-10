import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastHistoryPanel } from "../ToastHistoryPanel";
import { ToastProvider } from "../ToastProvider";
import { createToastScope } from "../controller";

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
});
