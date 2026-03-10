import { describe, expect, it, vi } from "vitest";
import { createToastScope, subscribeToToastCommands } from "../controller";

describe("toast controller scopes", () => {
  it("delivers commands only to the matching scope", () => {
    const alphaCommands: string[] = [];
    const betaCommands: string[] = [];
    const unsubscribeAlpha = subscribeToToastCommands((command) => {
      alphaCommands.push(command.type);
    }, "alpha");
    const unsubscribeBeta = subscribeToToastCommands((command) => {
      betaCommands.push(command.type);
    }, "beta");

    createToastScope("alpha").show("Alpha toast");
    createToastScope("beta").clear();

    expect(alphaCommands).toEqual(["show"]);
    expect(betaCommands).toEqual(["clear"]);

    unsubscribeAlpha();
    unsubscribeBeta();
  });

  it("flushes pending commands when a scoped provider subscribes later", () => {
    createToastScope("delayed").show("Queued toast");
    const receivedCommands: string[] = [];
    const unsubscribe = subscribeToToastCommands((command) => {
      receivedCommands.push(command.type);
    }, "delayed");

    expect(receivedCommands).toEqual(["show"]);

    unsubscribe();
  });

  it("keeps the default singleton scope stable after route changes", async () => {
    window.history.replaceState({}, "", "/alpha");
    vi.resetModules();

    const { toast, subscribeToToastCommands: subscribe } = await import("../controller");
    const receivedCommands: string[] = [];
    const unsubscribe = subscribe((command) => {
      receivedCommands.push(command.type);
    });

    toast.show("Alpha route toast");
    window.history.replaceState({}, "", "/beta");
    toast.clear();

    expect(receivedCommands).toEqual(["show", "clear"]);

    unsubscribe();
  });
});
