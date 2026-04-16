import { createContext } from "react";
import type {
  ToastActionContextValue,
  ToastHistoryContextValue,
  ToastStateContextValue,
} from "../types";

export const ToastActionsContext = createContext<ToastActionContextValue | null>(null);
export const ToastStateContext = createContext<ToastStateContextValue | null>(null);
export const ToastHistoryContext = createContext<ToastHistoryContextValue | null>(null);
