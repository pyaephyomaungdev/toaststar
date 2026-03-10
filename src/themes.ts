import type {
  ResolvedToastTheme,
  ToastAppearance,
  ToastIntent,
  ToastThemeName,
} from "./types";

const INTENT_ACCENTS: Record<ToastIntent, string> = {
  default: "#8fb3ff",
  success: "#44d19b",
  error: "#ff6b7a",
  warning: "#ffb454",
  info: "#74b7ff",
};

const THEME_PRESETS: Record<ToastThemeName, Omit<ResolvedToastTheme, "accent">> = {
  glass: {
    radius: "26px",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.42), rgba(255,255,255,0.18))",
    border: "1px solid rgba(255,255,255,0.26)",
    color: "#f6f7fb",
    shadow: "0 24px 60px rgba(10, 14, 28, 0.28)",
    blur: "22px",
    width: "min(388px, calc(100vw - 32px))",
    closeButtonBackground: "rgba(255,255,255,0.14)",
  },
  midnight: {
    radius: "24px",
    background:
      "linear-gradient(180deg, rgba(15,19,33,0.96), rgba(9,11,20,0.94))",
    border: "1px solid rgba(126, 152, 255, 0.22)",
    color: "#eff3ff",
    shadow: "0 24px 52px rgba(2, 4, 10, 0.44)",
    blur: "0px",
    width: "min(388px, calc(100vw - 32px))",
    closeButtonBackground: "rgba(143,179,255,0.12)",
  },
  sunset: {
    radius: "28px",
    background:
      "linear-gradient(135deg, rgba(91,28,34,0.98), rgba(187,88,51,0.94))",
    border: "1px solid rgba(255, 208, 176, 0.2)",
    color: "#fff8f3",
    shadow: "0 26px 60px rgba(102, 34, 23, 0.34)",
    blur: "8px",
    width: "min(388px, calc(100vw - 32px))",
    closeButtonBackground: "rgba(255,248,243,0.14)",
  },
  forest: {
    radius: "24px",
    background:
      "linear-gradient(135deg, rgba(15,46,34,0.96), rgba(32,84,63,0.95))",
    border: "1px solid rgba(141, 226, 189, 0.18)",
    color: "#f1fff8",
    shadow: "0 24px 54px rgba(8, 28, 20, 0.32)",
    blur: "10px",
    width: "min(388px, calc(100vw - 32px))",
    closeButtonBackground: "rgba(241,255,248,0.12)",
  },
  ocean: {
    radius: "24px",
    background:
      "linear-gradient(135deg, rgba(13,35,78,0.96), rgba(18,102,128,0.92))",
    border: "1px solid rgba(140, 210, 255, 0.18)",
    color: "#f5fcff",
    shadow: "0 26px 56px rgba(7, 19, 46, 0.34)",
    blur: "8px",
    width: "min(388px, calc(100vw - 32px))",
    closeButtonBackground: "rgba(245,252,255,0.14)",
  },
};

function toCssSize(value: number | string | undefined, fallback: string): string {
  if (typeof value === "number") {
    return `${value}px`;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return fallback;
}

function mergeAppearance(
  base: ResolvedToastTheme,
  appearance?: ToastAppearance,
  intent: ToastIntent = "default",
): ResolvedToastTheme {
  if (!appearance) {
    return {
      ...base,
      accent: INTENT_ACCENTS[intent],
    };
  }

  return {
    radius: toCssSize(appearance.radius, base.radius),
    background: appearance.background ?? base.background,
    border: appearance.border ?? base.border,
    color: appearance.color ?? base.color,
    shadow: appearance.shadow ?? base.shadow,
    blur: toCssSize(appearance.blur, base.blur),
    width: toCssSize(appearance.width, base.width),
    accent: appearance.accent ?? INTENT_ACCENTS[intent],
    closeButtonBackground:
      appearance.closeButtonBackground ?? base.closeButtonBackground,
  };
}

export function resolveToastTheme(
  theme: ToastThemeName,
  intent: ToastIntent,
  providerAppearance?: ToastAppearance,
  toastAppearance?: ToastAppearance,
): ResolvedToastTheme {
  const preset = THEME_PRESETS[theme] ?? THEME_PRESETS.glass;
  const withDefaults = {
    ...preset,
    accent: INTENT_ACCENTS[intent],
  };

  return mergeAppearance(
    mergeAppearance(withDefaults, providerAppearance, intent),
    toastAppearance,
    intent,
  );
}
