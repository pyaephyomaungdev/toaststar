# toaststar

`toaststar` is a React toast library with a cinematic center-launch intro, hover fan-out stacks, queue-aware delivery, and optional persisted or in-memory history.

## Features

- Center launch animation before settling to the top or bottom edge
- Hover-only stack fan-out instead of always-expanded cards
- Scoped controllers so multiple widgets or apps on one page do not cross-fire
- `toast.loading()`, `toast.update()`, and `toast.promise()` for async flows
- Opt-in progress bars, swipe-to-dismiss, dedupe keys, queue limits, and overflow policies
- Custom React component bodies inside the default toast shell
- Theme presets plus per-provider and per-toast appearance overrides
- Action buttons, lifecycle callbacks, and optional headless mode
- Optional IndexedDB or memory-backed history plus a ready-made `ToastHistoryPanel`

## Install

```bash
npm install toaststar
```

## Quick start

```tsx
import { ToastProvider, createToastScope } from "toaststar";

const appToast = createToastScope("marketing-site");

function SaveButton() {
  return (
    <button
      type="button"
      onClick={() => {
        void appToast.promise(saveProfile(), {
          loading: {
            title: "Saving profile",
            description: "Waiting for the API to finish.",
          },
          success: {
            title: "Profile saved",
            description: "Your latest settings are live.",
          },
          error: (error) => ({
            title: "Save failed",
            description:
              error instanceof Error ? error.message : "Please try again.",
          }),
        });
      }}
    >
      Save
    </button>
  );
}

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
      showProgress={false}
      swipeToDismiss
      history={{ enabled: true, storage: "indexeddb", limit: 30 }}
      appearance={{
        radius: 28,
        border: "1px solid rgba(255,255,255,0.24)",
      }}
    >
      <SaveButton />
    </ToastProvider>
  );
}
```

## Imperative API

```tsx
import { createToastScope, toast } from "toaststar";

const appToast = createToastScope("dashboard");

toast.show("Quick title-only toast");

appToast.info({
  title: "New message",
  description: "Alice: the deploy preview is ready.",
});

const loadingId = appToast.loading({
  title: "Uploading assets",
  description: "Keeping a single toast alive while work runs.",
  showProgress: true,
});

appToast.update(loadingId, {
  title: "Upload finished",
  intent: "success",
  loading: false,
  persistent: false,
});

void appToast.promise(fetch("/api/publish"), {
  loading: {
    title: "Publishing release",
    showProgress: true,
  },
  success: { title: "Release published" },
  error: (error) => ({
    title: "Publish failed",
    description:
      error instanceof Error ? error.message : "Unknown error",
  }),
});

appToast.dismiss(loadingId);
appToast.clear();
```

Use the default `toast` singleton when your page has a single provider. Use `createToastScope("your-app")` when multiple apps, widgets, or micro-frontends might coexist on the same origin.

## Scoped runtimes

```tsx
import { ToastProvider, createToastScope } from "toaststar";

const checkoutToast = createToastScope("checkout");
const profileToast = createToastScope("profile");

function App() {
  return (
    <>
      <ToastProvider scope="checkout" />
      <ToastProvider scope="profile" />
    </>
  );
}

checkoutToast.success("Checkout only");
profileToast.success("Profile only");
```

`ToastProvider` can be self-closing when you only need the toast layer.

## Custom component body

```tsx
function ReleaseStatusCard() {
  return (
    <div className="grid gap-3">
      <strong>Design system release</strong>
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
  icon: "✨",
});
```

`body` replaces the default title/description/action layout while keeping the stack behavior, close button, theming, and history metadata.

## Provider options

```tsx
<ToastProvider
  position="top"
  defaultDuration={4500}
  introDuration={420}
  exitDuration={220}
  defaultTheme="midnight"
  maxCollapsed={4}
  maxVisible={3}
  burstMaxVisible={6}
  burstWindow={320}
  queueLimit={8}
  overflowStrategy="queue"
  dedupeBehavior="update"
  showProgress={false}
  gap={14}
  edgeOffset={28}
  expandedOffset={18}
  expandOnHover
  pauseOnHover
  swipeToDismiss
  portalTarget={false}
  history={{ enabled: true, storage: "indexeddb", limit: 50 }}
  onToastOpen={(toast) => console.log("open", toast.id)}
  onToastClose={(toast, reason) => console.log("close", toast.id, reason)}
  onToastAction={(toast) => console.log("action", toast.id)}
/>
```

