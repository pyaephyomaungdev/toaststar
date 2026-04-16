import { Component, type ErrorInfo, type ReactNode } from "react";

interface ToastErrorBoundaryProps {
  children: ReactNode;
}

interface ToastErrorBoundaryState {
  hasError: boolean;
}

export class ToastErrorBoundary extends Component<
  ToastErrorBoundaryProps,
  ToastErrorBoundaryState
> {
  constructor(props: ToastErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ToastErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const nodeEnv = (
      globalThis as typeof globalThis & {
        process?: { env?: { NODE_ENV?: string } };
      }
    ).process?.env?.NODE_ENV;

    if (nodeEnv !== "production" && typeof console !== "undefined") {
      console.error("toaststar: toast render error caught by error boundary", error, info);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}
