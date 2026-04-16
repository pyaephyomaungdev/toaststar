import type { ComponentProps, ReactNode } from "react";
import { ToastProvider } from "toaststar";

export type ProviderAppearance = NonNullable<
  ComponentProps<typeof ToastProvider>["appearance"]
>;
export type ThemeOption = "glass" | "light" | "midnight" | "sunset" | "forest" | "ocean";
export type PositionOption =
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
export type IntentOption = "default" | "success" | "error" | "info" | "warning";
export type OverflowOption = "queue" | "drop-oldest" | "drop-newest";
export type DedupeOption = "ignore" | "update" | "reset-duration";

export interface ReferenceLandingPageProps {
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

export interface HeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
}

export interface BuilderExampleGroup {
  title: string;
  items: Array<{
    label: string;
    onTrigger: () => void;
  }>;
}

export interface DocQuickstartStep {
  step: string;
  eyebrow: string;
  title: string;
  description: string;
  code: string;
}

export interface DocLiveToastDefinition {
  id: string;
  label: string;
  description: string;
  action: () => void;
  code: string;
}

export interface CustomBodyProps {
  title: string;
  description?: string;
  intent?: IntentOption;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}

export interface BuilderChipProps {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}

export interface BuilderToggleProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  hideLabel?: boolean;
  disabled?: boolean;
}

export interface BuilderToggleCardProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}
