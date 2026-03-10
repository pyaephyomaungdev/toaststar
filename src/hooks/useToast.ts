import { useContext } from "react";
import { ToastContext } from "../context/toastContext";
import type { ToastContextValue } from "../types";

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider");
  }

  return context;
}

export function useToastHistory(): Pick<
  ToastContextValue,
  "history" | "clearHistory"
> {
  const { history, clearHistory } = useToast();
  return { history, clearHistory };
}
