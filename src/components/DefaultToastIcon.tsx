import type { ToastIntent } from "../types";

export function DefaultToastIcon({ intent }: { intent: ToastIntent }) {
  if (intent === "success") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M5.2 10.6 8.3 13.8 14.8 6.9"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.1"
        />
      </svg>
    );
  }

  if (intent === "error") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M6.4 6.4 13.6 13.6M13.6 6.4 6.4 13.6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.1"
        />
      </svg>
    );
  }

  if (intent === "warning") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M10 4.1 16.2 15.4H3.8L10 4.1Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M10 7.6V10.8M10 13.5H10.01"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (intent === "info") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path
          d="M10 8.4V13.2M10 5.9H10.01"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.1"
        />
        <circle cx="10" cy="10" r="7.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7.2 10H12.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.1"
      />
    </svg>
  );
}
