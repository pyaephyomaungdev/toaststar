import { useMemo, useRef, useState } from "react";
import { ToastHistoryPanel } from "toaststar";
import {
  BuilderChip,
  BuilderToggle,
  BuilderToggleCard,
  CodeBlock,
  HeroDropIcon,
  HeroIntroOverlay,
} from "./components";
import { useHeroIntro } from "./hooks";
import {
  BellIcon,
  BUILDER_EXAMPLE_GROUPS,
  CloudIcon,
  CUSTOM_BODY_SNIPPET,
  DEMO_SCOPE,
  DemoCustomToastBody,
  DOC_LIVE_TOASTS,
  DOC_QUICKSTART_STEPS,
  HEADLESS_SNIPPET,
  HISTORY_SNIPPET,
  InboxIcon,
  INSTALL_SNIPPET,
  LANDING_THEME_SURFACE_LABELS,
  PROMISE_SNIPPET,
  SCOPED_RUNTIME_SNIPPET,
  showActionToast,
  showCustomBodyToast,
  showDetailedToast,
  showDedupeFlow,
  showHistoryToast,
  showPromiseFlow,
  showSuccessToast,
  showPersistentToast,
  SparkIcon,
  toast,
  launchHeroSequence,
} from "./runtime";
import type {
  DedupeOption,
  IntentOption,
  OverflowOption,
  PositionOption,
  ReferenceLandingPageProps,
  ThemeOption,
} from "./types";

