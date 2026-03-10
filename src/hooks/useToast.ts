import { useContext } from "react";
import {
  ToastActionsContext,
  ToastHistoryContext,
  ToastStateContext,
} from "../context/toastContext";
import type {
  ToastActionContextValue,
  ToastContextValue,
  ToastHistoryContextValue,
  ToastStateContextValue,
} from "../types";

export function useToastActions(): ToastActionContextValue {
  const context = useContext(ToastActionsContext);

  if (!context) {
    throw new Error("useToastActions must be used inside a ToastProvider");
  }

  return context;
}

export function useToastState(): ToastStateContextValue {
  const context = useContext(ToastStateContext);

  if (!context) {
    throw new Error("useToastState must be used inside a ToastProvider");
  }

  return context;
}

export function useToastHistory(): ToastHistoryContextValue {
  const context = useContext(ToastHistoryContext);

  if (!context) {
    throw new Error("useToastHistory must be used inside a ToastProvider");
  }

  return context;
}

export function useToast(): ToastContextValue {
  return {
    ...useToastActions(),
    ...useToastState(),
    ...useToastHistory(),
  };
}
