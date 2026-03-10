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
