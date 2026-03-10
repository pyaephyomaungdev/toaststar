import { resolveToastTheme } from "./themes";
import { useToastHistory } from "./hooks/useToast";
import type { ToastHistoryPanelProps } from "./types";

function formatDateTime(value: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(value);
  } catch {
    return new Date(value).toLocaleString();
  }
}

export function ToastHistoryPanel({
  title = "Notification history",
  emptyMessage = "No notifications have been stored yet.",
  maxItems = 12,
  theme = "midnight",
  appearance,
  style,
  className,
}: ToastHistoryPanelProps) {
  const { history, clearHistory } = useToastHistory();
  const items = history.slice(0, maxItems);
  const resolvedTheme = resolveToastTheme(theme, "default", appearance);

  return (
    <section
      className={["toaststar-history-panel", className]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...style,
        ["--toaststar-radius" as string]: resolvedTheme.radius,
        ["--toaststar-background" as string]: resolvedTheme.background,
        ["--toaststar-border" as string]: resolvedTheme.border,
        ["--toaststar-color" as string]: resolvedTheme.color,
        ["--toaststar-shadow" as string]: resolvedTheme.shadow,
        ["--toaststar-blur" as string]: resolvedTheme.blur,
        ["--toaststar-width" as string]: resolvedTheme.width,
        ["--toaststar-accent" as string]: resolvedTheme.accent,
        ["--toaststar-close-background" as string]:
          resolvedTheme.closeButtonBackground,
      }}
    >
      <div className="toaststar-history-header">
        <div className="toaststar-history-title">{title}</div>
        {items.length > 0 ? (
          <button
            type="button"
            className="toaststar-history-clear"
            onClick={() => {
              void clearHistory().catch(() => undefined);
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
      {items.length === 0 ? (
        <div className="toaststar-history-empty">{emptyMessage}</div>
      ) : (
        <ol className="toaststar-history-list">
          {items.map((item) => (
            <li key={item.id} className="toaststar-history-item">
              <span
                className="toaststar-icon"
                style={{ ["--toaststar-accent" as string]: resolvedTheme.accent }}
                aria-hidden="true"
              />
              <div className="toaststar-history-meta">
                <div className="toaststar-title">{item.title}</div>
                {item.description ? (
                  <div className="toaststar-description">{item.description}</div>
                ) : null}
                <time className="toaststar-history-time" dateTime={new Date(item.createdAt).toISOString()}>
                  {formatDateTime(item.createdAt)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
