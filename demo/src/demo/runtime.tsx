import { createToastScope } from "toaststar";
import type {
  BuilderExampleGroup,
  CustomBodyProps,
  DocLiveToastDefinition,
  DocQuickstartStep,
  IntentOption,
  ThemeOption,
} from "./types";

export const DEMO_SCOPE = "toaststar-demo";
export const WELCOME_PREVIEW_SCOPE = "toaststar-demo-welcome";
export const toast = createToastScope(DEMO_SCOPE);
const welcomePreviewToast = createToastScope(WELCOME_PREVIEW_SCOPE);
let heroSequenceTimeouts: number[] = [];

export function SparkIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" width="18" height="18">
      <path
        d="M10 2.8 11.7 8.3 17.2 10 11.7 11.7 10 17.2 8.3 11.7 2.8 10 8.3 8.3 10 2.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" width="18" height="18">
      <path
        d="M10 16.2a2.1 2.1 0 0 0 2-1.5H8a2.1 2.1 0 0 0 2 1.5Zm5-2.5H5c.8-.8 1.3-1.9 1.3-3.2V8.7c0-2.2 1.6-4 3.7-4.2V4a.7.7 0 1 1 1.4 0v.5c2.1.2 3.7 2 3.7 4.2v1.8c0 1.3.5 2.4 1.3 3.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function InboxIcon() {
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

export function CloudIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" width="18" height="18">
      <path
        d="M6.3 15.4a3.4 3.4 0 1 1 .4-6.9 4.5 4.5 0 0 1 8.6 1.4 2.8 2.8 0 0 1 .3 5.5H6.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function wait(duration: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration);
  });
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

export function DemoCustomToastBody(props: CustomBodyProps) {
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
        <span className={`block h-2 rounded-full ${tone.fill}`} style={{ width: "82%" }} />
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

export function launchHeroSequence(haptic: () => void) {
  for (const timeoutId of heroSequenceTimeouts) {
    window.clearTimeout(timeoutId);
  }
  heroSequenceTimeouts = [];
  welcomePreviewToast.clear();
  toast.clear();

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

  const [firstToast, ...delayedToasts] = queue;

  if (firstToast) {
    haptic();
    welcomePreviewToast.show({
      ...firstToast,
      duration: 4600,
    });
  }

  for (const [index, item] of delayedToasts.entries()) {
    const timeoutId = window.setTimeout(() => {
      heroSequenceTimeouts = heroSequenceTimeouts.filter((id) => id !== timeoutId);
      haptic();
      welcomePreviewToast.show({
        ...item,
        duration: 4600,
      });
    }, (index + 1) * 150);
    heroSequenceTimeouts.push(timeoutId);
  }
}

export function showActionToast() {
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

export function showCustomBodyToast() {
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

export function showHistoryToast() {
  toast.success({
    title: "History enabled",
    description: "This toast will appear again inside the saved notification panel.",
    icon: <CloudIcon />,
  });
}

export function showSuccessToast() {
  toast.success({
    title: "Changes saved",
    description: "Everything synced correctly.",
    icon: <SparkIcon />,
  });
}

export function showWarningToast() {
  toast.warning({
    title: "Review recommended",
    description: "One setting still needs attention before shipping.",
    icon: <BellIcon />,
  });
}

export function showDetailedToast() {
  toast.info({
    title: "New message",
    description: "Alice: the deploy preview is ready for review.",
    icon: <InboxIcon />,
  });
}

export function showPersistentToast() {
  toast.error({
    title: "Subscription expired",
    description: "Update billing details to keep premium access active.",
    persistent: true,
    icon: "!",
  });
}

export function showDangerToast() {
  toast.error({
    title: "Deletion failed",
    description: "Database is in read-only mode. Try again after maintenance ends.",
  });
}

export function showLoadingFlow() {
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

export function showPromiseFlow() {
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
      description: error instanceof Error ? error.message : "Please try again.",
      icon: "!",
    }),
  });
}

export function showQueuedBurst() {
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

export function showDedupeFlow() {
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

export const INSTALL_SNIPPET = "npm install toaststar";

export const SETUP_SNIPPET = `import { ToastProvider, createToastScope } from "toaststar";

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

export const FIRST_TOAST_SNIPPET = `import { createToastScope } from "toaststar";

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

export const HISTORY_SNIPPET = `<ToastProvider
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

export const HISTORY_SYNC_SNIPPET = `import { useToastHistory } from "toaststar";

function NotificationSync() {
  const { exportHistory, importHistory, postHistory, fetchHistory } =
    useToastHistory();

  async function backupToApi() {
    await postHistory("/api/toast-history", { method: "PUT" });
  }

  async function restoreFromApi() {
    await fetchHistory("/api/toast-history", undefined, "replace");
  }

  async function reuseCurrentSnapshot() {
    const snapshot = exportHistory();
    await importHistory(snapshot, "merge");
  }
}`;

export const SCOPED_RUNTIME_SNIPPET = `import { ToastProvider, createToastScope } from "toaststar";

const checkoutToast = createToastScope("checkout");

<ToastProvider scope="checkout">
  <CheckoutFlow />
</ToastProvider>;

checkoutToast.success("Payment captured");`;

export const PROMISE_SNIPPET = `await toast.promise(saveProfile(), {
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

export const QUEUE_SNIPPET = `toast.show({
  title: "Sync batch started",
  dedupeKey: "sync-batch",
});

toast.show({
  title: "Sync batch started",
  description: "The existing toast is updated instead of duplicated.",
  dedupeKey: "sync-batch",
});`;

export const HEADLESS_SNIPPET = `import { ToastProvider } from "toaststar";

<ToastProvider headless portalTarget={false}>
  <AppShell />
</ToastProvider>;`;

export const CUSTOM_BODY_SNIPPET = `function ReleaseStatusCard() {
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

export const LANDING_THEME_SURFACE_LABELS: Record<ThemeOption, string> = {
  glass: "Frosted glass",
  light: "Clean white",
  midnight: "Midnight ink",
  sunset: "Apricot haze",
  forest: "Earth tone",
  ocean: "Blue current",
};

export const DOC_QUICKSTART_STEPS: DocQuickstartStep[] = [
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
];

export const DOC_LIVE_TOASTS: DocLiveToastDefinition[] = [
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
];

export const BUILDER_EXAMPLE_GROUPS: BuilderExampleGroup[] = [
  {
    title: "Toast types",
    items: [
      { label: "Default", onTrigger: showSuccessToast },
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
      { label: "Cart restore", onTrigger: showActionToast },
    ],
  },
  {
    title: "Custom body",
    items: [{ label: "Component body", onTrigger: showCustomBodyToast }],
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
