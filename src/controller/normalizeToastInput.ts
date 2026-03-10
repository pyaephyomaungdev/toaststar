import type {
  ToastContentInput,
  ToastInput,
  ToastIntent,
  ToastLoadingInput,
  ToastPromiseResultInput,
  ToastVariantInput,
} from "../types";

export function normalizeVariantInput(
  input: ToastVariantInput,
  intent: ToastIntent,
): ToastInput {
  if (typeof input === "string") {
    return {
      title: input,
      intent,
    };
  }

  return {
    ...input,
    intent,
  };
}

export function normalizeShowInput(input: ToastContentInput): ToastInput {
  if (typeof input === "string") {
    return {
      title: input,
    };
  }

  return input;
}

export function normalizeLoadingInput(input: ToastLoadingInput): ToastInput {
  if (typeof input === "string") {
    return {
      title: input,
      intent: "info",
      loading: true,
      persistent: true,
      closable: false,
    };
  }

  return {
    ...input,
    intent: input.intent ?? "info",
    loading: true,
    persistent: input.persistent ?? true,
    closable: input.closable ?? false,
  };
}

export function resolvePromiseInput<T>(
  resolver: ToastPromiseResultInput | ((value: T) => ToastPromiseResultInput),
  value: T,
  intent: ToastIntent,
): ToastInput {
  const resolved = typeof resolver === "function" ? resolver(value) : resolver;

  if (typeof resolved === "string") {
    return {
      title: resolved,
      intent,
      loading: false,
      persistent: false,
      showProgress: false,
    };
  }

  return {
    ...resolved,
    intent: resolved.intent ?? intent,
    loading: false,
    persistent: resolved.persistent ?? false,
    showProgress: resolved.showProgress ?? false,
  };
}
