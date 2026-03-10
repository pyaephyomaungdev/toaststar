import {
  startTransition,
  useDeferredValue,
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  ToastHistoryPanel,
  ToastProvider,
  createToastScope,
} from "toaststar";

const DEMO_SCOPE = "toaststar-demo";
const toast = createToastScope(DEMO_SCOPE);

function SparkIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" width="18" height="18">
      <path
        d="M10 2.8 11.7 8.3 17.2 10 11.7 11.7 10 17.2 8.3 11.7 2.8 10 8.3 8.3 10 2.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" width="18" height="18">
      <path
        d="M10 16.2a2.1 2.1 0 0 0 2-1.5H8a2.1 2.1 0 0 0 2 1.5Zm5-2.5H5c.8-.8 1.3-1.9 1.3-3.2V8.7c0-2.2 1.6-4 3.7-4.2V4a.7.7 0 1 1 1.4 0v.5c2.1.2 3.7 2 3.7 4.2v1.8c0 1.3.5 2.4 1.3 3.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" width="18" height="18">
      <path
        d="M3.5 5.2h13l-1 9.1H4.5l-1-9.1Zm3.1 4.8H8a2 2 0 0 0 4 0h1.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" width="18" height="18">
      <path
        d="M6.3 15.4a3.4 3.4 0 1 1 .4-6.9 4.5 4.5 0 0 1 8.6 1.4 2.8 2.8 0 0 1 .3 5.5H6.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

type ViewMode = "home" | "use-cases" | "examples";
type ProviderAppearance = NonNullable<
  ComponentProps<typeof ToastProvider>["appearance"]
>;
type ThemeOption = "glass" | "midnight" | "sunset" | "forest" | "ocean";
type PositionOption =
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
type IntentOption = "default" | "success" | "error" | "info" | "warning";
type OverflowOption = "queue" | "drop-oldest" | "drop-newest";
type DedupeOption = "ignore" | "update" | "reset-duration";

interface HomeViewProps {
  radius: number;
  blur: number;
  hapticTrigger: () => void;
  historyEnabled: boolean;
  theme: ThemeOption;
  position: PositionOption;
  showProgress: boolean;
  swipeToDismiss: boolean;
  expandOnHover: boolean;
  pauseOnHover: boolean;
  builtInLayer: boolean;
  portalEnabled: boolean;
  limitVisible: boolean;
  maxVisible: number;
  queueLimit: number;
  overflowStrategy: OverflowOption;
  dedupeBehavior: DedupeOption;
  providerAppearance: ProviderAppearance;
  onRadiusChange: (next: number) => void;
  onBlurChange: (next: number) => void;
  onHistoryChange: (next: boolean) => void;
  onThemeChange: (next: ThemeOption) => void;
  onPositionChange: (next: PositionOption) => void;
  onShowProgressChange: (next: boolean) => void;
  onSwipeToDismissChange: (next: boolean) => void;
  onExpandOnHoverChange: (next: boolean) => void;
  onPauseOnHoverChange: (next: boolean) => void;
  onBuiltInLayerChange: (next: boolean) => void;
  onPortalEnabledChange: (next: boolean) => void;
  onLimitVisibleChange: (next: boolean) => void;
  onMaxVisibleChange: (next: number) => void;
  onQueueLimitChange: (next: number) => void;
  onOverflowStrategyChange: (next: OverflowOption) => void;
  onDedupeBehaviorChange: (next: DedupeOption) => void;
}

interface HeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
}

interface UseCaseDefinition {
  label: string;
  title: string;
  description: string;
  icon: ReactNode;
  actionLabel: string;
  onTrigger: () => void;
  featured?: boolean;
}

interface ExampleDefinition {
  label: string;
  title: string;
  description: string;
  code: string;
  actionLabel: string;
  onTrigger: () => void;
}

interface BuilderExampleGroup {
  title: string;
  items: Array<{
    label: string;
    onTrigger: () => void;
  }>;
}

const HIGHLIGHT_PLACEHOLDER_START = "\uE000";
const HIGHLIGHT_PLACEHOLDER_END = "\uE001";
const HIGHLIGHT_COMMENT_PATTERN = /\/\/[^\n]*/g;
const HIGHLIGHT_STRING_PATTERN = /"[^"]*"|'[^']*'|`[^`]*`/g;
const HIGHLIGHT_TAG_PATTERN = /&lt;\/?[A-Za-z][\w.]*/g;
const HIGHLIGHT_FUNCTION_PATTERN = /\btoast(?:\.\w+)?\b/g;
const HIGHLIGHT_KEYWORD_PATTERN =
  /\b(?:import|from|export|default|function|return|const|let|var|type|interface)\b/g;
const HIGHLIGHT_BRACKET_PATTERN = /[{}[\]()]/g;
const HIGHLIGHT_PLACEHOLDER_PATTERN = /\uE000(\d+)\uE001/g;
const HIGHLIGHT_TOKEN_STYLES = {
  keyword: "color:#7c3aed;font-weight:600;",
  function: "color:#2563eb;",
  string: "color:#0891b2;",
  tag: "color:#db2777;",
  bracket: "color:#64748b;",
  comment: "color:#94a3b8;font-style:italic;",
} as const;
const SURFACE_CLASS_NAME =
  "relative flex flex-col overflow-hidden rounded-[32px] border border-[color:var(--page-border)] bg-[var(--surface-bg)] shadow-[var(--surface-shadow)] backdrop-blur-[24px] backdrop-saturate-[120%]";
const SURFACE_SHEEN_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, var(--page-border-inner), transparent 40%)",
};
const SURFACE_SPOTLIGHT_STYLE: React.CSSProperties = {
  background:
    "radial-gradient(600px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(255, 255, 255, 0.06), transparent 40%)",
};
const SURFACE_SPOTLIGHT_GLOW_STYLE: React.CSSProperties = {
  background:
    "radial-gradient(400px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(255, 255, 255, 0.12), transparent 40%)",
};
const SLIDE_UP_STYLE: React.CSSProperties = {
  animation: "slideUpFade 560ms cubic-bezier(0.16, 1, 0.3, 1) both",
};
const DELAYED_SLIDE_UP_STYLE: React.CSSProperties = {
  ...SLIDE_UP_STYLE,
  animationDelay: "300ms",
};
const HAPTIC_PULSE_STYLE: React.CSSProperties = {
  animation: "toaststarPulse 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
};
const FLOAT_GLOW_STYLE: React.CSSProperties = {
  animation: "floatGlow 25s ease-in-out infinite",
};
const LANDING_THEME_SURFACE_LABELS: Record<ThemeOption, string> = {
  glass: "Frosted glass",
  midnight: "Midnight ink",
  sunset: "Apricot haze",
  forest: "Earth tone",
  ocean: "Blue current",
};

