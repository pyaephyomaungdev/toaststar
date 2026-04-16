import { useCallback } from "react";
import type { ToastCloseReason, ToastRecord } from "../types";

export interface UseToastNotificationsOptions {
  onToastOpen?: (toast: ToastRecord) => void;
  onToastClose?: (toast: ToastRecord, reason: ToastCloseReason) => void;
  onToastAction?: (toast: ToastRecord) => void;
}

export function useToastNotifications({
  onToastOpen,
  onToastClose,
  onToastAction,
}: UseToastNotificationsOptions) {
  const notifyOpened = useCallback(
    (toastRecord: ToastRecord) => {
      toastRecord.onOpen?.(toastRecord.id);
      onToastOpen?.(toastRecord);
    },
    [onToastOpen],
  );

  const notifyClosed = useCallback(
    (toastRecord: ToastRecord, reason: ToastCloseReason) => {
      if (reason === "auto") {
        toastRecord.onAutoClose?.(toastRecord.id);
      }

      toastRecord.onClose?.(toastRecord.id, reason);
      onToastClose?.(toastRecord, reason);
    },
    [onToastClose],
  );

  const notifyAction = useCallback(
    (toastRecord: ToastRecord) => {
      toastRecord.onAction?.(toastRecord.id);
      onToastAction?.(toastRecord);
    },
    [onToastAction],
  );

  return { notifyOpened, notifyClosed, notifyAction };
}