export function ReferenceLandingPage(props: ReferenceLandingPageProps) {
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
  const [selectedDocExampleId, setSelectedDocExampleId] = useState("success");
  const heroTargetRef = useRef<HTMLSpanElement>(null);
  const { contentVisible, introActive, targetVisible } = useHeroIntro();
  const themeSurfaceLabel = LANDING_THEME_SURFACE_LABELS[theme];
  const runDocDemo = (action: () => void) => {
    hapticTrigger();
    action();
  };
  const selectedDocExample =
    DOC_LIVE_TOASTS.find((item) => item.id === selectedDocExampleId) ??
    DOC_LIVE_TOASTS[0];

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
            description:
              "The embedded CTA can launch any follow-up flow you need.",
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
      action:
        builderActionEnabled && !builderCustomBody
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
    window.setTimeout(() => setInstallCopied(false), 2000);
  };

  const heroIcon = (
    <span className="-rotate-[12deg] text-[#fff9f0]">
      <SparkIcon />
    </span>
  );

  return (
    <div className="relative">
      <HeroIntroOverlay
        active={introActive}
        targetRef={heroTargetRef}
        className="inline-flex h-[58px] w-[58px] items-center justify-center rounded-[20px] border border-white/80 bg-[radial-gradient(circle_at_30%_28%,rgba(255,248,238,1),rgba(255,211,165,0.82)_34%,rgba(81,105,196,0.58)_100%)] text-white shadow-[0_20px_40px_rgba(55,70,123,0.16)] sm:h-[70px] sm:w-[70px] sm:rounded-[24px] sm:shadow-[0_24px_48px_rgba(55,70,123,0.16)]"
      >
        {heroIcon}
      </HeroIntroOverlay>

      <div
        className={`relative z-[1] mx-auto w-full max-w-[1460px] overflow-hidden px-[14px] pt-4 pb-[4.5rem] sm:px-5 sm:pt-6 sm:pb-24 md:px-8 ${contentVisible ? "hero-intro-content-visible" : "hero-intro-content-hidden"
          }`}
      >
        <header className="border-b border-[#ddd7cf] pb-4 sm:pb-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex shrink-0 items-center gap-2 text-[1.35rem] font-bold tracking-[-0.04em] text-[#1c2d53] sm:gap-3 sm:text-[1.7rem]">
              <span className="inline-flex h-8 w-8 rotate-[12deg] items-center justify-center rounded-[10px] border border-white/80 bg-[radial-gradient(circle_at_30%_28%,rgba(255,248,238,1),rgba(255,211,165,0.82)_34%,rgba(81,105,196,0.58)_100%)] text-white shadow-[0_18px_36px_rgba(55,70,123,0.16)] sm:h-10 sm:w-10 sm:rounded-[14px] sm:shadow-[0_24px_48px_rgba(55,70,123,0.16)]">
                <span className="-rotate-[12deg] text-[#fff9f0]">
                  <SparkIcon />
                </span>
              </span>
              <span className="font-['Outfit']">toaststar</span>
            </div>

            <nav className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-2 text-[0.82rem] font-medium text-[#726c64] sm:gap-6 sm:text-[0.96rem]">
              <a href="#examples" className="whitespace-nowrap transition-colors hover:text-[#23211e]">
                Examples
              </a>
              <a href="#playground" className="whitespace-nowrap transition-colors hover:text-[#233760]">
                Playground
              </a>
              <a href="#docs" className="whitespace-nowrap transition-colors hover:text-[#233760]">
                Docs
              </a>
              <a href="#api" className="whitespace-nowrap transition-colors hover:text-[#233760]">
                API
              </a>
            </nav>
          </div>
        </header>

        <section className="grid gap-6 border-b border-[#ddd7cf] py-8 sm:py-14 lg:grid-cols-2">
          <div className="min-w-0 max-w-[760px] pt-2 sm:pt-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d9deed] bg-white/92 px-4 py-2 text-[0.92rem] text-[#6f6a63] shadow-[0_10px_22px_rgba(48,62,110,0.06)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#d68446]" />
              v0.1.0
            </span>

            <h1 className="mt-8 flex min-w-0 flex-wrap items-center gap-3 text-[clamp(2.55rem,13vw,6.9rem)] leading-[0.88] tracking-[-0.085em] font-bold font-['Outfit'] sm:mt-10 sm:gap-4 sm:text-[clamp(3rem,15vw,6.9rem)]">
              <span className="bg-gradient-to-r from-[#172349] via-[#3e61c8] to-[#d88545] bg-clip-text text-transparent">
                toaststar
              </span>
              <HeroDropIcon
                targetRef={heroTargetRef}
                visible={targetVisible}
                className="inline-flex h-[58px] w-[58px] rotate-[12deg] items-center justify-center rounded-[20px] border border-white/80 bg-[radial-gradient(circle_at_30%_28%,rgba(255,248,238,1),rgba(255,211,165,0.82)_34%,rgba(81,105,196,0.58)_100%)] text-white shadow-[0_20px_40px_rgba(55,70,123,0.16)] sm:h-[70px] sm:w-[70px] sm:rounded-[24px] sm:shadow-[0_24px_48px_rgba(55,70,123,0.16)]"
              >
                {heroIcon}
              </HeroDropIcon>
            </h1>

            <p className="mt-5 max-w-[34ch] text-[clamp(1rem,4.2vw,1.45rem)] leading-[1.6] text-[#625b54] sm:mt-7 sm:max-w-[31ch]">
              Clean toast notifications for React with a quieter visual system,
              interactive playground controls, and docs that still feel like a
              product page.
            </p>

            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <button
                type="button"
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#1f315e] px-6 text-[0.96rem] font-semibold text-white shadow-[0_14px_30px_rgba(39,58,116,0.18)] transition-all duration-200 hover:-translate-y-px hover:bg-[#18284e] sm:w-auto sm:text-[0.98rem]"
                onClick={() => launchHeroSequence(hapticTrigger)}
              >
                Preview welcome flow
              </button>
              <a
                href="#playground"
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full border border-[#d8deed] bg-white/88 px-6 text-[0.96rem] font-semibold text-[#25304a] transition-all duration-200 hover:-translate-y-px hover:border-[#cfd7f2] hover:bg-white sm:w-auto sm:text-[0.98rem]"
              >
                Open playground
              </a>
            </div>

            <div className="mt-8 flex w-full max-w-[460px] min-w-0 items-center gap-2 rounded-[20px] border border-[#dbe1ef] bg-white px-3 py-2.5 shadow-[0_12px_28px_rgba(43,58,110,0.06)] sm:gap-3 sm:rounded-[22px] sm:px-4 sm:py-3 sm:flex-nowrap">
              <span className="text-[#a08d7d]">$</span>
              <code className="min-w-0 grow basis-[calc(100%-2.5rem)] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[0.92rem] text-[#2f3446] sm:basis-auto sm:text-[0.98rem]">
                {INSTALL_SNIPPET}
              </code>
              <button
                type="button"
                className="inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-full border border-[#eddccf] bg-[#fff3e8] px-3 py-1.5 text-[0.82rem] font-semibold text-[#9a5d2a] transition-colors hover:bg-white sm:min-h-[40px] sm:text-[0.84rem]"
                onClick={copyInstallCommand}
              >
                {installCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="min-w-0 rounded-[30px] border border-[#d8deee] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,248,252,0.92))] p-5 shadow-[0_24px_56px_rgba(45,58,109,0.1)] sm:rounded-[38px] sm:p-8 sm:shadow-[0_30px_70px_rgba(45,58,109,0.1)]">
            <div className="flex flex-col items-start justify-between gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#91887c] sm:flex-row sm:items-center sm:gap-4 sm:text-[0.78rem] sm:tracking-[0.22em]">
              <span>Runtime preview</span>
              <span>Previewing the real provider</span>
            </div>

            <div className="mt-5 rounded-[24px] border border-[#e5e2ef] bg-[linear-gradient(145deg,rgba(255,248,241,0.96),rgba(245,247,255,0.96))] p-4 sm:mt-7 sm:rounded-[28px] sm:p-5">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-[#d8deef] bg-white text-[#d17a35] shadow-[0_10px_20px_rgba(47,62,110,0.08)] sm:h-12 sm:w-12 sm:rounded-[18px] sm:shadow-[0_12px_24px_rgba(47,62,110,0.08)]">
                  <SparkIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <strong className="text-[1rem] font-semibold text-[#232947] sm:text-[1.08rem]">
                      Changes saved
                    </strong>
                    <span className="rounded-full bg-[#fff0dd] px-3 py-1 text-[0.8rem] font-semibold text-[#b86a28]">
                      live
                    </span>
                  </div>
                  <p className="mt-2 max-w-[28ch] text-[0.98rem] leading-[1.6] text-[#5c5f70]">
                    Understated feedback with soft contrast, readable density,
                    and zero visual clutter.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
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

            <div className="mt-5 rounded-[24px] border border-[#e3e2ef] bg-white px-4 py-4 sm:px-5 sm:py-5">
              <div className="text-[0.78rem] font-semibold uppercase tracking-[0.2em] text-[#94897d]">
                Playground state
              </div>
              <div className="mt-4 grid gap-3 text-[0.98rem] text-[#5c5a63]">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span>History panel</span>
                  <span className="font-medium text-[#26314f]">
                    {historyEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span>Runtime scope</span>
                  <span className="font-medium text-[#26314f]">{DEMO_SCOPE}</span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span>History storage</span>
                  <span className="font-medium text-[#26314f]">
                    {historyEnabled ? "IndexedDB" : "Off"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span>Position</span>
                  <span className="font-medium text-[#26314f]">{position}</span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span>Surface</span>
                  <span className="font-medium text-[#26314f]">
                    {themeSurfaceLabel}
                  </span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span>Provider progress</span>
                  <span className="font-medium text-[#26314f]">
                    {showProgress ? "On" : "Off"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span>Fan-out / swipe</span>
                  <span className="font-medium text-[#26314f]">
                    {expandOnHover ? "Hover" : "Static"} ·{" "}
                    {swipeToDismiss ? "Swipe" : "Locked"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span>Render mode</span>
                  <span className="font-medium text-[#26314f]">
                    {builtInLayer
                      ? portalEnabled
                        ? "Portal layer"
                        : "Inline layer"
                      : "Headless"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span>Stack policy</span>
                  <span className="font-medium text-[#26314f]">
                    {limitVisible
                      ? `${maxVisible} visible / ${queueLimit} queued`
                      : "Unlimited"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="examples"
          className="grid gap-4 py-10 sm:py-14 lg:grid-cols-3"
        >
          <div className="min-w-0">
            <div className="mb-10 grid gap-4 lg:items-end">
              <div>
                <h2 className="text-[clamp(2rem,9vw,3.4rem)] leading-[0.95] tracking-[-0.06em] text-[#202848] font-bold font-['Outfit']">
                  Examples
                </h2>
                <p className="mt-2 text-[1.02rem] text-[#8a8378]">
                  Click any pattern to preview it immediately.
                </p>
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

          <div id="playground" className="min-w-0 lg:col-span-2 lg:sticky lg:top-8">
            <div className="mb-6">
              <h2 className="text-[clamp(2rem,8vw,3.2rem)] leading-[0.96] tracking-[-0.06em] text-[#202848] font-bold font-['Outfit']">
                Playground
              </h2>
              <p className="mt-2 text-[1.02rem] text-[#8a8378]">
                Design and test your toast in real time.
              </p>
            </div>
            <div className="rounded-[28px] border border-[#dbe0ee] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,248,252,0.94))] p-4 shadow-[0_24px_56px_rgba(45,58,109,0.1)] sm:rounded-[34px] sm:p-8 sm:shadow-[0_30px_70px_rgba(45,58,109,0.1)]">
              <div className="grid gap-8">
                <div>
                  <div className="mb-3 text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                    Position
                  </div>
                  <div className="flex w-full flex-wrap gap-2.5 sm:gap-3">
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
                  <div className="flex w-full flex-wrap gap-2.5 sm:gap-3">
                    {(
                      ["default", "success", "error", "warning", "info"] as IntentOption[]
                    ).map((item) => (
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
                    className="w-full rounded-[18px] border border-[#e1d9cf] bg-[#fbf8f2] px-4 py-3 text-[0.98rem] text-[#2a3042] outline-none transition-colors focus:border-[#9ba9e1] sm:rounded-[20px] sm:text-[1.02rem]"
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
                      className="min-h-[112px] w-full rounded-[20px] border border-[#e1d9cf] bg-[#fbf8f2] px-4 py-3 text-[0.96rem] leading-[1.6] text-[#2a3042] outline-none transition-colors focus:border-[#9ba9e1] sm:rounded-[22px] sm:text-[1rem]"
                      value={builderDescription}
                      onChange={(e) => setBuilderDescription(e.target.value)}
                    />
                  ) : null}
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-[24px] border border-[#e2e2ef] bg-[#f8f7fb] p-4 sm:rounded-[28px] sm:p-5">
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

                  <div className="rounded-[24px] border border-[#e2e2ef] bg-[#f8f7fb] p-4 sm:rounded-[28px] sm:p-5">
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
                    <div className="flex w-full flex-wrap gap-2.5 sm:gap-3">
                      {(
                        ["glass", "midnight", "sunset", "forest", "ocean"] as ThemeOption[]
                      ).map((item) => (
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
                      {builderPersistent
                        ? "Persistent"
                        : `${(builderDuration / 1000).toFixed(1)}s`}
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
                    className={`w-full accent-[#4867d7] ${builderPersistent
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer"
                      }`}
                  />
                  <p className="mt-2 text-[0.9rem] leading-[1.55] text-[#8a8378]">
                    Used only when persistent mode is off.
                  </p>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-[24px] border border-[#e2e2ef] bg-[#f8f7fb] p-4 sm:rounded-[28px] sm:p-5">
                    <div className="text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                      Runtime defaults
                    </div>
                    <p className="mt-2 text-[0.94rem] leading-[1.6] text-[#8a8378]">
                      These switches update the mounted provider, so every example
                      on the page reflects the same runtime.
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

                  <div className="rounded-[24px] border border-[#e2e2ef] bg-[#f8f7fb] p-4 sm:rounded-[28px] sm:p-5">
                    <div className="text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                      Stack policies
                    </div>
                    <p className="mt-2 text-[0.94rem] leading-[1.6] text-[#8a8378]">
                      Tune how many toasts stay visible and what happens when a
                      burst exceeds the visible limit.
                    </p>
                    <div className="mt-4 grid gap-4">
                      <BuilderToggleCard
                        label="Finite visible stack"
                        description="Cap the visible cards so queue and overflow rules can take over."
                        checked={limitVisible}
                        onChange={onLimitVisibleChange}
                      />

                      <div
                        className={`rounded-[22px] border border-[#e2e2ef] bg-white px-4 py-4 sm:rounded-[24px] ${limitVisible ? "" : "opacity-55"
                          }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-4 text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                          <span>Max visible</span>
                          <span className="text-[#5b5864]">
                            {limitVisible ? maxVisible : "Unlimited"}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="6"
                          value={maxVisible}
                          disabled={!limitVisible}
                          onChange={(e) => onMaxVisibleChange(Number(e.target.value))}
                          className={`w-full accent-[#4867d7] ${limitVisible ? "cursor-pointer" : "cursor-not-allowed"
                            }`}
                        />
                      </div>

                      <div
                        className={`rounded-[22px] border border-[#e2e2ef] bg-white px-4 py-4 sm:rounded-[24px] ${limitVisible ? "" : "opacity-55"
                          }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-4 text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                          <span>Queue limit</span>
                          <span className="text-[#5b5864]">
                            {limitVisible ? queueLimit : "Off"}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="12"
                          value={queueLimit}
                          disabled={!limitVisible}
                          onChange={(e) => onQueueLimitChange(Number(e.target.value))}
                          className={`w-full accent-[#4867d7] ${limitVisible ? "cursor-pointer" : "cursor-not-allowed"
                            }`}
                        />
                      </div>

                      <label
                        className={`grid gap-2 rounded-[22px] border border-[#e2e2ef] bg-white px-4 py-4 sm:rounded-[24px] ${limitVisible ? "" : "opacity-55"
                          }`}
                      >
                        <span className="text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                          Overflow strategy
                        </span>
                        <select
                          className="w-full rounded-[16px] border border-[#e1d9cf] bg-[#fbf8f2] px-4 py-3 text-[0.98rem] text-[#2a3042] outline-none transition-colors focus:border-[#9ba9e1]"
                          value={overflowStrategy}
                          disabled={!limitVisible}
                          onChange={(e) =>
                            onOverflowStrategyChange(e.target.value as OverflowOption)
                          }
                        >
                          <option value="queue">Queue</option>
                          <option value="drop-oldest">Drop oldest</option>
                          <option value="drop-newest">Drop newest</option>
                        </select>
                      </label>

                      <label className="grid gap-2 rounded-[22px] border border-[#e2e2ef] bg-white px-4 py-4 sm:rounded-[24px]">
                        <span className="text-[0.82rem] font-semibold uppercase tracking-[0.2em] text-[#97887a]">
                          Dedupe behavior
                        </span>
                        <select
                          className="w-full rounded-[16px] border border-[#e1d9cf] bg-[#fbf8f2] px-4 py-3 text-[0.98rem] text-[#2a3042] outline-none transition-colors focus:border-[#9ba9e1]"
                          value={dedupeBehavior}
                          onChange={(e) =>
                            onDedupeBehaviorChange(e.target.value as DedupeOption)
                          }
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
                  className="inline-flex min-h-[58px] w-full items-center justify-center rounded-[22px] bg-[#1f315e] px-6 text-[1rem] font-semibold text-white shadow-[0_16px_28px_rgba(39,58,116,0.18)] transition-all duration-200 hover:-translate-y-px hover:bg-[#18284e] sm:text-[1.02rem]"
                  onClick={triggerBuilderToast}
                >
                  Play Toast
                </button>

                <div id="api" className="rounded-[24px] border border-[#e2e4ef] bg-[#f8f7fb] p-4 sm:rounded-[28px] sm:p-5">
                  <CodeBlock code={builderCode} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="docs" className="border-t border-[#ddd7cf] py-12 sm:py-16">
          <div className="max-w-[60ch]">
            <h2 className="text-[clamp(2.1rem,10vw,3.8rem)] leading-[0.94] tracking-[-0.07em] text-[#202848] font-bold font-['Outfit']">
              Documentation
            </h2>
            <p className="mt-3 text-[0.98rem] leading-[1.7] text-[#787167] sm:text-[1.05rem]">
              Keep it simple: install the package, mount one provider, then call
              the toast API from your UI. When multiple apps share a page, add a
              scope. When you need saved activity, choose IndexedDB or in-memory
              history.
            </p>
          </div>

          <div className="mt-8 grid min-w-0 items-start gap-4 lg:grid-cols-3">
            <div className="grid lg:col-span-2 min-w-0 gap-6">
              <div className="rounded-[28px] border border-[#dfe3ef] bg-white/92 p-5 shadow-[0_18px_42px_rgba(41,55,103,0.07)] sm:rounded-[32px] sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                      Start here
                    </div>
                    <h3 className="mt-2 text-[1.22rem] leading-[1.08] text-[#1f2642] font-bold sm:text-[1.4rem]">
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
                      className="rounded-[22px] border border-[#e2e2ef] bg-[#f8f7fb] p-4 sm:rounded-[26px] sm:p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div>
                          <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                            {step.eyebrow}
                          </div>
                          <h4 className="mt-2 text-[1.04rem] leading-[1.15] text-[#1f2642] font-bold sm:text-[1.14rem]">
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
                          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center whitespace-nowrap rounded-full bg-[#1f315e] px-5 text-[0.92rem] font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:bg-[#18284e] sm:w-auto"
                          onClick={() => runDocDemo(showSuccessToast)}
                        >
                          Play toast
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-[#dfe3ef] bg-white/92 p-5 shadow-[0_18px_42px_rgba(41,55,103,0.07)] sm:rounded-[32px] sm:p-6">
                <div className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                  Need more?
                </div>
                <h3 className="mt-2 text-[1.22rem] leading-[1.08] text-[#1f2642] font-bold sm:text-[1.4rem]">
                  Add scoped runtimes, history, or headless mode only when needed
                </h3>
                <p className="mt-3 max-w-[56ch] text-[0.98rem] leading-[1.65] text-[#756f67]">
                  Most apps stop after the quick start. These extras are here for
                  async work, shared pages, saved notifications, and fully custom
                  rendering.
                </p>

                <div className="mt-6 grid gap-4">
                  <article className="rounded-[22px] border border-[#e2e2ef] bg-[#f8f7fb] p-4 sm:rounded-[26px] sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                          Promise flow
                        </div>
                        <h4 className="mt-2 text-[1.04rem] leading-[1.15] text-[#1f2642] font-bold sm:text-[1.14rem]">
                          Keep one toast updated while work is running
                        </h4>
                        <p className="mt-3 text-[0.96rem] leading-[1.65] text-[#6b6973]">
                          Use `toast.promise` when you want pending, success, and
                          error states to stay tied to the same task.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-full border border-[#d8deed] bg-white px-4 text-[0.9rem] font-semibold text-[#25304a] transition-all duration-200 hover:-translate-y-px hover:border-[#cfd7f2] sm:w-auto"
                        onClick={() => runDocDemo(showPromiseFlow)}
                      >
                        Play toast
                      </button>
                    </div>
                    <CodeBlock code={PROMISE_SNIPPET} />
                  </article>

                  <article className="rounded-[22px] border border-[#e2e2ef] bg-[#f8f7fb] p-4 sm:rounded-[26px] sm:p-5">
                    <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                      Scoped runtime
                    </div>
                    <h4 className="mt-2 text-[1.04rem] leading-[1.15] text-[#1f2642] font-bold sm:text-[1.14rem]">
                      Isolate one provider when several apps share the same page
                    </h4>
                    <p className="mt-3 text-[0.96rem] leading-[1.65] text-[#6b6973]">
                      Pair `createToastScope("checkout")` with `scope="checkout"`
                      on the provider so one widget cannot accidentally fire
                      another widget&apos;s toasts.
                    </p>
                    <CodeBlock code={SCOPED_RUNTIME_SNIPPET} />
                  </article>

                  <article className="rounded-[22px] border border-[#e2e2ef] bg-[#f8f7fb] p-4 sm:rounded-[26px] sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                          History panel
                        </div>
                        <h4 className="mt-2 text-[1.04rem] leading-[1.15] text-[#1f2642] font-bold sm:text-[1.14rem]">
                          Keep recent notifications available after they close
                        </h4>
                        <p className="mt-3 text-[0.96rem] leading-[1.65] text-[#6b6973]">
                          Enable history with `storage: "indexeddb"` when you
                          want persistence across reloads, or switch to
                          `storage: "memory"` when saved activity should stay
                          inside the current tab session only.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-full border border-[#d8deed] bg-white px-4 text-[0.9rem] font-semibold text-[#25304a] transition-all duration-200 hover:-translate-y-px hover:border-[#cfd7f2] sm:w-auto"
                        onClick={() => runDocDemo(showHistoryToast)}
                      >
                        Play toast
                      </button>
                    </div>
                    <CodeBlock code={HISTORY_SNIPPET} />
                  </article>

                  <article className="rounded-[22px] border border-[#e2e2ef] bg-[#f8f7fb] p-4 sm:rounded-[26px] sm:p-5">
                    <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                      Headless mode
                    </div>
                    <h4 className="mt-2 text-[1.04rem] leading-[1.15] text-[#1f2642] font-bold sm:text-[1.14rem]">
                      Bring your own UI when you only need state and events
                    </h4>
                    <p className="mt-3 text-[0.96rem] leading-[1.65] text-[#6b6973]">
                      Turn off the built-in layer if your design system already
                      owns the visual surface and you only want runtime behavior.
                    </p>
                    <CodeBlock code={HEADLESS_SNIPPET} />
                  </article>

                  <article className="rounded-[22px] border border-[#e2e2ef] bg-[#f8f7fb] p-4 sm:rounded-[26px] sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                          Custom body
                        </div>
                        <h4 className="mt-2 text-[1.04rem] leading-[1.15] text-[#1f2642] font-bold sm:text-[1.14rem]">
                          Render any React component inside the toast shell
                        </h4>
                        <p className="mt-3 text-[0.96rem] leading-[1.65] text-[#6b6973]">
                          Keep the stack behavior, theming, and chrome while
                          swapping the body for richer UI like status cards, mini
                          forms, or inline action clusters.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex min-h-[42px] w-full items-center justify-center whitespace-nowrap rounded-full border border-[#d8deed] bg-white px-4 text-[0.9rem] font-semibold text-[#25304a] transition-all duration-200 hover:-translate-y-px hover:border-[#cfd7f2] sm:w-auto"
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

            <div className="grid min-w-0 max-w-full gap-6 self-start xl:justify-self-end">
              <div className="min-w-0 max-w-full rounded-[28px] border border-[#dfe3ef] bg-white/92 p-5 shadow-[0_18px_42px_rgba(41,55,103,0.07)] sm:rounded-[32px] sm:p-6">
                <div className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                  Try live toasts
                </div>
                <h3 className="mt-2 max-w-[16ch] text-[1.12rem] leading-[1.08] text-[#1f2642] font-bold sm:text-[1.28rem]">
                  Click to feel the runtime before reading every API
                </h3>
                <p className="mt-3 text-[0.98rem] leading-[1.65] text-[#756f67]">
                  These buttons fire the real scoped provider on this page, so
                  you can test basic success, async flows, and deduped updates
                  immediately without affecting any other toaststar runtime.
                </p>

                <div className="mt-4 min-w-0 rounded-[22px] border border-[#e7dfd5] bg-[#fff6ee] px-4 py-3 text-[0.9rem] leading-[1.55] text-[#866247]">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 break-words">
                    <span>Demo scope:</span>
                    <code className="break-all font-mono text-[0.88rem] text-[#5f4838]">
                      {DEMO_SCOPE}
                    </code>
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
                      <div className="text-[0.94rem] font-semibold text-[#1f2642] sm:text-[0.98rem]">
                        {item.label}
                      </div>
                      <div className="mt-1 text-[0.88rem] leading-[1.55] text-[#6b6973] sm:text-[0.92rem]">
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

              <div className="min-w-0 max-w-full rounded-[28px] border border-[#dfe3ef] bg-white/92 p-5 shadow-[0_18px_42px_rgba(41,55,103,0.07)] sm:rounded-[32px] sm:p-6">
                <div className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-[#9d8e80]">
                  Live history
                </div>
                <h3 className="mt-2 text-[1.1rem] leading-[1.1] text-[#1f2642] font-bold sm:text-[1.24rem]">
                  Saved notifications appear here
                </h3>
                <p className="mt-3 text-[0.98rem] leading-[1.65] text-[#756f67]">
                  Fire a few demos, then use this panel to verify that
                  history-enabled toasts stay available after the stack closes.
                  This demo uses IndexedDB; app code can switch to memory mode for
                  session-only history.
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
                      Enable history in the playground to persist this panel. In
                      your app, use `storage: "memory"` if you only want the
                      current tab session.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
