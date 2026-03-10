import { useEffect } from "react";

const STYLE_ID = "toaststar-styles";

const TOASTSTAR_STYLES = `
.toaststar-layer {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
  isolation: isolate;
}

.toaststar-toast {
  position: fixed;
  left: 50%;
  width: var(--toaststar-width);
  max-width: calc(100vw - 24px);
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  padding: 15px 15px;
  overflow: hidden;
  border-radius: var(--toaststar-radius);
  border: var(--toaststar-border);
  background: var(--toaststar-background);
  box-shadow: var(--toaststar-shadow);
  color: var(--toaststar-color);
  backdrop-filter: blur(var(--toaststar-blur));
  -webkit-backdrop-filter: blur(var(--toaststar-blur));
  transition:
    top 420ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 180ms ease,
    box-shadow 220ms ease;
  will-change: top, transform, opacity;
  isolation: isolate;
  transform-origin: center center;
  touch-action: pan-y;
}

.toaststar-toast::after {
  content: "";
  position: absolute;
  inset: 1px;
  border-radius: calc(var(--toaststar-radius) - 1px);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 44%);
  opacity: 0.75;
  pointer-events: none;
}

.toaststar-toast:hover {
  box-shadow: 0 26px 72px rgba(4, 8, 18, 0.34);
}

.toaststar-toast[data-expanded="false"] {
  cursor: default;
}

.toaststar-toast[data-phase="center"],
.toaststar-toast[data-phase="docking"] {
  box-shadow: 0 34px 90px rgba(3, 6, 15, 0.34);
}

.toaststar-toast[data-phase="closing"] {
  opacity: 0;
}

.toaststar-toast[data-swiping="true"] {
  transition:
    top 420ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 180ms ease,
    box-shadow 220ms ease;
}

.toaststar-toast[data-compact="true"] {
  align-items: center;
  padding-top: 11px;
  padding-bottom: 11px;
}

.toaststar-toast[data-compact="true"] .toaststar-icon-slot {
  padding-top: 0;
}

.toaststar-toast[data-compact="true"] .toaststar-body {
  padding: 0;
}

.toaststar-icon-slot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  min-width: 30px;
  padding-top: 3px;
}

.toaststar-icon-frame {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--toaststar-accent);
  border: 1px solid color-mix(in srgb, var(--toaststar-accent) 18%, transparent);
  background: color-mix(in srgb, var(--toaststar-accent) 10%, transparent);
}

.toaststar-default-icon,
.toaststar-custom-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.toaststar-default-icon svg,
.toaststar-custom-icon svg,
.toaststar-custom-icon img {
  width: 16px;
  height: 16px;
  display: block;
}

.toaststar-custom-icon {
  font-size: 16px;
  line-height: 1;
}

.toaststar-icon {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--toaststar-accent);
  box-shadow: 0 0 0 9px color-mix(in srgb, var(--toaststar-accent) 18%, transparent);
}

.toaststar-body {
  min-width: 0;
}

.toaststar-toast[data-custom-body="true"] .toaststar-body {
  padding-top: 1px;
}

.toaststar-custom-body {
  min-width: 0;
}

.toaststar-custom-body > * {
  min-width: 0;
}

.toaststar-toast[data-compact="true"] .toaststar-title-row {
  min-height: 30px;
  align-items: center;
}

.toaststar-chrome {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  align-self: start;
  gap: 8px;
  min-height: 28px;
}

.toaststar-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toaststar-title {
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.toaststar-description {
  margin-top: 7px;
  font-size: 0.9rem;
  line-height: 1.48;
  color: color-mix(in srgb, var(--toaststar-color) 82%, transparent);
}

.toaststar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.toaststar-action {
  appearance: none;
  border: 1px solid color-mix(in srgb, var(--toaststar-accent) 22%, transparent);
  border-radius: 999px;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--toaststar-accent) 16%, transparent);
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.toaststar-action:hover {
  background: color-mix(in srgb, var(--toaststar-accent) 28%, transparent);
}

.toaststar-close {
  appearance: none;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: var(--toaststar-close-background);
  color: inherit;
  font: inherit;
  font-size: 0.98rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.72;
}

.toaststar-close:hover {
  opacity: 1;
}

.toaststar-close-slot {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
}

.toaststar-count {
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--toaststar-background) 78%, black 22%);
  border: var(--toaststar-border);
  font-size: 0.78rem;
  font-weight: 650;
  line-height: 1;
}

.toaststar-progress {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 8px;
  height: 3px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--toaststar-color) 12%, transparent);
  overflow: hidden;
  pointer-events: none;
}

.toaststar-progress-fill {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--toaststar-accent) 66%, white 34%),
    var(--toaststar-accent)
  );
  transform: scaleX(0);
}

.toaststar-progress[data-mode="indeterminate"] .toaststar-progress-fill {
  width: 44%;
  transform: translateX(-100%);
  animation: toaststar-progress-indeterminate 1.15s linear infinite;
}

.toaststar-toast[data-compact="true"] .toaststar-progress {
  bottom: 6px;
}

.toaststar-history-panel {
  padding: 20px;
  border-radius: var(--toaststar-radius);
  border: var(--toaststar-border);
  background: var(--toaststar-background);
  box-shadow: var(--toaststar-shadow);
  color: var(--toaststar-color);
  backdrop-filter: blur(var(--toaststar-blur));
  -webkit-backdrop-filter: blur(var(--toaststar-blur));
}

.toaststar-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.toaststar-history-title {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
}

.toaststar-history-clear {
  appearance: none;
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  background: var(--toaststar-close-background);
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.toaststar-history-list {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.toaststar-history-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  padding: 14px 0 0;
  border-top: 1px solid color-mix(in srgb, var(--toaststar-color) 12%, transparent);
}

.toaststar-history-item:first-child {
  border-top: 0;
  padding-top: 0;
}

.toaststar-history-meta {
  min-width: 0;
}

.toaststar-history-time {
  display: block;
  margin-top: 6px;
  font-size: 0.8rem;
  opacity: 0.68;
}

.toaststar-history-empty {
  margin-top: 16px;
  font-size: 0.92rem;
  opacity: 0.74;
}

@keyframes toaststar-progress-indeterminate {
  0% {
    transform: translateX(-110%);
  }

  100% {
    transform: translateX(240%);
  }
}

@media (max-width: 640px) {
  .toaststar-toast {
    gap: 12px;
    padding: 14px 15px;
  }

  .toaststar-icon-slot {
    width: 28px;
    min-width: 28px;
  }

  .toaststar-icon-frame {
    width: 28px;
    height: 28px;
  }

}

@media (prefers-reduced-motion: reduce) {
  .toaststar-toast {
    transition:
      top 160ms linear,
      transform 160ms linear,
      opacity 160ms linear;
  }
}
`;

export function useToaststarStyles(): void {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = TOASTSTAR_STYLES;
    document.head.appendChild(style);
  }, []);
}
