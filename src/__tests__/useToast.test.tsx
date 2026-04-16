import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useToast, useToastActions, useToastHistory, useToastState } from "../hooks/useToast";
import { ToastProvider } from "../ToastProvider";
import type { ReactNode } from "react";

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ToastProvider
      scope="hook-test"
      history={{ enabled: true, storage: "memory", limit: 10 }}
      portalTarget={false}
    >
      {children}
    </ToastProvider>
  );
}

describe("useToastActions", () => {
  it("throws when used outside ToastProvider", () => {
    expect(() => renderHook(() => useToastActions())).toThrow(
      "useToastActions must be used inside a ToastProvider",
    );
  });

  it("returns action methods inside provider", () => {
    const { result } = renderHook(() => useToastActions(), { wrapper: Wrapper });
    expect(result.current.show).toBeTypeOf("function");
    expect(result.current.dismiss).toBeTypeOf("function");
    expect(result.current.clear).toBeTypeOf("function");
    expect(result.current.loading).toBeTypeOf("function");
    expect(result.current.update).toBeTypeOf("function");
    expect(result.current.promise).toBeTypeOf("function");
    expect(result.current.success).toBeTypeOf("function");
    expect(result.current.error).toBeTypeOf("function");
    expect(result.current.info).toBeTypeOf("function");
    expect(result.current.warning).toBeTypeOf("function");
    expect(result.current.notify).toBeTypeOf("function");
  });
});

describe("useToastState", () => {
  it("throws when used outside ToastProvider", () => {
    expect(() => renderHook(() => useToastState())).toThrow(
      "useToastState must be used inside a ToastProvider",
    );
  });

  it("returns state inside provider", () => {
    const { result } = renderHook(() => useToastState(), { wrapper: Wrapper });
    expect(result.current.toasts).toEqual([]);
    expect(result.current.position).toBe("top");
  });
});

describe("useToastHistory", () => {
  it("throws when used outside ToastProvider", () => {
    expect(() => renderHook(() => useToastHistory())).toThrow(
      "useToastHistory must be used inside a ToastProvider",
    );
  });

  it("returns history API inside provider", () => {
    const { result } = renderHook(() => useToastHistory(), { wrapper: Wrapper });
    expect(result.current.history).toEqual([]);
    expect(result.current.clearHistory).toBeTypeOf("function");
    expect(result.current.exportHistory).toBeTypeOf("function");
    expect(result.current.importHistory).toBeTypeOf("function");
    expect(result.current.reloadHistory).toBeTypeOf("function");
    expect(result.current.postHistory).toBeTypeOf("function");
    expect(result.current.fetchHistory).toBeTypeOf("function");
  });
});

describe("useToast", () => {
  it("returns combined actions, state, and history", () => {
    const { result } = renderHook(() => useToast(), { wrapper: Wrapper });
    // Actions
    expect(result.current.show).toBeTypeOf("function");
    expect(result.current.dismiss).toBeTypeOf("function");
    // State
    expect(result.current.toasts).toEqual([]);
    expect(result.current.position).toBe("top");
    // History
    expect(result.current.history).toEqual([]);
    expect(result.current.clearHistory).toBeTypeOf("function");
  });
});