function escapeCodeHtml(code: string) {
  return code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function wrapHighlightToken(style: string, value: string) {
  return `<span style="${style}">${value}</span>`;
}

function highlightCode(code: string) {
  const tokens: string[] = [];
  let highlighted = escapeCodeHtml(code);

  const stash = (html: string) => {
    const index = tokens.push(html) - 1;
    return `${HIGHLIGHT_PLACEHOLDER_START}${index}${HIGHLIGHT_PLACEHOLDER_END}`;
  };

  const applyPattern = (pattern: RegExp, style: string) => {
    highlighted = highlighted.replace(pattern, (match) =>
      stash(wrapHighlightToken(style, match)),
    );
  };

  applyPattern(HIGHLIGHT_COMMENT_PATTERN, HIGHLIGHT_TOKEN_STYLES.comment);
  applyPattern(HIGHLIGHT_STRING_PATTERN, HIGHLIGHT_TOKEN_STYLES.string);
  applyPattern(HIGHLIGHT_TAG_PATTERN, HIGHLIGHT_TOKEN_STYLES.tag);
  applyPattern(HIGHLIGHT_FUNCTION_PATTERN, HIGHLIGHT_TOKEN_STYLES.function);
  applyPattern(HIGHLIGHT_KEYWORD_PATTERN, HIGHLIGHT_TOKEN_STYLES.keyword);
  applyPattern(HIGHLIGHT_BRACKET_PATTERN, HIGHLIGHT_TOKEN_STYLES.bracket);

  return highlighted.replace(HIGHLIGHT_PLACEHOLDER_PATTERN, (_, index) => {
    return tokens[Number(index)] ?? "";
  });
}

const INSTALL_SNIPPET = "npm install toaststar";

const SETUP_SNIPPET = `import { ToastProvider, createToastScope } from "toaststar";

const appToast = createToastScope("marketing-site");

export default function App() {
  return (
    <ToastProvider
      scope="marketing-site"
      position="top"
      defaultTheme="glass"
      maxVisible={3}
      queueLimit={8}
      overflowStrategy="queue"
      dedupeBehavior="update"
      history={{ enabled: true, storage: "indexeddb", limit: 30 }}
    >
      <Dashboard />
    </ToastProvider>
  );
}`;

const FIRST_TOAST_SNIPPET = `import { createToastScope } from "toaststar";

const appToast = createToastScope("marketing-site");

function SaveButton() {
  return (
    <button
      onClick={() =>
        appToast.success({
          title: "Profile saved",
          description: "Your latest changes are live.",
        })}
    >
      Save changes
    </button>
  );
}`;

const HISTORY_SNIPPET = `<ToastProvider
  scope="marketing-site"
  history={{ enabled: true, storage: "indexeddb", limit: 30 }}
>
  <AppShell />
</ToastProvider>

<ToastHistoryPanel
  title="Recent notifications"
  theme="glass"
  maxItems={8}
/>;

// swap storage to "memory" for session-only history`;

const SCOPED_RUNTIME_SNIPPET = `import { ToastProvider, createToastScope } from "toaststar";

const checkoutToast = createToastScope("checkout");

<ToastProvider scope="checkout">
  <CheckoutFlow />
</ToastProvider>;

checkoutToast.success("Payment captured");`;

const LOADING_SNIPPET = `const toastId = toast.loading({
  title: "Uploading design system",
  description: "Keeping the card open while work is running.",
  showProgress: true,
});

toast.update(toastId, {
  title: "Upload finished",
  description: "Every asset passed validation.",
  intent: "success",
  loading: false,
  persistent: false,
});`;

const PROMISE_SNIPPET = `await toast.promise(saveProfile(), {
  loading: {
    title: "Saving profile",
    description: "Waiting for the API to finish.",
    showProgress: true,
  },
  success: {
    title: "Profile saved",
    description: "The new settings are live.",
  },
  error: (error) => ({
    title: "Save failed",
    description:
      error instanceof Error ? error.message : "Please try again.",
  }),
});`;

const QUEUE_SNIPPET = `toast.show({
  title: "Sync batch started",
  dedupeKey: "sync-batch",
});

toast.show({
  title: "Sync batch started",
  description: "The existing toast is updated instead of duplicated.",
  dedupeKey: "sync-batch",
});`;

const LIFECYCLE_SNIPPET = `toast.show({
  title: "Undoable archive",
  action: {
    label: "Undo",
    onClick: restoreRow,
  },
  onOpen: (id) => analytics.track("toast_open", { id }),
  onAction: (id) => analytics.track("toast_action", { id }),
  onClose: (id, reason) =>
    analytics.track("toast_close", { id, reason }),
});`;

const HEADLESS_SNIPPET = `import { ToastProvider } from "toaststar";

<ToastProvider headless portalTarget={false}>
  <AppShell />
</ToastProvider>;`;

const CUSTOM_BODY_SNIPPET = `function ReleaseStatusCard() {
  return (
    <div className="grid gap-3">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Custom component body
        </div>
        <div className="mt-1 text-base font-semibold text-slate-900">
          Design system release
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <span className="block h-full w-[82%] rounded-full bg-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button">Inspect build</button>
        <button type="button">Acknowledge</button>
      </div>
    </div>
  );
}

toast.show({
  title: "Design system release",
  body: <ReleaseStatusCard />,
  icon: <SparkIcon />,
});`;

const DOC_QUICKSTART_STEPS = [
  {
    step: "01",
    eyebrow: "Install",
    title: "Add the package",
    description:
      "Install one package and keep the setup close to your app root.",
    code: INSTALL_SNIPPET,
  },
  {
    step: "02",
    eyebrow: "Provider",
    title: "Mount one provider near the root",
    description:
      "Use one shared provider for the app, then add a scope only when multiple widgets or micro-frontends need isolation.",
    code: SETUP_SNIPPET,
  },
  {
    step: "03",
    eyebrow: "First toast",
    title: "Trigger feedback from real UI events",
    description:
      "Call `appToast.success` for common confirmations, then switch to `appToast.show` when you need more control.",
    code: FIRST_TOAST_SNIPPET,
  },
] as const;

const DOC_LIVE_TOASTS = [
  {
    id: "success",
    label: "Play toast",
    description: "Simple save confirmation.",
    action: showSuccessToast,
    code: FIRST_TOAST_SNIPPET,
  },
  {
    id: "promise",
    label: "Play toast",
    description: "Pending to success with one API call.",
    action: showPromiseFlow,
    code: PROMISE_SNIPPET,
  },
  {
    id: "dedupe",
    label: "Play toast",
    description: "Repeated events update one toast instead of stacking.",
    action: showDedupeFlow,
    code: QUEUE_SNIPPET,
  },
  {
    id: "custom-body",
    label: "Play toast",
    description: "Render a richer component body inside the toast shell.",
    action: showCustomBodyToast,
    code: CUSTOM_BODY_SNIPPET,
  },
] as const;

function wait(duration: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

function useHaptic() {
  const [pulsing, setPulsing] = useState(false);
  const trigger = useCallback(() => {
    setPulsing(false);
    requestAnimationFrame(() => setPulsing(true));
    setTimeout(() => setPulsing(false), 200);
  }, []);

  return { pulsing, trigger };
}

const CUSTOM_BODY_STYLES: Record<
  IntentOption,
  {
    badge: string;
    meta: string;
    fill: string;
    primary: string;
    secondary: string;
  }
> = {
  default: {
    badge: "border-[#d7ddf3] bg-[#f6f8ff] text-[#4966c7]",
    meta: "bg-[#eef2ff] text-[#3b57b9]",
    fill: "bg-gradient-to-r from-[#4e6edc] to-[#7f95ee]",
    primary:
      "border-[#ccd6f6] bg-[#eef2ff] text-[#2947ae] hover:border-[#b9c8f4] hover:bg-white",
    secondary:
      "border-[#e2e7f5] bg-white text-[#5b6788] hover:border-[#d1dbf3] hover:bg-[#f8faff]",
  },
  success: {
    badge: "border-[#cfe7d5] bg-[#eff9f1] text-[#257646]",
    meta: "bg-[#e8f7eb] text-[#2b7348]",
    fill: "bg-gradient-to-r from-[#2f8a55] to-[#67c087]",
    primary:
      "border-[#cae4d2] bg-[#eef9f1] text-[#247042] hover:border-[#bddfc8] hover:bg-white",
    secondary:
      "border-[#dce8df] bg-white text-[#5b7565] hover:border-[#cae0d1] hover:bg-[#f7fbf8]",
  },
  error: {
    badge: "border-[#efd4d7] bg-[#fff3f4] text-[#b44754]",
    meta: "bg-[#fff0f1] text-[#b34250]",
    fill: "bg-gradient-to-r from-[#cf5060] to-[#f08e83]",
    primary:
      "border-[#f0d0d5] bg-[#fff1f3] text-[#a13a49] hover:border-[#e8bcc4] hover:bg-white",
    secondary:
      "border-[#eedfe3] bg-white text-[#84616a] hover:border-[#e6ced4] hover:bg-[#fff9f9]",
  },
  warning: {
    badge: "border-[#f0deca] bg-[#fff8ef] text-[#b46a1d]",
    meta: "bg-[#fff4e4] text-[#b06720]",
    fill: "bg-gradient-to-r from-[#d07d28] to-[#f2bd63]",
    primary:
      "border-[#efdbc5] bg-[#fff7ed] text-[#9e5f1f] hover:border-[#e8cfb1] hover:bg-white",
    secondary:
      "border-[#eee3d6] bg-white text-[#856d52] hover:border-[#e7d7c4] hover:bg-[#fffaf4]",
  },
  info: {
    badge: "border-[#d6e0f7] bg-[#f1f5ff] text-[#3e61c8]",
    meta: "bg-[#eef3ff] text-[#3c5ebf]",
    fill: "bg-gradient-to-r from-[#4d71e2] to-[#7aa4ff]",
    primary:
      "border-[#ccd8f6] bg-[#eef3ff] text-[#2d4daf] hover:border-[#bbcbee] hover:bg-white",
    secondary:
      "border-[#dfe6f7] bg-white text-[#607090] hover:border-[#cedaf4] hover:bg-[#f8faff]",
  },
};

function DemoCustomToastBody(props: {
  title: string;
  description?: string;
  intent?: IntentOption;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}) {
  const {
    title,
    description,
    intent = "default",
    primaryLabel = "Inspect build",
    secondaryLabel = "Acknowledge",
    onPrimary,
    onSecondary,
  } = props;
  const tone = CUSTOM_BODY_STYLES[intent];

  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${tone.badge}`}
          >
            Custom component body
          </span>
          <div className="mt-2 text-[0.98rem] font-semibold leading-[1.25] text-[#19233f]">
            {title}
          </div>
          {description ? (
            <p className="mt-1 text-[0.88rem] leading-[1.55] text-[#677189]">
              {description}
            </p>
          ) : null}
        </div>
        <span
          className={`inline-flex min-h-[30px] items-center justify-center rounded-full px-3 text-[0.74rem] font-semibold ${tone.meta}`}
        >
          live
        </span>
      </div>

      <div className="overflow-hidden rounded-full bg-[#dde4f5]">
        <span
          className={`block h-2 rounded-full ${tone.fill}`}
          style={{ width: "82%" }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`inline-flex min-h-[36px] items-center justify-center rounded-full border px-3 text-[0.84rem] font-semibold transition-colors ${tone.primary}`}
          onClick={onPrimary}
        >
          {primaryLabel}
        </button>
        <button
          type="button"
          className={`inline-flex min-h-[36px] items-center justify-center rounded-full border px-3 text-[0.84rem] font-semibold transition-colors ${tone.secondary}`}
          onClick={onSecondary}
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}

function launchHeroSequence(haptic: () => void) {
  const queue = [
    {
      title: "Workspace loaded",
      description: "Your configurations are synced.",
      intent: "success" as const,
      icon: <SparkIcon />,
    },
    {
      title: "New update",
      description: "Hover the stack to fan out.",
      intent: "info" as const,
      icon: <BellIcon />,
    },
    {
      title: "History pulse",
      description: "Persisted history stays available after the stack closes.",
      intent: "default" as const,
      icon: <CloudIcon />,
    },
  ];

  for (const [index, item] of queue.entries()) {
    window.setTimeout(() => {
      haptic();
      toast.show({
        ...item,
        duration: 4600,
      });
    }, index * 150);
  }
}

function useMagnetic(intensity = 15) {
  const ref = useRef<HTMLElement>(null);
  const [style, setStyle] = useState({});

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!ref.current) return;
      const { left, top, width, height } = ref.current.getBoundingClientRect();
      const x = (e.clientX - left - width / 2) / (width / 2);
      const y = (e.clientY - top - height / 2) / (height / 2);

      setStyle({
        transform: `perspective(1000px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) translateZ(10px)`,
        transition: "transform 0.1s ease-out",
        "--mouse-x": `${e.clientX - left}px`,
        "--mouse-y": `${e.clientY - top}px`,
      } as React.CSSProperties);
    },
    [intensity],
  );

  const handleMouseLeave = useCallback(() => {
    setStyle({
      transform: "perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(0px)",
      transition: "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return { ref, style };
}

function NavIndicator({ activeView }: { activeView: ViewMode }) {
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });

  const update = useCallback(() => {
    const activeEl = document.querySelector(`[data-nav-item="true"][data-active="true"]`) as HTMLElement;
    if (activeEl) {
      setStyle({
        left: `${activeEl.offsetLeft}px`,
        width: `${activeEl.offsetWidth}px`,
        opacity: 1,
      });
    }
  }, []);

  useEffect(() => {
    // Immediate update on view change
    const raf = requestAnimationFrame(update);

    // Listen for layout changes
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [activeView, update]);

  return <div className="absolute top-1.5 md:top-2 bottom-1.5 md:bottom-2 bg-gray-800 rounded-full shadow-[0_2px_8px_rgba(106,128,165,0.08),0_1px_2px_rgba(106,128,165,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] border border-[#96b0da]/15 transition-all duration-[400ms] ease-[cubic-bezier(0.25,1,0.3,1)] pointer-events-none z-0" style={style} />;
}

interface SurfaceProps {
  children: ReactNode;
  className?: string;
  magnetic?: boolean;
}

function Surface({ children, className = "", magnetic = false }: SurfaceProps) {
  const { ref, style } = useMagnetic(magnetic ? 8 : 0);
  return (
    <div
      ref={ref as any}
      className={`${SURFACE_CLASS_NAME} ${className}`}
      style={style}
    >
      <div className="pointer-events-none absolute inset-0 z-[1]" style={SURFACE_SHEEN_STYLE} />
      <div className="pointer-events-none absolute inset-0 z-[1]" style={SURFACE_SPOTLIGHT_STYLE} />
      <div className="pointer-events-none absolute inset-0 z-[1] blur-[20px]" style={SURFACE_SPOTLIGHT_GLOW_STYLE} />
      <div className="relative z-[2] flex h-full w-full flex-col">{children}</div>
    </div>
  );
}

function showQuickToast() {
  toast.show("Draft saved at 10:42 AM");
}

function showDetailedToast() {
  toast.info({
    title: "New message",
    description: "Alice: the deploy preview is ready for review.",
    icon: <InboxIcon />,
  });
}

function showActionToast() {
  toast.show({
    title: "Publish queued",
    description: "Keep the user inside the flow with an immediate next action.",
    icon: <InboxIcon />,
    action: {
      label: "Undo",
      onClick: () => {
        toast.info({
          title: "Publish cancelled",
          description: "The release was removed from the queue.",
          icon: <BellIcon />,
        });
      },
    },
  });
}

function showCustomBodyToast() {
  toast.show({
    title: "Design system release",
    description: "Custom body cards can hold richer status details and their own controls.",
    icon: <SparkIcon />,
    duration: 5600,
    body: (
      <DemoCustomToastBody
        intent="info"
        title="Design system release"
        description="18 files changed, 3 checks still running, and the preview URL is ready."
        primaryLabel="Inspect build"
        secondaryLabel="Mute"
        onPrimary={() => {
          toast.info({
            title: "Build details opened",
            description: "Jumped straight to the latest preview report.",
            icon: <InboxIcon />,
          });
        }}
        onSecondary={() => {
          toast.success({
            title: "Muted for this release",
            description: "You will only see the final result now.",
            icon: <CloudIcon />,
          });
        }}
      />
    ),
  });
}

function showPersistentToast() {
  toast.error({
    title: "Subscription expired",
    description: "Update billing details to keep premium access active.",
    persistent: true,
    icon: "!",
  });
}

function showHistoryToast() {
  toast.success({
    title: "History enabled",
    description: "This toast will appear again inside the saved notification panel.",
    icon: <CloudIcon />,
  });
}

function showSuccessToast() {
  toast.success({
    title: "Changes saved",
    description: "Everything synced correctly.",
    icon: <SparkIcon />,
  });
}

function showWarningToast() {
  toast.warning({
    title: "Review recommended",
    description: "One setting still needs attention before shipping.",
    icon: <BellIcon />,
  });
}

function showAuthToast() {
  toast.success({
    title: "Signed in successfully",
    description: "MFA approved and the dashboard session is now active.",
    icon: <SparkIcon />,
  });
}

function showCartToast() {
  toast.info({
    title: "AirPods Pro removed",
    description: "Cart changed instantly, but the user can still undo.",
    icon: <InboxIcon />,
    action: {
      label: "Undo",
      onClick: () => {
        toast.success({
          title: "Added back to cart",
          description: "The item was restored with its original quantity.",
        });
      },
    },
  });
}

function showUploadToast() {
  toast.info({
    title: "Uploading raw footage",
    description: "Processing will continue in the background. Keep this tab open.",
    persistent: true,
    icon: <CloudIcon />,
  });
}

function showDangerToast() {
  toast.error({
    title: "Deletion failed",
    description: "Database is in read-only mode. Try again after maintenance ends.",
  });
}

function showLoadingFlow() {
  const id = toast.loading({
    title: "Uploading design system",
    description: "Progress stays attached to the same toast.",
    icon: <CloudIcon />,
    showProgress: true,
  });

  let progress = 0;
  const intervalId = window.setInterval(() => {
    progress = Math.min(progress + 0.18, 0.92);
    toast.update(id, {
      progress,
    });
  }, 240);

  window.setTimeout(() => {
    window.clearInterval(intervalId);
    toast.update(id, {
      title: "Upload finished",
      description: "Every asset passed validation.",
      intent: "success",
      loading: false,
      progress: 1,
      persistent: false,
      showProgress: false,
      icon: <SparkIcon />,
    });
  }, 1700);
}

function showPromiseFlow() {
  void toast.promise(wait(1500).then(() => "saved"), {
    loading: {
      title: "Saving profile",
      description: "Waiting for the API to finish.",
      icon: <BellIcon />,
      showProgress: true,
    },
    success: {
      title: "Profile saved",
      description: "The new settings are live across devices.",
      icon: <SparkIcon />,
    },
    error: (error) => ({
      title: "Save failed",
      description:
        error instanceof Error ? error.message : "Please try again.",
      icon: "!",
    }),
  });
}

function showQueuedBurst() {
  for (const index of Array.from({ length: 6 }, (_, value) => value + 1)) {
    window.setTimeout(() => {
      toast.info({
        title: `Queue item ${index}`,
        description: "Only three stay visible while the rest wait in line.",
        icon: <InboxIcon />,
        duration: 2400 + index * 120,
      });
    }, index * 110);
  }
}

function showDedupeFlow() {
  toast.show({
    title: "Sync batch started",
    description: "One toast should absorb repeated updates.",
    dedupeKey: "sync-batch",
    icon: <CloudIcon />,
    persistent: true,
    loading: true,
  });

  window.setTimeout(() => {
    toast.show({
      title: "Sync batch started",
      description: "The existing toast updates instead of duplicating.",
      dedupeKey: "sync-batch",
      icon: <CloudIcon />,
      loading: true,
      persistent: true,
    });
  }, 260);

  window.setTimeout(() => {
    toast.show({
      title: "Sync batch completed",
      description: "The deduped toast resolved successfully.",
      dedupeKey: "sync-batch",
      icon: <SparkIcon />,
      intent: "success",
      loading: false,
      persistent: false,
      showProgress: false,
    });
  }, 1500);
}

const HERO_METRICS = [
  {
    value: "Top dock",
    label: "Toasts stay above the page chrome instead of disappearing into the layout.",
  },
  {
    value: "Hover fan-out",
    label: "Expanded stacks stay readable only when the user actually inspects them.",
  },
  {
    value: "Saved trail",
    label: "Persisted or in-memory history keeps recent notifications available without bloating the main stack.",
  },
];

const PREVIEW_POINTS = [
  "Center launch animation that resolves into a clean top stack",
  "Loading, promise, queue, dedupe, and action-driven patterns in one runtime",
  "Icons, blur tuning, history, and swipe dismiss all wired to the real library",
];

const USE_CASES: UseCaseDefinition[] = [
  {
    label: "Authentication",
    title: "Keep sign-in feedback crisp without breaking the flow.",
    description:
      "Use success, MFA, and session-expiry toasts that feel immediate but still stay readable.",
    icon: "🔒",
    actionLabel: "Preview auth flow",
    onTrigger: showAuthToast,
    featured: true,
  },
  {
    label: "Commerce",
    title: "Let users recover from cart changes instantly.",
    description:
      "Action buttons make undo behavior visible right where the state change happened.",
    icon: "🛒",
    actionLabel: "Preview cart undo",
    onTrigger: showCartToast,
    featured: true,
  },
  {
    label: "Media ops",
    title: "Hold long-running uploads with a deliberate persistent card.",
    description:
      "Background work should stay visible until the user decides the interruption is resolved.",
    icon: "☁️",
    actionLabel: "Preview upload status",
    onTrigger: showUploadToast,
  },
  {
    label: "Critical alerts",
    title: "Surface errors that need attention without turning the page into noise.",
    description:
      "Use strong error states for destructive flows, failed syncs, or readonly incidents.",
    icon: "⚠️",
    actionLabel: "Preview critical alert",
    onTrigger: showDangerToast,
  },
];

const EXAMPLES: ExampleDefinition[] = [
  {
    label: "Title only",
    title: "Compact status feedback",
    description: "Use the shortest possible toast when body text would be noise.",
    code: `toast.show("Draft saved at 10:42 AM");`,
    actionLabel: "Trigger compact toast",
    onTrigger: showQuickToast,
  },
  {
    label: "Detailed",
    title: "Description plus icon",
    description: "Good for incoming messages, updates, and contextual background events.",
    code: `toast.info({
  title: "New message",
  description: "Alice: the deploy preview is ready.",
  icon: <InboxIcon />,
});`,
    actionLabel: "Trigger detailed toast",
    onTrigger: showDetailedToast,
  },
  {
    label: "Action",
    title: "Keep the next step inside the toast",
    description: "Expose retry, undo, or reopen actions where the user already looks.",
    code: `toast.show({
  title: "Publish queued",
  action: {
    label: "Undo",
    onClick: cancelPublish,
  },
});`,
    actionLabel: "Trigger action toast",
    onTrigger: showActionToast,
  },
  {
    label: "Custom body",
    title: "Render your own component inside the toast",
    description: "Bring badges, progress strips, and inline controls without giving up the stack runtime.",
    code: CUSTOM_BODY_SNIPPET,
    actionLabel: "Trigger custom body",
    onTrigger: showCustomBodyToast,
  },
  {
    label: "Persistent",
    title: "Force deliberate dismissal",
    description: "Reserve it for subscription issues, uploads, or broken infrastructure states.",
    code: `toast.error({
  title: "Subscription expired",
  persistent: true,
});`,
    actionLabel: "Trigger persistent toast",
    onTrigger: showPersistentToast,
  },
  {
    label: "Loading + update",
    title: "Keep one toast alive through the whole task",
    description: "Start with a loading state, then update the same card instead of stacking more.",
    code: LOADING_SNIPPET,
    actionLabel: "Trigger loading flow",
    onTrigger: showLoadingFlow,
  },
  {
    label: "Promise",
    title: "Map async work to loading, success, and error",
    description: "Use the promise helper to keep request feedback in one API call.",
    code: PROMISE_SNIPPET,
    actionLabel: "Trigger promise flow",
    onTrigger: showPromiseFlow,
  },
  {
    label: "Queue",
    title: "Burst control with max visible limits",
    description: "Extra toasts wait in a queue instead of flooding the screen.",
    code: `for (let index = 0; index < 6; index += 1) {
  toast.info({
    title: \`Queue item \${index + 1}\`,
  });
}`,
    actionLabel: "Trigger queued burst",
    onTrigger: showQueuedBurst,
  },
  {
    label: "Dedupe",
    title: "Absorb repeated events into one toast",
    description: "A shared dedupe key keeps retries and rapid updates from duplicating the stack.",
    code: QUEUE_SNIPPET,
    actionLabel: "Trigger dedupe flow",
    onTrigger: showDedupeFlow,
  },
];

const BUILDER_EXAMPLE_GROUPS: BuilderExampleGroup[] = [
  {
    title: "Toast types",
    items: [
      { label: "Default", onTrigger: showQuickToast },
      { label: "Success", onTrigger: showSuccessToast },
      { label: "Error", onTrigger: showDangerToast },
      { label: "Warning", onTrigger: showWarningToast },
      { label: "Info", onTrigger: showDetailedToast },
    ],
  },
  {
    title: "With description",
    items: [
      { label: "Warning + Description", onTrigger: showWarningToast },
      { label: "Error + Description", onTrigger: showDangerToast },
    ],
  },
  {
    title: "With action button",
    items: [
      { label: "Undo action", onTrigger: showActionToast },
      { label: "Cart restore", onTrigger: showCartToast },
    ],
  },
  {
    title: "Custom body",
    items: [
      { label: "Component body", onTrigger: showCustomBodyToast },
    ],
  },
  {
    title: "Async patterns",
    items: [
      { label: "Loading + update", onTrigger: showLoadingFlow },
      { label: "Promise toast", onTrigger: showPromiseFlow },
      { label: "Queue burst", onTrigger: showQueuedBurst },
      { label: "Dedupe", onTrigger: showDedupeFlow },
    ],
  },
];

function SectionHeader(props: HeaderProps) {
  const { eyebrow, title, description } = props;

  return (
    <div className="flex flex-col gap-3 mb-8">
      <div className="min-w-0">
        <span className="inline-flex items-center min-h-[32px] px-3 rounded-full border border-[#92abd1]/20 bg-white/72 text-[#17304d]/72 text-[0.72rem] font-bold tracking-[0.14em] uppercase">{eyebrow}</span>
        <h2 className="mt-1 text-[clamp(2.2rem,5vw,3rem)] leading-none tracking-[-0.025em] text-[#101c33] font-bold font-['Outfit']">{title}</h2>
      </div>
      {description ? <p className="max-w-[60ch] m-0 leading-[1.62] text-[#101c33]/54 text-[1.05rem]">{description}</p> : null}
    </div>
  );
}

function CodeBlock(props: { code: string }) {
  const [copied, setCopied] = useState(false);
  const highlightedCode = useMemo(() => highlightCode(props.code), [props.code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(props.code);
    setCopied(true);
    toast.show({
      title: "Snippet copied",
      description: "Ready to paste.",
      intent: "success",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mt-4 min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#96b0da]/12 bg-[#f6f8fb]/60 transition-all duration-300 hover:border-[#96b0da]/25 hover:bg-[#f6f8fb]/80">
      <div className="flex justify-end bg-[#f6f8fb]/40 px-3 py-2">
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-[20px] border px-3 py-1.5 text-[0.75rem] font-semibold transition-all duration-200 ${copied
            ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"
            : "border-[#92abd1]/20 bg-white text-[#101c33]/54 hover:-translate-y-px hover:border-[#96b0da]/40 hover:bg-[#f8fafc] hover:text-[#101c33]"
            }`}
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? (
            <svg viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
              <rect x="6" y="6" width="10" height="10" rx="1.5" />
              <path d="M4 14V6a2 2 0 0 1 2-2h8" strokeLinecap="round" />
            </svg>
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="m-0 max-w-full overflow-x-auto px-5 py-4 font-mono text-[0.875rem] leading-[1.6] text-slate-700">
        <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </div>
  );
}

function GlowMesh() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute -top-[10%] -left-[5%] h-[min(60vw,700px)] w-[min(60vw,700px)] rounded-full blur-[80px]"
        style={{
          ...FLOAT_GLOW_STYLE,
          background: "radial-gradient(circle, rgba(74, 116, 232, 0.28), transparent 70%)",
        }}
      />
      <div
        className="absolute -right-[5%] -bottom-[10%] h-[min(65vw,800px)] w-[min(65vw,800px)] rounded-full blur-[80px]"
        style={{
          ...FLOAT_GLOW_STYLE,
          animationDelay: "-12s",
          background: "radial-gradient(circle, rgba(241, 160, 98, 0.24), transparent 70%)",
        }}
      />
      <div
        className="absolute top-[40%] right-[15%] h-[min(40vw,500px)] w-[min(40vw,500px)] rounded-full blur-[80px]"
        style={{
          ...FLOAT_GLOW_STYLE,
          animationDelay: "-5s",
          background: "radial-gradient(circle, rgba(61, 164, 137, 0.18), transparent 70%)",
        }}
      />
    </div>
  );
}

function PageTopbar() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(INSTALL_SNIPPET);
    setCopied(true);
    toast.show({
      title: "Copied to clipboard",
      description: "You can now paste the install command in your terminal.",
      intent: "success",
      icon: <SparkIcon />,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header
      className="flex items-center justify-between gap-[18px] mb-[28px] p-[16px_18px] border border-white/80 rounded-[24px] bg-gradient-to-b from-white/75 to-[#f8fbff]/60 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_16px_32px_-4px_rgba(116,138,175,0.08)] backdrop-blur-[18px]"
      style={SLIDE_UP_STYLE}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#5b85df]/15 to-[#f1b07a]/20 border border-[#94aedb]/30 text-[#4a74e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
          <SparkIcon />
        </span>
        <div className="grid gap-[2px]">
          <strong className="text-[#101c33] text-base font-bold font-['Outfit'] tracking-[-0.02em]">toaststar</strong>
          <span className="text-[#101c33]/55 text-[0.92rem]">Light-only React toast demo</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap justify-end">
        <span className="inline-flex items-center min-h-[32px] px-3 rounded-full border border-[#92abd1]/20 bg-white/72 text-[#17304d]/72 text-[0.72rem] font-bold tracking-[0.14em] uppercase">Top-docked stack</span>
        <button
          type="button"
          className="inline-flex items-center min-h-[42px] px-[14px] rounded-2xl border border-[#96b0da]/22 bg-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] text-[#101c33] font-mono text-[0.93rem] hover:-translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_10px_20px_-5px_rgba(106,128,165,0.15)] active:scale-95 transition-all"
          onClick={handleCopy}
          title="Click to copy install command"
        >
          <code className="whitespace-nowrap">{copied ? "Copied!" : INSTALL_SNIPPET}</code>
        </button>
      </div>
    </header>
  );
}

function HomeView(props: HomeViewProps) {
  const {
    radius,
    blur,
    hapticTrigger,
    historyEnabled,
    theme,
    position,
    showProgress,
    swipeToDismiss,
    expandOnHover,
    pauseOnHover,
    builtInLayer,
    portalEnabled,
    limitVisible,
    maxVisible,
    queueLimit,
    overflowStrategy,
    dedupeBehavior,
    providerAppearance,
    onRadiusChange,
    onBlurChange,
    onHistoryChange,
    onThemeChange,
    onPositionChange,
    onShowProgressChange,
    onSwipeToDismissChange,
    onExpandOnHoverChange,
    onPauseOnHoverChange,
    onBuiltInLayerChange,
    onPortalEnabledChange,
    onLimitVisibleChange,
    onMaxVisibleChange,
    onQueueLimitChange,
    onOverflowStrategyChange,
    onDedupeBehaviorChange,
  } = props;

  const [intent, setIntent] = useState<IntentOption>("default");
  const [duration, setDuration] = useState(4000);
  const [closable, setClosable] = useState(true);
  const [withAction, setWithAction] = useState(false);
  const [persistent, setPersistent] = useState(false);
  const [loadingState, setLoadingState] = useState(false);
  const [toastShowProgress, setToastShowProgress] = useState(false);
  const [useDedupeKey, setUseDedupeKey] = useState(false);

  const handleTestLive = () => {
    hapticTrigger();
    toast.show({
      title: "Playground toast",
      description: "This reflects your current settings.",
      intent: intent === "default" ? undefined : intent,
      duration,
      closable,
      persistent,
      loading: loadingState,
      showProgress: toastShowProgress,
      progress: toastShowProgress && !loadingState ? 0.64 : undefined,
      dedupeKey: useDedupeKey ? "playground-demo" : undefined,
      action: withAction
        ? {
          label: "Undo",
          onClick: () => console.log("Undo clicked"),
        }
        : undefined,
    });
  };

  const PLAYGROUND_CODE = `toast.show({
  title: "Playground toast",
  description: "This reflects your current settings.",
${intent !== "default" ? `  intent: "${intent}",\n` : ""}${duration !== 4000 ? `  duration: ${duration},\n` : ""}${!closable ? `  closable: false,\n` : ""}${persistent ? `  persistent: true,\n` : ""}${loadingState ? `  loading: true,\n` : ""}${toastShowProgress ? `  showProgress: true,\n${!loadingState ? `  progress: 0.64,\n` : ""}` : ""}${useDedupeKey ? `  dedupeKey: "playground-demo",\n` : ""}${withAction ? `  action: {\n    label: "Undo",\n    onClick: () => {},\n  },\n` : ""}});`;

  return (
    <div className="grid gap-6" style={SLIDE_UP_STYLE}>
      <section className="grid grid-cols-1 lg:grid-cols-[1.08fr_minmax(320px,0.92fr)] gap-6 items-stretch">
        <div className="pt-[18px] pb-2 px-1.5">
          <span className="inline-flex items-center min-h-[34px] px-[14px] rounded-full bg-white/72 border border-[#92abd1]/22 text-[rgba(16,28,51,0.54)] text-[0.76rem] font-bold tracking-[0.16em] uppercase">
            Center launch, hover fan-out, light-glass finish
          </span>
          <h1 className="max-w-[11.5ch] mt-[18px] text-[clamp(3.2rem,8vw,6rem)] leading-[0.9] text-[#101c33] tracking-[-0.05em] font-bold font-['Outfit']">
            Make the demo feel like a product page, not just a sandbox.
          </h1>
          <p className="max-w-[58ch] mt-[18px] text-[1.08rem] leading-[1.72] text-[rgba(16,28,51,0.84)]">
            `toaststar` now shows what the library is for, how it looks in motion,
            and how teams would actually ship it inside a modern React app.
          </p>

          <div className="flex flex-wrap gap-3 mt-7">
            <button type="button" className="min-h-[52px] px-5 rounded-full font-bold text-[#17304d] bg-gradient-to-br from-[#fff0d5] via-[#f5c898] to-[#edb29e] shadow-[0_16px_34px_rgba(241,176,122,0.26)] transition-all duration-[180ms] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_10px_20px_-5px_rgba(106,128,165,0.15)] active:scale-95" onClick={() => launchHeroSequence(hapticTrigger)}>
              Launch hero sequence
            </button>
            <button type="button" className="min-h-[52px] px-5 rounded-full font-bold text-[#101c33]/84 bg-white/84 border border-[#92abd1]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] transition-all duration-[180ms] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_10px_20px_-5px_rgba(106,128,165,0.15)] active:scale-95" onClick={() => { hapticTrigger(); showActionToast(); }}>
              Trigger action toast
            </button>
            <button type="button" className="min-h-[52px] px-5 rounded-full font-bold text-[#101c33]/54 bg-transparent border border-dashed border-[#92abd1]/30 transition-all duration-[180ms] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_10px_20px_-5px_rgba(106,128,165,0.15)] active:scale-95" onClick={() => { hapticTrigger(); showQuickToast(); }}>
              Quick title-only
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-[30px]">
            {HERO_METRICS.map((item) => (
              <article key={item.value} className="p-[18px] rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <strong className="block mb-2 text-[#101c33] text-base font-bold">{item.value}</strong>
                <span className="block text-[0.94rem] leading-[1.55] text-[rgba(16,28,51,0.84)]">{item.label}</span>
              </article>
            ))}
          </div>
        </div>

        <Surface magnetic className="flex flex-col gap-[18px] min-h-full p-7 bg-gradient-to-b from-white/90 to-[#fafcff]/74">
          <span className="inline-flex items-center min-h-[32px] px-3 self-start rounded-full border border-[#92abd1]/20 bg-white/72 text-[rgba(23,48,77,0.72)] text-[0.72rem] font-bold tracking-[0.14em] uppercase">Live demo kit</span>
          <h2 className="mt-0.5 text-[clamp(2rem,3vw,3.2rem)] leading-[0.94] text-[#101c33] tracking-[-0.05em] font-bold font-['Outfit']">Everything important is already wired into the page.</h2>
          <p className="m-0 leading-[1.7] text-[rgba(16,28,51,0.84)]">
            Trigger real notifications, tune the visual surface, and prove the
            built-in history panel without leaving this view.
          </p>

          <div className="grid gap-3">
            <button type="button" className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 items-center p-[14px_16px] rounded-[22px] border border-[#96b0da]/18 bg-white/76 text-left shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_16px_32px_-4px_rgba(116,138,175,0.08)] transition-all duration-[180ms] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_10px_20px_-5px_rgba(106,128,165,0.15)] active:scale-95" onClick={() => { hapticTrigger(); showDetailedToast(); }}>
              <span className="w-[42px] h-[42px] inline-flex items-center justify-center rounded-[18px] border border-[#96b0da]/25 bg-white/40 backdrop-blur-[8px] shadow-[0_4px_12px_rgba(106,128,165,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] text-[1.4rem] transition-all duration-300 text-[#4a74e8]">
                <InboxIcon />
              </span>
              <div>
                <strong className="block mb-0.5 text-base text-[#101c33] font-bold">Detailed update</strong>
                <small className="block text-[#101c33]/54 text-[0.92rem]">Icon plus supporting description</small>
              </div>
            </button>
            <button type="button" className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 items-center p-[14px_16px] rounded-[22px] border border-[#96b0da]/18 bg-white/76 text-left shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_16px_32px_-4px_rgba(116,138,175,0.08)] transition-all duration-[180ms] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_10px_20px_-5px_rgba(106,128,165,0.15)] active:scale-95" onClick={() => { hapticTrigger(); showPersistentToast(); }}>
              <span className="w-[42px] h-[42px] inline-flex items-center justify-center rounded-[18px] border border-[#96b0da]/25 bg-white/40 backdrop-blur-[8px] shadow-[0_4px_12px_rgba(106,128,165,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] text-[1.4rem] transition-all duration-300 text-[#f1a062]">!</span>
              <div>
                <strong className="block mb-0.5 text-base text-[#101c33] font-bold">Persistent alert</strong>
                <small className="block text-[#101c33]/54 text-[0.92rem]">Stay visible until dismissed</small>
              </div>
            </button>
            <button type="button" className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 items-center p-[14px_16px] rounded-[22px] border border-[#96b0da]/18 bg-white/76 text-left shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_16px_32px_-4px_rgba(116,138,175,0.08)] transition-all duration-[180ms] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_10px_20px_-5px_rgba(106,128,165,0.15)] active:scale-95" onClick={() => { hapticTrigger(); showHistoryToast(); }}>
              <span className="w-[42px] h-[42px] inline-flex items-center justify-center rounded-[18px] border border-[#96b0da]/25 bg-white/40 backdrop-blur-[8px] shadow-[0_4px_12px_rgba(106,128,165,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] text-[1.4rem] transition-all duration-300 text-[#3da489]">
                <CloudIcon />
              </span>
              <div>
                <strong className="block mb-0.5 text-base text-[#101c33] font-bold">History pulse</strong>
                <small className="block text-[#101c33]/54 text-[0.92rem]">Confirm saved notifications instantly</small>
              </div>
            </button>
          </div>

          <ul className="flex flex-col gap-2.5 m-[28px_0_0] p-0 list-none">
            {PREVIEW_POINTS.map((item) => (
              <li key={item} className="relative pl-5 text-[0.94rem] text-[#101c33]/54 leading-normal before:content-['•'] before:absolute before:left-0 before:text-[#4a74e8]">{item}</li>
            ))}
          </ul>
        </Surface>
      </section>

      <Surface className="flex flex-col gap-10 p-12 mt-12 relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-b from-white/88 to-[#fcfeff]/72 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_10px_15px_-3px_rgba(106,128,165,0.06),0_32px_64px_-12px_rgba(106,128,165,0.12)] backdrop-blur-[24px]">
        <div className="flex flex-col gap-2 relative z-20">
          <span className="inline-flex items-center min-h-[32px] px-3 self-start rounded-full border border-[#92abd1]/20 bg-white/72 text-[#17304d]/72 text-[0.72rem] font-bold tracking-[0.14em] uppercase">Playground</span>
          <h2 className="mt-1 text-[clamp(2.2rem,4vw,2.5rem)] leading-tight tracking-[-0.025em] text-[#101c33] font-bold font-['Outfit']">Tune the card feel in real time</h2>
          <p className="max-w-[70ch] m-0 leading-[1.62] text-[#101c33]/54 text-[1.05rem]">Adjust the provider and toast options below. Notice how everything changes dynamically across the entire demo.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 relative z-20">
          <div className="flex flex-col gap-4">
            <strong className="text-[0.8rem] font-bold text-[#17304d]/54 tracking-[0.12em] uppercase">Provider Appearance</strong>
            <div className="grid gap-3">
              <label className="flex flex-col gap-2 p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <span className="text-[#101c33] font-bold text-[0.95rem]">Theme</span>
                <select className="w-full bg-[#f6f8fb] border border-[#92abd1]/20 rounded-xl p-2.5 text-[#101c33] text-[0.95rem] outline-none focus:border-[#4a74e8]/50" value={theme} onChange={(e) => onThemeChange(e.target.value as any)}>
                  <option value="glass">Glass (Default)</option>
                  <option value="midnight">Midnight</option>
                  <option value="sunset">Sunset</option>
                  <option value="forest">Forest</option>
                  <option value="ocean">Ocean</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <span className="text-[#101c33] font-bold text-[0.95rem]">Position</span>
                <select className="w-full bg-[#f6f8fb] border border-[#92abd1]/20 rounded-xl p-2.5 text-[#101c33] text-[0.95rem] outline-none focus:border-[#4a74e8]/50" value={position} onChange={(e) => onPositionChange(e.target.value as any)}>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </label>

              <div className="p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <div className="flex items-center justify-between gap-3 mb-2 text-[#101c33] text-[0.95rem] font-bold">
                  <span>Radius</span>
                  <span>{radius}px</span>
                </div>
                <input type="range" className="w-full h-1.5 rounded-full bg-[#96b0da]/15 cursor-pointer accent-[#f1a062]" min="12" max="36" value={radius} onChange={(e) => onRadiusChange(Number(e.target.value))} />
              </div>

              <div className="p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <div className="flex items-center justify-between gap-3 mb-2 text-[#101c33] text-[0.95rem] font-bold">
                  <span>Blur</span>
                  <span>{blur}px</span>
                </div>
                <input type="range" className="w-full h-1.5 rounded-full bg-[#96b0da]/15 cursor-pointer accent-[#f1a062]" min="0" max="40" value={blur} onChange={(e) => onBlurChange(Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <strong className="text-[0.8rem] font-bold text-[#17304d]/54 tracking-[0.12em] uppercase">Toast Settings</strong>
            <div className="grid gap-3">
              <label className="flex flex-col gap-2 p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <span className="text-[#101c33] font-bold text-[0.95rem]">Intent</span>
                <select className="w-full bg-[#f6f8fb] border border-[#92abd1]/20 rounded-xl p-2.5 text-[#101c33] text-[0.95rem] outline-none focus:border-[#4a74e8]/50" value={intent} onChange={(e) => setIntent(e.target.value as any)}>
                  <option value="default">Default</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                </select>
              </label>

              <div className="p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <div className="flex items-center justify-between gap-3 mb-2 text-[#101c33] text-[0.95rem] font-bold">
                  <span>Duration</span>
                  <span>{duration}ms</span>
                </div>
                <input type="range" className="w-full h-1.5 rounded-full bg-[#96b0da]/15 cursor-pointer accent-[#f1a062]" min="500" max="10000" step="500" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              </div>

              <label className="grid grid-cols-[auto_minmax(0,1fr)] gap-[14px] items-start p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] cursor-pointer">
                <input type="checkbox" className="w-[18px] h-[18px] mt-[2px] accent-[#4a74e8] cursor-pointer" checked={closable} onChange={(e) => setClosable(e.target.checked)} />
                <span className="grid gap-0.5">
                  <strong className="text-[#101c33] text-[0.95rem] font-bold">Closable</strong>
                  <small className="text-[#101c33]/54 text-[0.85rem] leading-[1.4]">Allow to be closed manually.</small>
                </span>
              </label>

              <label className="grid grid-cols-[auto_minmax(0,1fr)] gap-[14px] items-start p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] cursor-pointer">
                <input type="checkbox" className="w-[18px] h-[18px] mt-[2px] accent-[#4a74e8] cursor-pointer" checked={withAction} onChange={(e) => setWithAction(e.target.checked)} />
                <span className="grid gap-0.5">
                  <strong className="text-[#101c33] text-[0.95rem] font-bold">Action Button</strong>
                  <small className="text-[#101c33]/54 text-[0.85rem] leading-[1.4]">Include an undo/action handler.</small>
                </span>
              </label>

              <label className="grid grid-cols-[auto_minmax(0,1fr)] gap-[14px] items-start p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] cursor-pointer">
                <input type="checkbox" className="w-[18px] h-[18px] mt-[2px] accent-[#4a74e8] cursor-pointer" checked={persistent} onChange={(e) => setPersistent(e.target.checked)} />
                <span className="grid gap-0.5">
                  <strong className="text-[#101c33] text-[0.95rem] font-bold">Persistent Toast</strong>
                  <small className="text-[#101c33]/54 text-[0.85rem] leading-[1.4]">Keep the toast visible until it is dismissed.</small>
                </span>
              </label>

              <label className="grid grid-cols-[auto_minmax(0,1fr)] gap-[14px] items-start p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] cursor-pointer">
                <input type="checkbox" className="w-[18px] h-[18px] mt-[2px] accent-[#4a74e8] cursor-pointer" checked={loadingState} onChange={(e) => setLoadingState(e.target.checked)} />
                <span className="grid gap-0.5">
                  <strong className="text-[#101c33] text-[0.95rem] font-bold">Loading State</strong>
                  <small className="text-[#101c33]/54 text-[0.85rem] leading-[1.4]">Render the same toast as an active loading notification.</small>
                </span>
              </label>

              <label className="grid grid-cols-[auto_minmax(0,1fr)] gap-[14px] items-start p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] cursor-pointer">
                <input type="checkbox" className="w-[18px] h-[18px] mt-[2px] accent-[#4a74e8] cursor-pointer" checked={toastShowProgress} onChange={(e) => setToastShowProgress(e.target.checked)} />
                <span className="grid gap-0.5">
                  <strong className="text-[#101c33] text-[0.95rem] font-bold">Toast Progress Override</strong>
                  <small className="text-[#101c33]/54 text-[0.85rem] leading-[1.4]">Turn the bar on for just this toast, even if the provider default is off.</small>
                </span>
              </label>

              <label className="grid grid-cols-[auto_minmax(0,1fr)] gap-[14px] items-start p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] cursor-pointer">
                <input type="checkbox" className="w-[18px] h-[18px] mt-[2px] accent-[#4a74e8] cursor-pointer" checked={useDedupeKey} onChange={(e) => setUseDedupeKey(e.target.checked)} />
                <span className="grid gap-0.5">
                  <strong className="text-[#101c33] text-[0.95rem] font-bold">Dedupe Key</strong>
                  <small className="text-[#101c33]/54 text-[0.85rem] leading-[1.4]">Reuse the same key so repeated clicks can merge into one toast.</small>
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <strong className="text-[0.8rem] font-bold text-[#17304d]/54 tracking-[0.12em] uppercase">Runtime Features</strong>
            <div className="flex flex-col gap-3">
              <label className="grid grid-cols-[auto_minmax(0,1fr)] gap-[14px] items-start p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] cursor-pointer">
                <input type="checkbox" className="w-[18px] h-[18px] mt-[2px] accent-[#4a74e8] cursor-pointer" checked={historyEnabled} onChange={(e) => onHistoryChange(e.target.checked)} />
                <span className="grid gap-0.5">
                  <strong className="text-[#101c33] text-[0.95rem] font-bold">History Enabled</strong>
                  <small className="text-[#101c33]/54 text-[0.85rem] leading-[1.4]">Keep it populated while you test.</small>
                </span>
              </label>

              <label className="grid grid-cols-[auto_minmax(0,1fr)] gap-[14px] items-start p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] cursor-pointer">
                <input type="checkbox" className="w-[18px] h-[18px] mt-[2px] accent-[#4a74e8] cursor-pointer" checked={showProgress} onChange={(e) => onShowProgressChange(e.target.checked)} />
                <span className="grid gap-0.5">
                  <strong className="text-[#101c33] text-[0.95rem] font-bold">Provider Progress Default</strong>
                  <small className="text-[#101c33]/54 text-[0.85rem] leading-[1.4]">Default bar visibility for auto-dismiss and loading toasts.</small>
                </span>
              </label>

              <label className="grid grid-cols-[auto_minmax(0,1fr)] gap-[14px] items-start p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] cursor-pointer">
                <input type="checkbox" className="w-[18px] h-[18px] mt-[2px] accent-[#4a74e8] cursor-pointer" checked={swipeToDismiss} onChange={(e) => onSwipeToDismissChange(e.target.checked)} />
                <span className="grid gap-0.5">
                  <strong className="text-[#101c33] text-[0.95rem] font-bold">Swipe to Dismiss</strong>
                  <small className="text-[#101c33]/54 text-[0.85rem] leading-[1.4]">Allow touch and pen swipes to close a toast.</small>
                </span>
              </label>

              <label className="grid grid-cols-[auto_minmax(0,1fr)] gap-[14px] items-start p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] cursor-pointer">
                <input type="checkbox" className="w-[18px] h-[18px] mt-[2px] accent-[#4a74e8] cursor-pointer" checked={expandOnHover} onChange={(e) => onExpandOnHoverChange(e.target.checked)} />
                <span className="grid gap-0.5">
                  <strong className="text-[#101c33] text-[0.95rem] font-bold">Hover Fan-out</strong>
                  <small className="text-[#101c33]/54 text-[0.85rem] leading-[1.4]">Expand the stack only when the user inspects it.</small>
                </span>
              </label>

              <label className="grid grid-cols-[auto_minmax(0,1fr)] gap-[14px] items-start p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] cursor-pointer">
                <input type="checkbox" className="w-[18px] h-[18px] mt-[2px] accent-[#4a74e8] cursor-pointer" checked={pauseOnHover} onChange={(e) => onPauseOnHoverChange(e.target.checked)} />
                <span className="grid gap-0.5">
                  <strong className="text-[#101c33] text-[0.95rem] font-bold">Pause on Hover</strong>
                  <small className="text-[#101c33]/54 text-[0.85rem] leading-[1.4]">Freeze auto-dismiss timers while the user is reading.</small>
                </span>
              </label>

              <label className="grid grid-cols-[auto_minmax(0,1fr)] gap-[14px] items-start p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] cursor-pointer">
                <input type="checkbox" className="w-[18px] h-[18px] mt-[2px] accent-[#4a74e8] cursor-pointer" checked={builtInLayer} onChange={(e) => onBuiltInLayerChange(e.target.checked)} />
                <span className="grid gap-0.5">
                  <strong className="text-[#101c33] text-[0.95rem] font-bold">Built-in Layer</strong>
                  <small className="text-[#101c33]/54 text-[0.85rem] leading-[1.4]">Turn this off to simulate headless mode.</small>
                </span>
              </label>

              <label className="grid grid-cols-[auto_minmax(0,1fr)] gap-[14px] items-start p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] cursor-pointer">
                <input type="checkbox" className="w-[18px] h-[18px] mt-[2px] accent-[#4a74e8] cursor-pointer" checked={portalEnabled} onChange={(e) => onPortalEnabledChange(e.target.checked)} />
                <span className="grid gap-0.5">
                  <strong className="text-[#101c33] text-[0.95rem] font-bold">Portal to Body</strong>
                  <small className="text-[#101c33]/54 text-[0.85rem] leading-[1.4]">Render through a portal instead of inline with the page tree.</small>
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <strong className="text-[0.8rem] font-bold text-[#17304d]/54 tracking-[0.12em] uppercase">Stack Policies</strong>
            <div className="flex flex-col gap-3">
              <label className="grid grid-cols-[auto_minmax(0,1fr)] gap-[14px] items-start p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] cursor-pointer">
                <input type="checkbox" className="w-[18px] h-[18px] mt-[2px] accent-[#4a74e8] cursor-pointer" checked={limitVisible} onChange={(e) => onLimitVisibleChange(e.target.checked)} />
                <span className="grid gap-0.5">
                  <strong className="text-[#101c33] text-[0.95rem] font-bold">Finite Visible Stack</strong>
                  <small className="text-[#101c33]/54 text-[0.85rem] leading-[1.4]">Cap visible toasts so queue and overflow rules can take over.</small>
                </span>
              </label>

              <div className="p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <div className="flex items-center justify-between gap-3 mb-2 text-[#101c33] text-[0.95rem] font-bold">
                  <span>Max Visible</span>
                  <span>{limitVisible ? maxVisible : "∞"}</span>
                </div>
                <input type="range" className="w-full h-1.5 rounded-full bg-[#96b0da]/15 cursor-pointer accent-[#f1a062]" min="1" max="6" value={maxVisible} disabled={!limitVisible} onChange={(e) => onMaxVisibleChange(Number(e.target.value))} />
              </div>

              <div className="p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <div className="flex items-center justify-between gap-3 mb-2 text-[#101c33] text-[0.95rem] font-bold">
                  <span>Queue Limit</span>
                  <span>{limitVisible ? queueLimit : "off"}</span>
                </div>
                <input type="range" className="w-full h-1.5 rounded-full bg-[#96b0da]/15 cursor-pointer accent-[#f1a062]" min="1" max="12" value={queueLimit} disabled={!limitVisible} onChange={(e) => onQueueLimitChange(Number(e.target.value))} />
              </div>

              <label className="flex flex-col gap-2 p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <span className="text-[#101c33] font-bold text-[0.95rem]">Overflow Strategy</span>
                <select className="w-full bg-[#f6f8fb] border border-[#92abd1]/20 rounded-xl p-2.5 text-[#101c33] text-[0.95rem] outline-none focus:border-[#4a74e8]/50" value={overflowStrategy} onChange={(e) => onOverflowStrategyChange(e.target.value as OverflowOption)}>
                  <option value="queue">Queue</option>
                  <option value="drop-oldest">Drop oldest</option>
                  <option value="drop-newest">Drop newest</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <span className="text-[#101c33] font-bold text-[0.95rem]">Dedupe Behavior</span>
                <select className="w-full bg-[#f6f8fb] border border-[#92abd1]/20 rounded-xl p-2.5 text-[#101c33] text-[0.95rem] outline-none focus:border-[#4a74e8]/50" value={dedupeBehavior} onChange={(e) => onDedupeBehaviorChange(e.target.value as DedupeOption)}>
                  <option value="ignore">Ignore</option>
                  <option value="update">Update</option>
                  <option value="reset-duration">Reset duration</option>
                </select>
              </label>

              <button type="button" className="w-full min-h-[52px] rounded-2xl font-bold text-white bg-gradient-to-r from-[#5a87e3] to-[#456ad1] shadow-[0_10px_20px_-5px_rgba(74,116,232,0.3)] transition-all duration-[180ms] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-6px_rgba(74,116,232,0.4)] active:scale-95" onClick={handleTestLive}>
                Play Toast Function
              </button>

              <div className="p-4 rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <CodeBlock code={PLAYGROUND_CODE} />
              </div>
            </div>
          </div>
        </div>
      </Surface>

      <section className="flex flex-col gap-[34px] relative z-20">
        <SectionHeader
          eyebrow="Recipes"
          title="Common patterns worth previewing"
          description="Each trigger shows a toast shape people actually need in dashboards, commerce, and admin tools."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[14px]">
          <button type="button" className="flex flex-col items-start gap-2.5 p-5 rounded-[24px] text-left border border-[#96b0da]/18 bg-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] transition-all duration-[180ms] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_10px_20px_-5px_rgba(106,128,165,0.15)] active:scale-95" onClick={() => { hapticTrigger(); showQuickToast(); }}>
            <span className="inline-flex items-center min-h-[32px] px-3 rounded-full border border-[#92abd1]/20 bg-white/72 text-[rgba(23,48,77,0.72)] text-[0.72rem] font-bold tracking-[0.14em] uppercase">Title only</span>
            <strong className="text-[#101c33] font-bold">Fast status confirmation</strong>
            <p className="m-0 leading-[1.58] text-[rgba(16,28,51,0.84)] text-sm">Use it for saves, sync pings, and background confirmations.</p>
          </button>

          <button type="button" className="flex flex-col items-start gap-2.5 p-5 rounded-[24px] text-left border border-[#96b0da]/18 bg-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] transition-all duration-[180ms] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_10px_20px_-5px_rgba(106,128,165,0.15)] active:scale-95" onClick={() => { hapticTrigger(); showDetailedToast(); }}>
            <span className="inline-flex items-center min-h-[32px] px-3 rounded-full border border-[#92abd1]/20 bg-white/72 text-[rgba(23,48,77,0.72)] text-[0.72rem] font-bold tracking-[0.14em] uppercase">Message</span>
            <strong className="text-[#101c33] font-bold">Detailed inbox update</strong>
            <p className="m-0 leading-[1.58] text-[rgba(16,28,51,0.84)] text-sm">Best when a short title needs one more line of context.</p>
          </button>

          <button type="button" className="flex flex-col items-start gap-2.5 p-5 rounded-[24px] text-left border border-[#96b0da]/18 bg-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] transition-all duration-[180ms] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_10px_20px_-5px_rgba(106,128,165,0.15)] active:scale-95" onClick={() => { hapticTrigger(); showActionToast(); }}>
            <span className="inline-flex items-center min-h-[32px] px-3 rounded-full border border-[#92abd1]/20 bg-white/72 text-[rgba(23,48,77,0.72)] text-[0.72rem] font-bold tracking-[0.14em] uppercase">Action</span>
            <strong className="text-[#101c33] font-bold">Undo or retry in place</strong>
            <p className="m-0 leading-[1.58] text-[rgba(16,28,51,0.84)] text-sm">Keep the user inside the page instead of forcing a modal.</p>
          </button>

          <button type="button" className="flex flex-col items-start gap-2.5 p-5 rounded-[24px] text-left border border-[#96b0da]/18 bg-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] transition-all duration-[180ms] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_10px_20px_-5px_rgba(106,128,165,0.15)] active:scale-95" onClick={() => { hapticTrigger(); showPersistentToast(); }}>
            <span className="inline-flex items-center min-h-[32px] px-3 rounded-full border border-[#92abd1]/20 bg-white/72 text-[rgba(23,48,77,0.72)] text-[0.72rem] font-bold tracking-[0.14em] uppercase">Persistent</span>
            <strong className="text-[#101c33] font-bold">Hold important states</strong>
            <p className="m-0 leading-[1.58] text-[rgba(16,28,51,0.84)] text-sm">Use for missing configs or destructive flows.</p>
          </button>
        </div>
      </section>

      <Surface className="mt-12 p-8 relative overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-b from-white/88 to-[#fcfeff]/72 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_10px_15px_-3px_rgba(106,128,165,0.06),0_32px_64px_-12px_rgba(106,128,165,0.12)] backdrop-blur-[24px]">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] gap-6 items-start relative z-20">
          <div>
            <SectionHeader
              eyebrow="Notification center"
              title="Saved activity proves the library beyond one-off popups"
              description="This panel is a first-party export, so the demo can show the toast and the long-tail history in one place."
            />

            <div className="grid gap-[14px]">
              <div className="p-[18px] rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <strong className="block mb-0.5 text-base text-[#101c33] font-bold">Built in</strong>
                <span className="block leading-[1.58] text-[rgba(16,28,51,0.84)]">No extra dashboard component needed just to review missed alerts.</span>
              </div>
              <div className="p-[18px] rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <strong className="block mb-0.5 text-base text-[#101c33] font-bold">Persistent</strong>
                <span className="block leading-[1.58] text-[rgba(16,28,51,0.84)]">Stored notifications survive more than a single animation cycle.</span>
              </div>
              <div className="p-[18px] rounded-3xl border border-[#96b0da]/18 bg-gradient-to-b from-[#fdfeff]/96 to-[#f8fbff]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
                <strong className="block mb-0.5 text-base text-[#101c33] font-bold">Consistent</strong>
                <span className="block leading-[1.58] text-[rgba(16,28,51,0.84)]">The panel inherits the same radius, blur, and surface styling.</span>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            {historyEnabled ? (
              <ToastHistoryPanel
                title="Recent activity"
                maxItems={6}
                theme="glass"
                appearance={providerAppearance}
              />
            ) : (
              <div className="block p-[18px] rounded-3xl border border-[#96b0da]/18 bg-[#fdfeff]/96 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] text-[rgba(16,28,51,0.84)] leading-[1.58]">
                Turn history back on to populate this panel with the toasts you trigger above.
              </div>
            )}
          </div>
        </div>
      </Surface>
    </div>
  );
}

function UseCasesView({ hapticTrigger }: { hapticTrigger: () => void }) {
  return (
    <div className="flex flex-col gap-6" style={SLIDE_UP_STYLE}>
      <Surface className="p-7 rounded-[32px] border border-white/70 bg-gradient-to-b from-white/88 to-[#fcfeff]/72 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_10px_15px_-3px_rgba(106,128,165,0.06),0_32px_64px_-12px_rgba(106,128,165,0.12)] backdrop-blur-[24px]">
        <SectionHeader
          eyebrow="Use cases"
          title="Show the library in the situations where teams actually need it"
          description="These cards are structured like product proof points: a clear scenario, a reason the toast matters, and a live trigger."
        />
      </Surface>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 pb-10">
        {USE_CASES.map((item) => (
          <button
            key={item.title}
            type="button"
            className="flex flex-col items-start p-[28px_32px] rounded-[32px] border border-[#96b0da]/18 bg-white/76 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.74),0_8px_16px_-4px_rgba(106,128,165,0.06)] transition-all duration-[240ms] group hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(106,128,165,0.15)] active:scale-95"
            onClick={() => { hapticTrigger(); item.onTrigger(); }}
          >
            <div className="flex items-center gap-4 mb-2">
              <span className="w-[42px] h-[42px] inline-flex items-center justify-center rounded-[16px] bg-gradient-to-br from-[#f8fbff] to-[#f1f6fc] border border-[#96b0da]/22 text-[1.4rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">{item.icon}</span>
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.8rem] font-bold text-[#17304d]/54 tracking-[0.1em] uppercase">{item.label}</span>
                {item.featured && <span className="inline-flex max-w-fit px-2 py-0.5 rounded-md bg-[#4a74e8]/10 text-[#4a74e8] text-[0.65rem] font-bold uppercase tracking-wider">Featured</span>}
              </div>
            </div>
            <h3 className="mt-3 mb-2 text-[1.15rem] leading-tight text-[#101c33] font-bold transition-colors duration-300 group-hover:text-[#6366f1]">{item.title}</h3>
            <p className="m-0 text-[0.94rem] leading-[1.5] text-[#101c33]/70">{item.description}</p>
            <span className="relative inline-block mt-[14px] p-0 text-[0.9rem] font-semibold text-[#6366f1] bg-transparent border-none cursor-pointer after:content-[''] after:absolute after:bottom-[-2px] after:left-0 after:w-full after:h-[2px] after:bg-current after:scale-x-0 outline-none after:origin-bottom-right after:transition-transform after:duration-[300ms] group-hover:after:scale-x-100 group-hover:after:origin-bottom-left">{item.actionLabel}</span>
          </button>
        ))}
      </section>
    </div>
  );
}

function ExamplesView({ hapticTrigger }: { hapticTrigger: () => void }) {
  return (
    <div className="flex flex-col gap-6" style={SLIDE_UP_STYLE}>
      <Surface className="p-7 rounded-[32px] border border-white/70 bg-gradient-to-b from-white/88 to-[#fcfeff]/72 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02),0_10px_15px_-3px_rgba(106,128,165,0.06),0_32px_64px_-12px_rgba(106,128,165,0.12)] backdrop-blur-[24px]">
        <SectionHeader
          eyebrow="API and examples"
          title="Installation, setup, and the toast shapes people copy first"
          description="Each example stays short enough for docs but still triggers the real runtime on this page."
        />
      </Surface>

      <section className="grid gap-6 min-w-0 pb-10">
        <Surface className="flex flex-col gap-[14px] p-[28px_32px] rounded-[32px] border border-[#96b0da]/18 bg-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
          <span className="inline-flex self-start items-center min-h-[32px] px-3 rounded-full border border-[#92abd1]/20 bg-white/72 text-[rgba(23,48,77,0.72)] text-[0.72rem] font-bold tracking-[0.14em] uppercase mb-1">Install</span>
          <h3 className="m-0 text-[1.2rem] leading-tight text-[#101c33] font-bold">One command to start</h3>
          <CodeBlock code={INSTALL_SNIPPET} />
        </Surface>

        <Surface className="flex flex-col gap-[14px] p-[28px_32px] rounded-[32px] border border-[#96b0da]/18 bg-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
          <span className="inline-flex self-start items-center min-h-[32px] px-3 rounded-full border border-[#92abd1]/20 bg-white/72 text-[rgba(23,48,77,0.72)] text-[0.72rem] font-bold tracking-[0.14em] uppercase mb-1">Provider</span>
          <h3 className="m-0 text-[1.2rem] leading-tight text-[#101c33] font-bold">Mount once at the app root</h3>
          <CodeBlock code={SETUP_SNIPPET} />
        </Surface>

        <Surface className="flex flex-col gap-[14px] p-[28px_32px] rounded-[32px] border border-[#96b0da]/18 bg-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
          <span className="inline-flex self-start items-center min-h-[32px] px-3 rounded-full border border-[#92abd1]/20 bg-white/72 text-[rgba(23,48,77,0.72)] text-[0.72rem] font-bold tracking-[0.14em] uppercase mb-1">History</span>
          <h3 className="m-0 text-[1.2rem] leading-tight text-[#101c33] font-bold">Reuse the saved activity panel</h3>
          <CodeBlock code={HISTORY_SNIPPET} />
        </Surface>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Surface className="flex flex-col gap-[14px] p-[28px_32px] rounded-[32px] border border-[#96b0da]/18 bg-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
            <span className="inline-flex self-start items-center min-h-[32px] px-3 rounded-full border border-[#92abd1]/20 bg-white/72 text-[rgba(23,48,77,0.72)] text-[0.72rem] font-bold tracking-[0.14em] uppercase mb-1">Lifecycle</span>
            <h3 className="m-0 text-[1.2rem] leading-tight text-[#101c33] font-bold">Track open, action, and close events</h3>
            <CodeBlock code={LIFECYCLE_SNIPPET} />
          </Surface>

          <Surface className="flex flex-col gap-[14px] p-[28px_32px] rounded-[32px] border border-[#96b0da]/18 bg-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]">
            <span className="inline-flex self-start items-center min-h-[32px] px-3 rounded-full border border-[#92abd1]/20 bg-white/72 text-[rgba(23,48,77,0.72)] text-[0.72rem] font-bold tracking-[0.14em] uppercase mb-1">Headless</span>
            <h3 className="m-0 text-[1.2rem] leading-tight text-[#101c33] font-bold">Disable built-in rendering when you only need the runtime</h3>
            <CodeBlock code={HEADLESS_SNIPPET} />
          </Surface>
        </div>
      </section>

      <section className="grid gap-6 min-w-0 pb-10">
        {EXAMPLES.map((item) => (
          <Surface key={item.title} className="flex flex-col gap-5 p-[28px_32px] rounded-[32px] border border-[#96b0da]/18 bg-white/76 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.74),0_8px_16px_-4px_rgba(106,128,165,0.06)] transition-all duration-[240ms] hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(106,128,165,0.15)]">
            <div className="flex flex-col gap-2">
              <span className="inline-flex self-start items-center min-h-[32px] px-3 rounded-full border border-[#92abd1]/20 bg-white/72 text-[rgba(23,48,77,0.72)] text-[0.72rem] font-bold tracking-[0.14em] uppercase mb-1">{item.label}</span>
              <h3 className="m-0 text-[1.2rem] leading-tight text-[#101c33] font-bold">{item.title}</h3>
              <p className="m-0 text-[0.94rem] leading-[1.58] text-[rgba(16,28,51,0.84)]">{item.description}</p>
            </div>
            <button
              type="button"
              className="self-start min-h-[42px] px-4 rounded-[14px] text-[0.88rem] mb-2 inline-flex items-center justify-center font-bold text-[#101c33]/84 bg-white/84 border border-[#92abd1]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] transition-all duration-[180ms] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_10px_20px_-5px_rgba(106,128,165,0.15)] active:scale-95"
              onClick={() => { hapticTrigger(); item.onTrigger(); }}
            >
              {item.actionLabel}
            </button>
            <CodeBlock code={item.code} />
          </Surface>
        ))}
      </section>
    </div>
  );
}

function BuilderChip(props: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  const { active = false, children, onClick } = props;
  return (
    <button
      type="button"
      className={`inline-flex min-h-[44px] items-center justify-center rounded-full border px-5 text-[1rem] transition-all duration-200 ${active
        ? "border-[#d4dcfb] bg-[linear-gradient(180deg,#f4f6ff,#eaf0ff)] text-[#2947ae] shadow-[0_10px_24px_rgba(62,82,160,0.12)]"
        : "border-[#e3dbd1] bg-[#f6f0e8] text-[#302d28] hover:-translate-y-px hover:border-[#d7dff8] hover:bg-white"
        }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function BuilderToggle(props: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  hideLabel?: boolean;
  disabled?: boolean;
}) {
  const { label, checked, onChange, hideLabel = false, disabled = false } = props;
  return (
    <label className="flex items-center justify-between gap-4 text-[1.02rem] text-[#25304a]">
      {hideLabel ? null : <span>{label}</span>}
      <button
        type="button"
        aria-pressed={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 ${checked
          ? "border-[#263a76] bg-[#263a76]"
          : "border-[#e4ddd3] bg-[#ece7df]"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span
          className={`absolute h-6 w-6 rounded-full shadow-[0_4px_10px_rgba(17,24,18,0.12)] transition-transform duration-200 ${checked ? "translate-x-[29px] bg-[#fff6ee]" : "translate-x-[3px] bg-white"
            }`}
        />
      </button>
    </label>
  );
}

function BuilderToggleCard(props: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const { label, description, checked, onChange, disabled = false } = props;

  return (
    <div className="rounded-[24px] border border-[#ebe4da] bg-[#fbf8f3] px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 pr-2">
          <div className="text-[1rem] font-semibold text-[#2c2a26]">{label}</div>
          <p className="mt-1 text-[0.92rem] leading-[1.55] text-[#8b857c]">
            {description}
          </p>
        </div>
        <BuilderToggle
          label={label}
          checked={checked}
          onChange={onChange}
          hideLabel
          disabled={disabled}
        />
      </div>
    </div>
  );
}

interface ReferenceLandingPageProps extends Pick<
  HomeViewProps,
  | "hapticTrigger"
  | "radius"
  | "blur"
  | "historyEnabled"
  | "theme"
  | "position"
  | "showProgress"
  | "swipeToDismiss"
  | "expandOnHover"
  | "pauseOnHover"
  | "builtInLayer"
  | "portalEnabled"
  | "limitVisible"
  | "maxVisible"
  | "queueLimit"
  | "overflowStrategy"
  | "dedupeBehavior"
  | "providerAppearance"
  | "onRadiusChange"
  | "onBlurChange"
  | "onHistoryChange"
  | "onThemeChange"
  | "onPositionChange"
  | "onShowProgressChange"
  | "onSwipeToDismissChange"
  | "onExpandOnHoverChange"
  | "onPauseOnHoverChange"
  | "onBuiltInLayerChange"
  | "onPortalEnabledChange"
  | "onLimitVisibleChange"
  | "onMaxVisibleChange"
  | "onQueueLimitChange"
  | "onOverflowStrategyChange"
  | "onDedupeBehaviorChange"
> { }

function ReferenceLandingPage(props: ReferenceLandingPageProps) {
  const {
    hapticTrigger,
    radius,
    blur,
    historyEnabled,
    theme,
    position,
    showProgress,
    swipeToDismiss,
    expandOnHover,
    pauseOnHover,
    builtInLayer,
    portalEnabled,
    limitVisible,
    maxVisible,
    queueLimit,
    overflowStrategy,
    dedupeBehavior,
    providerAppearance,
    onRadiusChange,
    onBlurChange,
    onHistoryChange,
    onThemeChange,
    onPositionChange,
    onShowProgressChange,
    onSwipeToDismissChange,
    onExpandOnHoverChange,
    onPauseOnHoverChange,
    onBuiltInLayerChange,
    onPortalEnabledChange,
    onLimitVisibleChange,
    onMaxVisibleChange,
    onQueueLimitChange,
    onOverflowStrategyChange,
    onDedupeBehaviorChange,
  } = props;

  const [installCopied, setInstallCopied] = useState(false);
  const [builderIntent, setBuilderIntent] = useState<IntentOption>("success");
  const [builderTitle, setBuilderTitle] = useState("Changes saved");
  const [builderDescriptionEnabled, setBuilderDescriptionEnabled] = useState(true);
  const [builderDescription, setBuilderDescription] = useState(
    "Your changes have been saved and synced successfully.",
  );
  const [builderActionEnabled, setBuilderActionEnabled] = useState(false);
  const [builderClosable, setBuilderClosable] = useState(true);
  const [builderCustomBody, setBuilderCustomBody] = useState(false);
  const [builderPersistent, setBuilderPersistent] = useState(false);
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderShowProgress, setBuilderShowProgress] = useState(false);
  const [builderUseDedupeKey, setBuilderUseDedupeKey] = useState(false);
  const [builderDuration, setBuilderDuration] = useState(4000);
  const [selectedDocExampleId, setSelectedDocExampleId] = useState<
    (typeof DOC_LIVE_TOASTS)[number]["id"]
  >("success");
  const themeSurfaceLabel = LANDING_THEME_SURFACE_LABELS[theme];
  const runDocDemo = (action: () => void) => {
    hapticTrigger();
    action();
  };
  const selectedDocExample = DOC_LIVE_TOASTS.find(
    (item) => item.id === selectedDocExampleId,
  ) ?? DOC_LIVE_TOASTS[0];

  const builderCode = useMemo(() => {
    const lines = [`toast.show({`, `  title: ${JSON.stringify(builderTitle)},`];

    if (builderDescriptionEnabled) {
      lines.push(`  description: ${JSON.stringify(builderDescription)},`);
    }

    if (builderIntent !== "default") {
      lines.push(`  intent: ${JSON.stringify(builderIntent)},`);
    }

    if (!builderClosable) {
      lines.push("  closable: false,");
    }

    if (builderPersistent) {
      lines.push("  persistent: true,");
    } else {
      lines.push(`  duration: ${builderDuration},`);
    }

    if (builderLoading) {
      lines.push("  loading: true,");
    }

    if (builderShowProgress) {
      lines.push("  showProgress: true,");
      if (!builderLoading) {
        lines.push("  progress: 0.64,");
      }
    }

    if (builderUseDedupeKey) {
      lines.push(`  dedupeKey: "playground-demo",`);
    }

    if (builderCustomBody) {
      lines.push("  body: (");
      lines.push("    <ReleaseStatusCard");
      lines.push(`      title={${JSON.stringify(builderTitle)}}`);
      if (builderDescriptionEnabled) {
        lines.push(`      description={${JSON.stringify(builderDescription)}}`);
      }
      lines.push(`      intent={${JSON.stringify(builderIntent)}}`);
      lines.push("    />");
      lines.push("  ),");
    }

    if (builderActionEnabled && !builderCustomBody) {
      lines.push("  action: {");
      lines.push('    label: "Undo",');
      lines.push("    onClick: () => {},");
      lines.push("  },");
    }

    lines.push("});");
    return lines.join("\n");
  }, [
    builderActionEnabled,
    builderClosable,
    builderCustomBody,
    builderDescription,
    builderDescriptionEnabled,
    builderDuration,
    builderIntent,
    builderLoading,
    builderPersistent,
    builderShowProgress,
    builderTitle,
    builderUseDedupeKey,
  ]);

  const triggerBuilderToast = () => {
    const icon =
      builderIntent === "success"
        ? <SparkIcon />
        : builderIntent === "info"
          ? <InboxIcon />
          : builderIntent === "warning"
            ? <BellIcon />
            : builderIntent === "error"
              ? "!"
              : undefined;
    const body = builderCustomBody ? (
      <DemoCustomToastBody
        intent={builderIntent}
        title={builderTitle}
        description={
          builderDescriptionEnabled
            ? builderDescription
            : "Use any React component to replace the default toast body."
        }
        primaryLabel="Inspect"
        secondaryLabel="Acknowledge"
        onPrimary={() => {
          toast.info({
            title: "Custom panel opened",
            description: "The embedded CTA can launch any follow-up flow you need.",
            icon: <InboxIcon />,
          });
        }}
        onSecondary={() => {
          toast.success({
            title: "Inline action complete",
            description: "The custom body handled its own button click.",
            icon: <SparkIcon />,
          });
        }}
      />
    ) : undefined;

    hapticTrigger();
    toast.show({
      title: builderTitle,
      description: builderDescriptionEnabled ? builderDescription : undefined,
      body,
      intent: builderIntent === "default" ? undefined : builderIntent,
      duration: builderPersistent ? undefined : builderDuration,
      closable: builderClosable,
      persistent: builderPersistent,
      loading: builderLoading,
      showProgress: builderShowProgress,
      progress: builderShowProgress && !builderLoading ? 0.64 : undefined,
      dedupeKey: builderUseDedupeKey ? "playground-demo" : undefined,
      icon,
      action: builderActionEnabled && !builderCustomBody
        ? {
          label: "Undo",
          onClick: () => {
            toast.success({
              title: "Action reversed",
              description: "The last change was rolled back.",
              icon: <SparkIcon />,
            });
          },
        }
        : undefined,
    });
  };

  const copyInstallCommand = () => {
    navigator.clipboard.writeText(INSTALL_SNIPPET);
    setInstallCopied(true);
    toast.show({
      title: "Install command copied",
      description: "Ready to paste in your terminal.",
      intent: "success",
      icon: <SparkIcon />,
    });
    setTimeout(() => setInstallCopied(false), 2000);
  };

  return (
    <div className="relative z-[1] mx-auto w-[min(1460px,calc(100vw-48px))] pt-6 pb-24 md:w-[min(1460px,calc(100vw-64px))]">
      <header className="border-b border-[#ddd7cf] pb-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-[1.7rem] font-bold tracking-[-0.04em] text-[#1c2d53]">
            <span className="inline-flex h-10 w-10 rotate-[12deg] items-center justify-center rounded-[14px] border border-white/80 bg-[radial-gradient(circle_at_30%_28%,rgba(255,248,238,1),rgba(255,211,165,0.82)_34%,rgba(81,105,196,0.58)_100%)] text-white shadow-[0_24px_48px_rgba(55,70,123,0.16)]"><span className="-rotate-[12deg] text-[#fff9f0]"><svg viewBox="0 0 20 20" aria-hidden="true" width="18" height="18"><path d="M10 2.8 11.7 8.3 17.2 10 11.7 11.7 10 17.2 8.3 11.7 2.8 10 8.3 8.3 10 2.8Z" fill="currentColor"></path></svg></span></span>
            <span className="font-['Outfit']">toaststar</span>
          </div>

          <nav className="flex flex-wrap items-center gap-6 text-[0.96rem] text-[#726c64]">
            <a href="#examples" className="transition-colors hover:text-[#23211e]">Examples</a>
            <a href="#playground" className="transition-colors hover:text-[#233760]">Playground</a>
            <a href="#docs" className="transition-colors hover:text-[#233760]">Docs</a>
            <a href="#api" className="transition-colors hover:text-[#233760]">API</a>
          </nav>
        </div>
      </header>

      <section className="grid gap-12 border-b border-[#ddd7cf] py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,0.92fr)]">
        <div className="max-w-[760px] pt-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d9deed] bg-white/92 px-4 py-2 text-[0.92rem] text-[#6f6a63] shadow-[0_10px_22px_rgba(48,62,110,0.06)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#d68446]" />
            v0.1.0
          </span>

          <h1 className="mt-10 flex flex-wrap items-center gap-4 text-[clamp(4rem,10vw,6.9rem)] leading-[0.88] tracking-[-0.085em] font-bold font-['Outfit']">
            <span className="bg-gradient-to-r from-[#172349] via-[#3e61c8] to-[#d88545] bg-clip-text text-transparent">
              toaststar
            </span>
            <span className="inline-flex h-[70px] w-[70px] rotate-[12deg] items-center justify-center rounded-[24px] border border-white/80 bg-[radial-gradient(circle_at_30%_28%,rgba(255,248,238,1),rgba(255,211,165,0.82)_34%,rgba(81,105,196,0.58)_100%)] text-white shadow-[0_24px_48px_rgba(55,70,123,0.16)]">
              <span className="-rotate-[12deg] text-[#fff9f0]">
                <SparkIcon />
              </span>
            </span>
          </h1>

          <p className="mt-7 max-w-[31ch] text-[clamp(1.2rem,2.2vw,1.62rem)] leading-[1.62] text-[#625b54]">
            Clean toast notifications for React with a quieter visual system,
            interactive playground controls, and docs that still feel like a product page.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#1f315e] px-6 text-[0.98rem] font-semibold text-white shadow-[0_14px_30px_rgba(39,58,116,0.18)] transition-all duration-200 hover:-translate-y-px hover:bg-[#18284e]"
              onClick={() => launchHeroSequence(hapticTrigger)}
            >
              Preview welcome flow
            </button>
            <a
              href="#playground"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#d8deed] bg-white/88 px-6 text-[0.98rem] font-semibold text-[#25304a] transition-all duration-200 hover:-translate-y-px hover:border-[#cfd7f2] hover:bg-white"
            >
              Open playground
            </a>
          </div>

          <div className="mt-9 flex max-w-[460px] items-center gap-3 rounded-[22px] border border-[#dbe1ef] bg-white px-4 py-3 shadow-[0_12px_28px_rgba(43,58,110,0.06)]">
            <span className="text-[#a08d7d]">$</span>
            <code className="grow overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[0.98rem] text-[#2f3446]">
              {INSTALL_SNIPPET}
            </code>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-[#eddccf] bg-[#fff3e8] px-3 py-1.5 text-[0.84rem] font-semibold text-[#9a5d2a] transition-colors hover:bg-white"
              onClick={copyInstallCommand}
            >
              {installCopied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="rounded-[38px] border border-[#d8deee] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,248,252,0.92))] p-8 shadow-[0_30px_70px_rgba(45,58,109,0.1)]">
          <div className="flex items-center justify-between gap-4 text-[0.78rem] font-semibold uppercase tracking-[0.22em] text-[#91887c]">
            <span>Runtime preview</span>
            <span>Previewing the real provider</span>
          </div>

          <div className="mt-7 rounded-[28px] border border-[#e5e2ef] bg-[linear-gradient(145deg,rgba(255,248,241,0.96),rgba(245,247,255,0.96))] p-5">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-[#d8deef] bg-white text-[#d17a35] shadow-[0_12px_24px_rgba(47,62,110,0.08)]">
                <SparkIcon />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <strong className="text-[1.08rem] font-semibold text-[#232947]">
                    Changes saved
                  </strong>
                  <span className="rounded-full bg-[#fff0dd] px-3 py-1 text-[0.8rem] font-semibold text-[#b86a28]">
                    live
                  </span>
                </div>
                <p className="mt-2 max-w-[28ch] text-[0.98rem] leading-[1.6] text-[#5c5f70]">
                  Understated feedback with soft contrast, readable density, and zero visual clutter.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: "Theme", value: theme },
              { label: "Radius", value: `${radius}px` },
              { label: "Blur", value: `${blur}px` },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[22px] border border-[#e4e3f0] bg-[#f8f8fc] px-4 py-4"
              >
                <div className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-[#92867b]">
                  {item.label}
                </div>
                <div className="mt-2 text-[1rem] font-semibold text-[#27314f]">
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[24px] border border-[#e3e2ef] bg-white px-5 py-5">
            <div className="text-[0.78rem] font-semibold uppercase tracking-[0.2em] text-[#94897d]">
              Playground state
            </div>
            <div className="mt-4 grid gap-3 text-[0.98rem] text-[#5c5a63]">
              <div className="flex items-center justify-between gap-4">
                <span>History panel</span>
                <span className="font-medium text-[#26314f]">
                  {historyEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Runtime scope</span>
                <span className="font-medium text-[#26314f]">{DEMO_SCOPE}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>History storage</span>
                <span className="font-medium text-[#26314f]">
                  {historyEnabled ? "IndexedDB" : "Off"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Position</span>
                <span className="font-medium text-[#26314f]">{position}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Surface</span>
                <span className="font-medium text-[#26314f]">{themeSurfaceLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Provider progress</span>
                <span className="font-medium text-[#26314f]">{showProgress ? "On" : "Off"}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Fan-out / swipe</span>
                <span className="font-medium text-[#26314f]">
                  {expandOnHover ? "Hover" : "Static"} · {swipeToDismiss ? "Swipe" : "Locked"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Render mode</span>
                <span className="font-medium text-[#26314f]">
                  {builtInLayer ? (portalEnabled ? "Portal layer" : "Inline layer") : "Headless"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Stack policy</span>
                <span className="font-medium text-[#26314f]">
                  {limitVisible ? `${maxVisible} visible / ${queueLimit} queued` : "Unlimited"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="examples"
        className="grid gap-12 py-14 lg:grid-cols-[minmax(0,0.78fr)_minmax(390px,0.92fr)]"
      >
        <div className="min-w-0">
          <div className="mb-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-end">
            <div>
              <h2 className="text-[clamp(2.4rem,4vw,3.4rem)] leading-[0.95] tracking-[-0.06em] text-[#202848] font-bold font-['Outfit']">
                Examples
              </h2>
              <p className="mt-2 text-[1.02rem] text-[#8a8378]">
                Click any pattern to preview it immediately.
              </p>
            </div>
            <div className="text-left text-[0.92rem] text-[#a49381] lg:pb-2 lg:text-right">
              Click to preview
            </div>
          </div>

          <div className="grid gap-9">
            {BUILDER_EXAMPLE_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="mb-4 text-[0.92rem] font-semibold uppercase tracking-[0.2em] text-[#988b7d]">
                  {group.title}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {group.items.map((item) => (
                    <BuilderChip
                      key={item.label}
                      onClick={() => {
                        hapticTrigger();
                        item.onTrigger();
                      }}
                    >
                      {item.label}
                    </BuilderChip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div id="playground" className="lg:sticky lg:top-8">
          <div className="mb-6">
            <h2 className="text-[clamp(2.2rem,3.3vw,3.2rem)] leading-[0.96] tracking-[-0.06em] text-[#202848] font-bold font-['Outfit']">
              Playground
            </h2>
            <p className="mt-2 text-[1.02rem] text-[#8a8378]">
              Design and test your toast in real time.
            </p>
          </div>
          <div className="rounded-[34px] border border-[#dbe0ee] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,248,252,0.94))] p-8 shadow-[0_30px_70px_rgba(45,58,109,0.1)]">
            <div className="grid gap-8">
              <div>
                <div className="mb-3 text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                  Position
                </div>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "Top", value: "top" },
                    { label: "Bottom", value: "bottom" },
                  ].map((item) => (
                    <BuilderChip
                      key={item.value}
                      active={position === item.value}
                      onClick={() => onPositionChange(item.value as PositionOption)}
                    >
                      {item.label}
                    </BuilderChip>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                  Type
                </div>
                <div className="flex flex-wrap gap-3">
                  {(["default", "success", "error", "warning", "info"] as IntentOption[]).map((item) => (
                    <BuilderChip
                      key={item}
                      active={builderIntent === item}
                      onClick={() => setBuilderIntent(item)}
                    >
                      {item}
                    </BuilderChip>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                  Title
                </div>
                <input
                  className="w-full rounded-[20px] border border-[#e1d9cf] bg-[#fbf8f2] px-4 py-3 text-[1.02rem] text-[#2a3042] outline-none transition-colors focus:border-[#9ba9e1]"
                  value={builderTitle}
                  onChange={(e) => setBuilderTitle(e.target.value)}
                />
              </div>

              <div className="grid gap-4">
                <BuilderToggle
                  label="Description"
                  checked={builderDescriptionEnabled}
                  onChange={setBuilderDescriptionEnabled}
                />
                {builderDescriptionEnabled ? (
                  <textarea
                    className="min-h-[112px] w-full rounded-[22px] border border-[#e1d9cf] bg-[#fbf8f2] px-4 py-3 text-[1rem] leading-[1.6] text-[#2a3042] outline-none transition-colors focus:border-[#9ba9e1]"
                    value={builderDescription}
                    onChange={(e) => setBuilderDescription(e.target.value)}
                  />
                ) : null}
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-[28px] border border-[#e2e2ef] bg-[#f8f7fb] p-5">
                  <div className="text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                    Toast behavior
                  </div>
                  <div className="mt-4 grid gap-3">
                    <BuilderToggleCard
                      label="Action button"
                      description="Add an Undo control directly inside the toast."
                      checked={builderActionEnabled}
                      onChange={setBuilderActionEnabled}
                      disabled={builderCustomBody}
                    />
                    <BuilderToggleCard
                      label="Closable"
                      description="Keep the close affordance visible for manual dismissal."
                      checked={builderClosable}
                      onChange={setBuilderClosable}
                    />
                    <BuilderToggleCard
                      label="Persistent"
                      description="Pin the notification until the user dismisses it."
                      checked={builderPersistent}
                      onChange={setBuilderPersistent}
                    />
                    <BuilderToggleCard
                      label="Loading state"
                      description="Render the toast as an in-flight task instead of a completed update."
                      checked={builderLoading}
                      onChange={setBuilderLoading}
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#e2e2ef] bg-[#f8f7fb] p-5">
                  <div className="text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                    Toast extras
                  </div>
                  <div className="mt-4 grid gap-3">
                    <BuilderToggleCard
                      label="Custom component body"
                      description="Replace the default title and description layout with any React component."
                      checked={builderCustomBody}
                      onChange={setBuilderCustomBody}
                    />
                    <BuilderToggleCard
                      label="Toast progress override"
                      description="Turn the progress bar on just for this toast."
                      checked={builderShowProgress}
                      onChange={setBuilderShowProgress}
                    />
                    <BuilderToggleCard
                      label="Dedupe key"
                      description="Reuse a stable key so repeated clicks update one toast."
                      checked={builderUseDedupeKey}
                      onChange={setBuilderUseDedupeKey}
                    />
                    <BuilderToggleCard
                      label="History panel"
                      description="Persist notifications in IndexedDB for this demo. In app code, switch to memory for session-only history."
                      checked={historyEnabled}
                      onChange={onHistoryChange}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center justify-between text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                    <span>Theme</span>
                    <span className="text-[#5b5864]">{theme}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {(["glass", "midnight", "sunset", "forest", "ocean"] as ThemeOption[]).map((item) => (
                      <BuilderChip
                        key={item}
                        active={theme === item}
                        onClick={() => onThemeChange(item)}
                      >
                        {item}
                      </BuilderChip>
                    ))}
                  </div>
                </div>

                <div className="grid gap-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                      <span>Radius</span>
                      <span className="text-[#5b5864]">{radius}px</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="36"
                      value={radius}
                      onChange={(e) => onRadiusChange(Number(e.target.value))}
                      className="w-full cursor-pointer accent-[#4867d7]"
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                      <span>Blur</span>
                      <span className="text-[#5b5864]">{blur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={blur}
                      onChange={(e) => onBlurChange(Number(e.target.value))}
                      className="w-full cursor-pointer accent-[#4867d7]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                  <span>Display duration</span>
                  <span className="text-[#5b5864]">
                    {builderPersistent ? "Persistent" : `${(builderDuration / 1000).toFixed(1)}s`}
                  </span>
                </div>
                <input
                  type="range"
                  min="1500"
                  max="10000"
                  step="500"
                  value={builderDuration}
                  disabled={builderPersistent}
                  onChange={(e) => setBuilderDuration(Number(e.target.value))}
                  className={`w-full accent-[#4867d7] ${builderPersistent ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                />
                <p className="mt-2 text-[0.9rem] leading-[1.55] text-[#8a8378]">
                  Used only when persistent mode is off.
                </p>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-[28px] border border-[#e2e2ef] bg-[#f8f7fb] p-5">
                  <div className="text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                    Runtime defaults
                  </div>
                  <p className="mt-2 text-[0.94rem] leading-[1.6] text-[#8a8378]">
                    These switches update the mounted provider, so every example on the page reflects the same runtime.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <BuilderToggleCard
                      label="Provider progress default"
                      description="Keep progress off globally, or show it by default on compatible toasts."
                      checked={showProgress}
                      onChange={onShowProgressChange}
                    />
                    <BuilderToggleCard
                      label="Swipe to dismiss"
                      description="Enable touch and pen swipes to dismiss a toast."
                      checked={swipeToDismiss}
                      onChange={onSwipeToDismissChange}
                    />
                    <BuilderToggleCard
                      label="Hover fan-out"
                      description="Expand the stack only when the pointer intentionally inspects it."
                      checked={expandOnHover}
                      onChange={onExpandOnHoverChange}
                    />
                    <BuilderToggleCard
                      label="Pause on hover"
                      description="Freeze auto-dismiss timers while the user is reading."
                      checked={pauseOnHover}
                      onChange={onPauseOnHoverChange}
                    />
                    <BuilderToggleCard
                      label="Built-in layer"
                      description="Use the library UI layer instead of headless mode."
                      checked={builtInLayer}
                      onChange={onBuiltInLayerChange}
                    />
                    <BuilderToggleCard
                      label="Portal to body"
                      description="Mount toasts in a body-level portal instead of inline."
                      checked={portalEnabled}
                      onChange={onPortalEnabledChange}
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#e2e2ef] bg-[#f8f7fb] p-5">
                  <div className="text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                    Stack policies
                  </div>
                  <p className="mt-2 text-[0.94rem] leading-[1.6] text-[#8a8378]">
                    Tune how many toasts stay visible and what happens when a burst exceeds the visible limit.
                  </p>
                  <div className="mt-4 grid gap-4">
                    <BuilderToggleCard
                      label="Finite visible stack"
                      description="Cap the visible cards so queue and overflow rules can take over."
                      checked={limitVisible}
                      onChange={onLimitVisibleChange}
                    />

                    <div className={`rounded-[24px] border border-[#e2e2ef] bg-white px-4 py-4 ${limitVisible ? "" : "opacity-55"}`}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                        <span>Max visible</span>
                        <span className="text-[#5b5864]">{limitVisible ? maxVisible : "Unlimited"}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="6"
                        value={maxVisible}
                        disabled={!limitVisible}
                        onChange={(e) => onMaxVisibleChange(Number(e.target.value))}
                        className={`w-full accent-[#4867d7] ${limitVisible ? "cursor-pointer" : "cursor-not-allowed"}`}
                      />
                    </div>

                    <div className={`rounded-[24px] border border-[#e2e2ef] bg-white px-4 py-4 ${limitVisible ? "" : "opacity-55"}`}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                        <span>Queue limit</span>
                        <span className="text-[#5b5864]">{limitVisible ? queueLimit : "Off"}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="12"
                        value={queueLimit}
                        disabled={!limitVisible}
                        onChange={(e) => onQueueLimitChange(Number(e.target.value))}
                        className={`w-full accent-[#4867d7] ${limitVisible ? "cursor-pointer" : "cursor-not-allowed"}`}
                      />
                    </div>

                    <label className={`grid gap-2 rounded-[24px] border border-[#e2e2ef] bg-white px-4 py-4 ${limitVisible ? "" : "opacity-55"}`}>
                      <span className="text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                        Overflow strategy
                      </span>
                      <select
                        className="w-full rounded-[16px] border border-[#e1d9cf] bg-[#fbf8f2] px-4 py-3 text-[0.98rem] text-[#2a3042] outline-none transition-colors focus:border-[#9ba9e1]"
                        value={overflowStrategy}
                        disabled={!limitVisible}
                        onChange={(e) => onOverflowStrategyChange(e.target.value as OverflowOption)}
                      >
                        <option value="queue">Queue</option>
                        <option value="drop-oldest">Drop oldest</option>
                        <option value="drop-newest">Drop newest</option>
                      </select>
                    </label>

                    <label className="grid gap-2 rounded-[24px] border border-[#e2e2ef] bg-white px-4 py-4">
                      <span className="text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                        Dedupe behavior
                      </span>
                      <select
                        className="w-full rounded-[16px] border border-[#e1d9cf] bg-[#fbf8f2] px-4 py-3 text-[0.98rem] text-[#2a3042] outline-none transition-colors focus:border-[#9ba9e1]"
                        value={dedupeBehavior}
                        onChange={(e) => onDedupeBehaviorChange(e.target.value as DedupeOption)}
                      >
                        <option value="ignore">Ignore</option>
                        <option value="update">Update</option>
                        <option value="reset-duration">Reset duration</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex min-h-[58px] items-center justify-center rounded-[22px] bg-[#1f315e] px-6 text-[1.02rem] font-semibold text-white shadow-[0_16px_28px_rgba(39,58,116,0.18)] transition-all duration-200 hover:-translate-y-px hover:bg-[#18284e]"
                onClick={triggerBuilderToast}
              >
                Play Toast
              </button>

              <div id="api" className="rounded-[28px] border border-[#e2e4ef] bg-[#f8f7fb] p-5">
                <CodeBlock code={builderCode} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="docs" className="border-t border-[#ddd7cf] py-16">
        <div className="max-w-[60ch]">
          <h2 className="text-[clamp(2.6rem,4vw,3.8rem)] leading-[0.94] tracking-[-0.07em] text-[#202848] font-bold font-['Outfit']">
            Documentation
          </h2>
          <p className="mt-3 text-[1.05rem] leading-[1.7] text-[#787167]">
            Keep it simple: install the package, mount one provider, then call the toast API from
            your UI. When multiple apps share a page, add a scope. When you need saved activity,
            choose IndexedDB or in-memory history.
          </p>
        </div>

        <div className="mt-10 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
          <div className="grid min-w-0 gap-6">
            <div className="rounded-[32px] border border-[#dfe3ef] bg-white/92 p-6 shadow-[0_18px_42px_rgba(41,55,103,0.07)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                    Start here
                  </div>
                  <h3 className="mt-2 text-[1.4rem] leading-[1.08] text-[#1f2642] font-bold">
                    Three steps to a working toast
                  </h3>
                </div>
                <span className="inline-flex items-center rounded-full border border-[#e8d8ca] bg-[#fff2e7] px-4 py-2 text-[0.82rem] font-semibold text-[#9a5d2a]">
                  Simple setup
                </span>
              </div>

              <div className="mt-6 grid gap-4">
                {DOC_QUICKSTART_STEPS.map((step) => (
                  <article
                    key={step.step}
                    className="rounded-[26px] border border-[#e2e2ef] bg-[#f8f7fb] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                          {step.eyebrow}
                        </div>
                        <h4 className="mt-2 text-[1.14rem] leading-[1.15] text-[#1f2642] font-bold">
                          {step.title}
                        </h4>
                      </div>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7ddf3] bg-white text-[0.84rem] font-semibold text-[#3855b8]">
                        {step.step}
                      </span>
                    </div>
                    <p className="mt-3 max-w-[58ch] text-[0.96rem] leading-[1.65] text-[#6b6973]">
                      {step.description}
                    </p>
                    <CodeBlock code={step.code} />
                    {step.step === "03" ? (
                      <button
                        type="button"
                        className="mt-4 inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full bg-[#1f315e] px-5 text-[0.92rem] font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#18284e]"
                        onClick={() => runDocDemo(showSuccessToast)}
                      >
                        Play toast
                      </button>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-[#dfe3ef] bg-white/92 p-6 shadow-[0_18px_42px_rgba(41,55,103,0.07)]">
              <div className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                Need more?
              </div>
              <h3 className="mt-2 text-[1.4rem] leading-[1.08] text-[#1f2642] font-bold">
                Add scoped runtimes, history, or headless mode only when needed
              </h3>
              <p className="mt-3 max-w-[56ch] text-[0.98rem] leading-[1.65] text-[#756f67]">
                Most apps stop after the quick start. These extras are here for async work, shared
                pages, saved notifications, and fully custom rendering.
              </p>

              <div className="mt-6 grid gap-4">
                <article className="rounded-[26px] border border-[#e2e2ef] bg-[#f8f7fb] p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                        Promise flow
                      </div>
                      <h4 className="mt-2 text-[1.14rem] leading-[1.15] text-[#1f2642] font-bold">
                        Keep one toast updated while work is running
                      </h4>
                      <p className="mt-3 text-[0.96rem] leading-[1.65] text-[#6b6973]">
                        Use `toast.promise` when you want pending, success, and error states to
                        stay tied to the same task.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex min-h-[42px] items-center justify-center whitespace-nowrap rounded-full border border-[#d8deed] bg-white px-4 text-[0.9rem] font-semibold text-[#25304a] transition-all duration-200 hover:-translate-y-px hover:border-[#cfd7f2]"
                      onClick={() => runDocDemo(showPromiseFlow)}
                    >
                      Play toast
                    </button>
                  </div>
                  <CodeBlock code={PROMISE_SNIPPET} />
                </article>

                <article className="rounded-[26px] border border-[#e2e2ef] bg-[#f8f7fb] p-5">
                  <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                    Scoped runtime
                  </div>
                  <h4 className="mt-2 text-[1.14rem] leading-[1.15] text-[#1f2642] font-bold">
                    Isolate one provider when several apps share the same page
                  </h4>
                  <p className="mt-3 text-[0.96rem] leading-[1.65] text-[#6b6973]">
                    Pair `createToastScope("checkout")` with `scope="checkout"` on the provider
                    so one widget cannot accidentally fire another widget&apos;s toasts.
                  </p>
                  <CodeBlock code={SCOPED_RUNTIME_SNIPPET} />
                </article>

                <article className="rounded-[26px] border border-[#e2e2ef] bg-[#f8f7fb] p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                        History panel
                      </div>
                      <h4 className="mt-2 text-[1.14rem] leading-[1.15] text-[#1f2642] font-bold">
                        Keep recent notifications available after they close
                      </h4>
                      <p className="mt-3 text-[0.96rem] leading-[1.65] text-[#6b6973]">
                        Enable history with `storage: "indexeddb"` when you want persistence
                        across reloads, or switch to `storage: "memory"` when saved activity
                        should stay inside the current tab session only.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex min-h-[42px] items-center justify-center whitespace-nowrap rounded-full border border-[#d8deed] bg-white px-4 text-[0.9rem] font-semibold text-[#25304a] transition-all duration-200 hover:-translate-y-px hover:border-[#cfd7f2]"
                      onClick={() => runDocDemo(showHistoryToast)}
                    >
                      Play toast
                    </button>
                  </div>
                  <CodeBlock code={HISTORY_SNIPPET} />
                </article>

                <article className="rounded-[26px] border border-[#e2e2ef] bg-[#f8f7fb] p-5">
                  <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                    Headless mode
                  </div>
                  <h4 className="mt-2 text-[1.14rem] leading-[1.15] text-[#1f2642] font-bold">
                    Bring your own UI when you only need state and events
                  </h4>
                  <p className="mt-3 text-[0.96rem] leading-[1.65] text-[#6b6973]">
                    Turn off the built-in layer if your design system already owns the visual
                    surface and you only want runtime behavior.
                  </p>
                  <CodeBlock code={HEADLESS_SNIPPET} />
                </article>

                <article className="rounded-[26px] border border-[#e2e2ef] bg-[#f8f7fb] p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                        Custom body
                      </div>
                      <h4 className="mt-2 text-[1.14rem] leading-[1.15] text-[#1f2642] font-bold">
                        Render any React component inside the toast shell
                      </h4>
                      <p className="mt-3 text-[0.96rem] leading-[1.65] text-[#6b6973]">
                        Keep the stack behavior, theming, and chrome while swapping the body for
                        richer UI like status cards, mini forms, or inline action clusters.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex min-h-[42px] items-center justify-center whitespace-nowrap rounded-full border border-[#d8deed] bg-white px-4 text-[0.9rem] font-semibold text-[#25304a] transition-all duration-200 hover:-translate-y-px hover:border-[#cfd7f2]"
                      onClick={() => runDocDemo(showCustomBodyToast)}
                    >
                      Play toast
                    </button>
                  </div>
                  <CodeBlock code={CUSTOM_BODY_SNIPPET} />
                </article>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 max-w-full gap-6 self-start xl:w-full xl:max-w-[380px] xl:justify-self-end">
            <div className="min-w-0 max-w-full rounded-[32px] border border-[#dfe3ef] bg-white/92 p-6 shadow-[0_18px_42px_rgba(41,55,103,0.07)]">
              <div className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                Try live toasts
              </div>
              <h3 className="mt-2 max-w-[16ch] text-[1.28rem] leading-[1.08] text-[#1f2642] font-bold">
                Click to feel the runtime before reading every API
              </h3>
              <p className="mt-3 text-[0.98rem] leading-[1.65] text-[#756f67]">
                These buttons fire the real scoped provider on this page, so you can test basic
                success, async flows, and deduped updates immediately without affecting any other
                toaststar runtime.
              </p>

              <div className="mt-4 min-w-0 rounded-[22px] border border-[#e7dfd5] bg-[#fff6ee] px-4 py-3 text-[0.9rem] leading-[1.55] text-[#866247]">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 break-words">
                  <span>Demo scope:</span>
                  <code className="break-all font-mono text-[0.88rem] text-[#5f4838]">{DEMO_SCOPE}</code>
                  <span className="hidden text-[#c0a488] sm:inline">·</span>
                  <span>History storage:</span>
                  <strong>{historyEnabled ? "IndexedDB" : "Off"}</strong>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3">
                {DOC_LIVE_TOASTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`rounded-[24px] border px-4 py-4 text-left transition-all duration-200 hover:-translate-y-px ${selectedDocExampleId === item.id
                      ? "border-[#cfd7f2] bg-white shadow-[0_12px_24px_rgba(60,77,135,0.08)]"
                      : "border-[#e2e2ef] bg-[#f8f7fb] hover:border-[#d4dcfb] hover:bg-white"
                      }`}
                    onClick={() => {
                      setSelectedDocExampleId(item.id);
                      runDocDemo(item.action);
                    }}
                  >
                    <div className="text-[0.98rem] font-semibold text-[#1f2642]">{item.label}</div>
                    <div className="mt-1 text-[0.92rem] leading-[1.55] text-[#6b6973]">
                      {item.description}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 min-w-0 max-w-full rounded-[24px] border border-[#eadfce] bg-white/92 p-4">
                <div className="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                  Example code
                </div>
                <p className="mt-2 text-[0.92rem] leading-[1.6] text-[#756f67]">
                  The selected live demo uses this snippet.
                </p>
                <CodeBlock code={selectedDocExample.code} />
              </div>
            </div>

            <div className="min-w-0 max-w-full rounded-[32px] border border-[#dfe3ef] bg-white/92 p-6 shadow-[0_18px_42px_rgba(41,55,103,0.07)]">
              <div className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                Live history
              </div>
              <h3 className="mt-2 text-[1.24rem] leading-[1.1] text-[#1f2642] font-bold">
                Saved notifications appear here
              </h3>
              <p className="mt-3 text-[0.98rem] leading-[1.65] text-[#756f67]">
                Fire a few demos, then use this panel to verify that history-enabled toasts stay
                available after the stack closes. This demo uses IndexedDB; app code can switch to
                memory mode for session-only history.
              </p>

              <div className="mt-6 min-w-0">
                {historyEnabled ? (
                  <ToastHistoryPanel
                    title="Recent activity"
                    maxItems={6}
                    theme={theme}
                    appearance={providerAppearance}
                  />
                ) : (
                  <div className="rounded-[24px] border border-[#e1e2ef] bg-[#f7f6fa] px-5 py-6 text-[0.98rem] leading-[1.6] text-[#666574]">
                    Enable history in the playground to persist this panel. In your app, use
                    `storage: "memory"` if you only want the current tab session.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [radius, setRadius] = useState(24);
  const [blur, setBlur] = useState(16);
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [theme, setTheme] = useState<ThemeOption>("glass");
  const [position, setPosition] = useState<PositionOption>("top");
  const [showProgress, setShowProgress] = useState(false);
  const [swipeToDismiss, setSwipeToDismiss] = useState(true);
  const [expandOnHover, setExpandOnHover] = useState(true);
  const [pauseOnHover, setPauseOnHover] = useState(true);
  const [builtInLayer, setBuiltInLayer] = useState(true);
  const [portalEnabled, setPortalEnabled] = useState(true);
  const [limitVisible, setLimitVisible] = useState(true);
  const [maxVisible, setMaxVisible] = useState(3);
  const [queueLimit, setQueueLimit] = useState(8);
  const [overflowStrategy, setOverflowStrategy] = useState<OverflowOption>("queue");
  const [dedupeBehavior, setDedupeBehavior] = useState<DedupeOption>("update");
  const deferredHistoryEnabled = useDeferredValue(historyEnabled);
  const providerPosition = position.startsWith("bottom") ? "bottom" : "top";

  const providerAppearance = useMemo<ProviderAppearance>(
    () => ({
      radius,
      blur,
      width: "min(408px, calc(100vw - 32px))",
      background:
        theme === "glass"
          ? "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(244,247,255,0.94))"
          : undefined, // Let library handle other themes
      border: theme === "glass" ? "1px solid rgba(110, 129, 209, 0.24)" : undefined,
      color: theme === "glass" ? "#17213d" : undefined,
      shadow: "0 24px 54px rgba(46, 59, 112, 0.18)",
      closeButtonBackground: theme === "glass" ? "rgba(23, 33, 61, 0.06)" : undefined,
    }),
    [blur, radius, theme],
  );

  const { pulsing, trigger: hapticTrigger } = useHaptic();

  return (
    <ToastProvider
      scope={DEMO_SCOPE}
      position={providerPosition}
      defaultTheme={theme}
      introDuration={400}
      appearance={providerAppearance}
      showProgress={showProgress}
      maxVisible={limitVisible ? maxVisible : undefined}
      queueLimit={limitVisible ? queueLimit : undefined}
      overflowStrategy={overflowStrategy}
      dedupeBehavior={dedupeBehavior}
      expandOnHover={expandOnHover}
      pauseOnHover={pauseOnHover}
      swipeToDismiss={swipeToDismiss}
      headless={!builtInLayer}
      portalTarget={portalEnabled ? null : false}
      history={
        deferredHistoryEnabled
          ? {
            enabled: true,
            storage: "indexeddb",
            limit: 30,
          }
          : undefined
      }
    >
      <div
        className="relative z-[1] w-full"
        style={pulsing ? HAPTIC_PULSE_STYLE : undefined}
      >
        <ReferenceLandingPage
          radius={radius}
          blur={blur}
          hapticTrigger={hapticTrigger}
          historyEnabled={historyEnabled}
          theme={theme}
          position={position}
          showProgress={showProgress}
          swipeToDismiss={swipeToDismiss}
          expandOnHover={expandOnHover}
          pauseOnHover={pauseOnHover}
          builtInLayer={builtInLayer}
          portalEnabled={portalEnabled}
          limitVisible={limitVisible}
          maxVisible={maxVisible}
          queueLimit={queueLimit}
          overflowStrategy={overflowStrategy}
          dedupeBehavior={dedupeBehavior}
          providerAppearance={providerAppearance}
          onRadiusChange={(next) => {
            startTransition(() => {
              setRadius(next);
            });
          }}
          onBlurChange={(next) => {
            startTransition(() => {
              setBlur(next);
            });
          }}
          onHistoryChange={(next) => {
            startTransition(() => {
              setHistoryEnabled(next);
            });
          }}
          onThemeChange={(next) => startTransition(() => setTheme(next))}
          onPositionChange={(next) => startTransition(() => setPosition(next))}
          onShowProgressChange={(next) => startTransition(() => setShowProgress(next))}
          onSwipeToDismissChange={(next) => startTransition(() => setSwipeToDismiss(next))}
          onExpandOnHoverChange={(next) => startTransition(() => setExpandOnHover(next))}
          onPauseOnHoverChange={(next) => startTransition(() => setPauseOnHover(next))}
          onBuiltInLayerChange={(next) => startTransition(() => setBuiltInLayer(next))}
          onPortalEnabledChange={(next) => startTransition(() => setPortalEnabled(next))}
          onLimitVisibleChange={(next) => startTransition(() => setLimitVisible(next))}
          onMaxVisibleChange={(next) => startTransition(() => setMaxVisible(next))}
          onQueueLimitChange={(next) => startTransition(() => setQueueLimit(next))}
          onOverflowStrategyChange={(next) => startTransition(() => setOverflowStrategy(next))}
          onDedupeBehaviorChange={(next) => startTransition(() => setDedupeBehavior(next))}
        />
      </div>
    </ToastProvider>
  );
}
