import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../ToastProvider";
import { createToastScope } from "../controller";

describe("reduced motion", () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    vi.stubGlobal("matchMedia", matchMediaMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips drag rotation when reduced motion is preferred", async () => {
    vi.useFakeTimers();

    render(
      <ToastProvider scope="reduced-drag" portalTarget={false} introDuration={0}>
        <div>Reduced motion drag</div>
      </ToastProvider>,
    );

    const scopedToast = createToastScope("reduced-drag");

    await act(async () => {
      scopedToast.show("Drag me gently");
      vi.advanceTimersByTime(60);
    });

    await act(async () => {
      const toastCard = screen
        .getByText("Drag me gently")
        .closest("[data-toaststar-card='true']") as HTMLElement;

      fireEvent.pointerDown(toastCard, {
        pointerId: 50,
        pointerType: "touch",
        clientX: 100,
        clientY: 42,
      });
      fireEvent.pointerMove(toastCard, {
        pointerId: 50,
        pointerType: "touch",
        clientX: 140,
        clientY: 42,
      });
    });

    const toastCard = screen
      .getByText("Drag me gently")
      .closest("[data-toaststar-card='true']") as HTMLElement;

    // With reduced motion, rotation should be 0
    expect(toastCard.style.transform).toContain("rotate(0deg)");
    // With reduced motion, opacity should not be reduced during drag
    expect(toastCard.style.opacity).toBe("1");
  });

  it("includes reduced-motion CSS rule for indeterminate progress", () => {
    render(
      <ToastProvider scope="reduced-style" portalTarget={false}>
        <div>Style check</div>
      </ToastProvider>,
    );

    const styleTag = document.head.querySelector("#toaststar-styles");
    expect(styleTag?.textContent).toContain("prefers-reduced-motion: reduce");
    expect(styleTag?.textContent).toContain(
      '.toaststar-progress[data-mode="indeterminate"] .toaststar-progress-fill',
    );
  });
});