## React hooks

```tsx
import {
  useToast,
  useToastActions,
  useToastHistory,
  useToastState,
} from "toaststar";

function SaveButton() {
  const { success } = useToastActions();

  return (
    <button type="button" onClick={() => success("Saved")}>
      Save
    </button>
  );
}
```

Use `useToastActions()` when a component only triggers toasts. It avoids subscribing that component to live toast/history state updates.

## Dedupe and queue control

```tsx
toast.show({
  title: "Sync batch started",
  dedupeKey: "sync-batch",
});

toast.show({
  title: "Sync batch started",
  description: "Updates the existing toast instead of creating another one.",
  dedupeKey: "sync-batch",
});
```

Use `dedupeBehavior="ignore" | "update" | "reset-duration"` on the provider to decide how repeated keys are handled.

Use `overflowStrategy="queue" | "drop-oldest" | "drop-newest"` with `maxVisible` and `queueLimit` to control bursts.

Finite `maxVisible` values get a small burst headroom by default so rapid clicks can momentarily overshoot the steady-state cap before normal queueing resumes. Set `burstMaxVisible` to tune or disable that headroom, and adjust `burstWindow` in milliseconds to control how long a burst stays active.

## Feature toggles

- Progress bars are off by default. Enable them globally with `<ToastProvider showProgress />` or per toast with `showProgress: true`.
- Queueing is off until you set a finite `maxVisible`. Leave it unset for unlimited visible toasts.
- Dedupe is off by default because `dedupeBehavior` defaults to `"ignore"`.
- Swipe dismiss is on by default. Turn it off with `swipeToDismiss={false}`.
- Hover fan-out and pause behavior are toggled with `expandOnHover` and `pauseOnHover`.
- History is off until `history` is enabled.
- Set `history.storage` to `"memory"` to disable IndexedDB while keeping history inside the current tab session.
- Leave `history.namespace` unset unless you need a custom value. `toaststar` now derives a unique default namespace per scope/site.
- The built-in layer is on by default. Turn it off with `headless`.
- Custom portals are optional. Pass `portalTarget={false}` to render inline instead of portaling.

## Lifecycle callbacks

```tsx
toast.show({
  title: "Archive ready",
  action: {
    label: "Undo",
    onClick: restoreRow,
  },
  onOpen: (id) => analytics.track("toast_open", { id }),
  onAction: (id) => analytics.track("toast_action", { id }),
  onClose: (id, reason) =>
    analytics.track("toast_close", { id, reason }),
});
```

## Headless mode

```tsx
<ToastProvider headless portalTarget={false}>
  <AppShell />
</ToastProvider>
```

`headless` keeps the runtime, command bus, history, and hooks active while skipping the built-in toast layer.

## Optional history panel

```tsx
import { ToastHistoryPanel } from "toaststar";

function NotificationsPage() {
  return (
    <ToastHistoryPanel
      title="Recent notifications"
      theme="midnight"
      maxItems={8}
    />
  );
}
```

## Local demo

```bash
npm --prefix demo install
npm run demo
```

The demo app lives in `demo/` and includes homepage-style usage examples for async flows, queue bursts, dedupe, history, and appearance tuning.

## Themes

- `glass`
- `midnight`
- `sunset`
- `forest`
- `ocean`

## Notes

- `ToastProvider` should be mounted once near your app root.
- History only persists when `history.enabled` is true and the browser supports IndexedDB.
- `portalTarget` defaults to `document.body`. Pass `false` to disable the portal.
- The package targets React 18 and newer.

## Community

- Contributions are welcome. Start with [`CONTRIBUTING.md`](./CONTRIBUTING.md).
- Community participation is covered by [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
- Report vulnerabilities through [`SECURITY.md`](./SECURITY.md).
