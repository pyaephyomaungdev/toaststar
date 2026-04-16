import { useCallback, useRef } from "react";

export interface UseBurstDetectionOptions {
  burstWindow: number;
}

export function useBurstDetection({ burstWindow }: UseBurstDetectionOptions) {
  const burstEventsRef = useRef<number[]>([]);

  const registerBurstEvent = useCallback(() => {
    const now = Date.now();
    const activeEvents = burstEventsRef.current.filter(
      (eventTime) => now - eventTime <= burstWindow,
    );
    activeEvents.push(now);
    burstEventsRef.current = activeEvents;
    return activeEvents.length;
  }, [burstWindow]);

  return { registerBurstEvent };
}
