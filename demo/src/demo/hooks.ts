import { useCallback, useEffect, useState } from "react";

export function useHaptic() {
  const trigger = useCallback(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  return { trigger };
}

export function useHeroIntro() {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [introActive, setIntroActive] = useState(!prefersReducedMotion);
  const [contentVisible, setContentVisible] = useState(prefersReducedMotion);
  const [targetVisible, setTargetVisible] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setContentVisible(true);
      setTargetVisible(true);
      setIntroActive(false);
      return;
    }

    const revealTimer = window.setTimeout(() => setContentVisible(true), 880);
    const targetTimer = window.setTimeout(() => setTargetVisible(true), 1160);
    const finishTimer = window.setTimeout(() => setIntroActive(false), 1320);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(targetTimer);
      window.clearTimeout(finishTimer);
    };
  }, [prefersReducedMotion]);

  return {
    contentVisible,
    introActive,
    targetVisible,
  };
}
