import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { ToastProvider } from "toaststar";
import { useHaptic } from "./demo/hooks";
import { DEMO_SCOPE, WELCOME_PREVIEW_SCOPE } from "./demo/runtime";
import { ReferenceLandingPage } from "./demo/referenceLandingPage";
import type {
  DedupeOption,
  OverflowOption,
  PositionOption,
  ProviderAppearance,
  ThemeOption,
} from "./demo/types";

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
  const [overflowStrategy, setOverflowStrategy] =
    useState<OverflowOption>("queue");
  const [dedupeBehavior, setDedupeBehavior] =
    useState<DedupeOption>("update");
  const deferredHistoryEnabled = useDeferredValue(historyEnabled);
  const providerPosition = position.startsWith("bottom") ? "bottom" : "top";

  const providerAppearance = useMemo<ProviderAppearance>(
    () => ({
      radius,
      blur,
      width: "min(408px, calc(100vw - 32px))",
      shadow: "0 24px 54px rgba(46, 59, 112, 0.18)",
    }),
    [blur, radius],
  );

  const { trigger: hapticTrigger } = useHaptic();

  return (
    <>
      <ToastProvider
        scope={WELCOME_PREVIEW_SCOPE}
        position={providerPosition}
        defaultTheme={theme}
        introDuration={0}
        appearance={providerAppearance}
        showProgress={showProgress}
        maxCollapsed={3}
        burstMaxVisible={3}
        maxVisible={limitVisible ? maxVisible : undefined}
        queueLimit={limitVisible ? queueLimit : undefined}
        overflowStrategy={overflowStrategy}
        dedupeBehavior={dedupeBehavior}
        expandOnHover={expandOnHover}
        pauseOnHover={pauseOnHover}
        swipeToDismiss={swipeToDismiss}
        headless={!builtInLayer}
        portalTarget={portalEnabled ? null : false}
      />
      <ToastProvider
        scope={DEMO_SCOPE}
        position={providerPosition}
        defaultTheme={theme}
        introDuration={400}
        appearance={providerAppearance}
        showProgress={showProgress}
        maxCollapsed={3}
        burstMaxVisible={3}
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
        <div className="relative z-[1] w-full">
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
            onShowProgressChange={(next) =>
              startTransition(() => setShowProgress(next))
            }
            onSwipeToDismissChange={(next) =>
              startTransition(() => setSwipeToDismiss(next))
            }
            onExpandOnHoverChange={(next) =>
              startTransition(() => setExpandOnHover(next))
            }
            onPauseOnHoverChange={(next) =>
              startTransition(() => setPauseOnHover(next))
            }
            onBuiltInLayerChange={(next) =>
              startTransition(() => setBuiltInLayer(next))
            }
            onPortalEnabledChange={(next) =>
              startTransition(() => setPortalEnabled(next))
            }
            onLimitVisibleChange={(next) =>
              startTransition(() => setLimitVisible(next))
            }
            onMaxVisibleChange={(next) =>
              startTransition(() => setMaxVisible(next))
            }
            onQueueLimitChange={(next) =>
              startTransition(() => setQueueLimit(next))
            }
            onOverflowStrategyChange={(next) =>
              startTransition(() => setOverflowStrategy(next))
            }
            onDedupeBehaviorChange={(next) =>
              startTransition(() => setDedupeBehavior(next))
            }
          />
        </div>
      </ToastProvider>
    </>
  );
}
