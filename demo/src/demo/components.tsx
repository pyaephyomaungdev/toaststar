import {
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { toast } from "./runtime";
import type {
  BuilderChipProps,
  BuilderToggleCardProps,
  BuilderToggleProps,
} from "./types";

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

export function CodeBlock(props: { code: string }) {
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
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mt-4 min-w-0 max-w-full overflow-hidden rounded-[18px] border border-[#96b0da]/12 bg-[#f6f8fb]/60 transition-all duration-300 hover:border-[#96b0da]/25 hover:bg-[#f6f8fb]/80 sm:rounded-2xl">
      <div className="flex justify-end bg-[#f6f8fb]/40 px-2 py-1.5 sm:px-3 sm:py-2">
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
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              width="12"
              height="12"
            >
              <rect x="6" y="6" width="10" height="10" rx="1.5" />
              <path d="M4 14V6a2 2 0 0 1 2-2h8" strokeLinecap="round" />
            </svg>
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="m-0 min-w-0 max-w-full overflow-x-auto px-3.5 py-3.5 font-mono text-[0.78rem] leading-[1.6] text-slate-700 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:px-5 sm:py-4 sm:text-[0.875rem]">
        <code className="block min-w-fit" dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </div>
  );
}

export function BuilderChip(props: BuilderChipProps) {
  const { active = false, children, onClick } = props;

  return (
    <button
      type="button"
      className={`inline-flex min-h-[40px] items-center justify-center rounded-full border px-3.5 text-[0.92rem] transition-all duration-200 sm:min-h-[44px] sm:px-5 sm:text-[1rem] ${active
        ? "border-[#d4dcfb] bg-[linear-gradient(180deg,#f4f6ff,#eaf0ff)] text-[#2947ae] shadow-[0_10px_24px_rgba(62,82,160,0.12)]"
        : "border-[#e3dbd1] bg-[#f6f0e8] text-[#302d28] hover:-translate-y-px hover:border-[#d7dff8] hover:bg-white"
        }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function BuilderToggle(props: BuilderToggleProps) {
  const { label, checked, onChange, hideLabel = false, disabled = false } = props;

  return (
    <label className="flex items-center justify-between gap-4 text-[0.96rem] text-[#25304a] sm:text-[1.02rem]">
      {hideLabel ? null : <span>{label}</span>}
      <button
        type="button"
        aria-pressed={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 ${checked ? "border-[#263a76] bg-[#263a76]" : "border-[#e4ddd3] bg-[#ece7df]"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span
          className={`absolute h-6 w-6 rounded-full shadow-[0_4px_10px_rgba(17,24,18,0.12)] transition-transform duration-200 ${checked
            ? "translate-x-[29px] bg-[#fff6ee]"
            : "translate-x-[3px] bg-white"
            }`}
        />
      </button>
    </label>
  );
}

export function BuilderToggleCard(props: BuilderToggleCardProps) {
  const { label, description, checked, onChange, disabled = false } = props;

  return (
    <div className="rounded-[20px] border border-[#ebe4da] bg-[#fbf8f3] px-3.5 py-3.5 sm:rounded-[24px] sm:px-4 sm:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 sm:pr-2">
          <div className="text-[0.95rem] font-semibold text-[#2c2a26] sm:text-[1rem]">
            {label}
          </div>
          <p className="mt-1 text-[0.88rem] leading-[1.55] text-[#8b857c] sm:text-[0.92rem]">
            {description}
          </p>
        </div>
        <div className="flex justify-end sm:block">
          <BuilderToggle
            label={label}
            checked={checked}
            onChange={onChange}
            hideLabel
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

export function HeroDropIcon(props: {
  className: string;
  children: ReactNode;
  targetRef: MutableRefObject<HTMLSpanElement | null>;
  visible: boolean;
}) {
  const { className, children, targetRef, visible } = props;

  return (
    <span
      ref={targetRef}
      className={`${className} transition-opacity duration-100 ${visible ? "opacity-100" : "opacity-0"
        }`}
      aria-hidden={!visible}
    >
      {children}
    </span>
  );
}

export function HeroIntroOverlay(props: {
  active: boolean;
  className: string;
  children: ReactNode;
  targetRef: MutableRefObject<HTMLSpanElement | null>;
}) {
  const { active, className, children, targetRef } = props;
  const [animationStyle, setAnimationStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!active) {
      setAnimationStyle(null);
      return;
    }

    const updatePosition = () => {
      const target = targetRef.current;

      if (!target) {
        return;
      }

      const rect = target.getBoundingClientRect();
      const targetCenterX = rect.left + rect.width / 2;
      const targetCenterY = rect.top + rect.height / 2;

      setAnimationStyle({
        ["--hero-intro-end-x" as string]: `${targetCenterX - window.innerWidth / 2}px`,
        ["--hero-intro-end-y" as string]: `${targetCenterY - window.innerHeight / 2}px`,
      });
    };

    updatePosition();

    const rafId = window.requestAnimationFrame(updatePosition);
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => updatePosition());

    if (targetRef.current && resizeObserver) {
      resizeObserver.observe(targetRef.current);
    }

    void document.fonts?.ready?.then(() => updatePosition());
    window.addEventListener("resize", updatePosition);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updatePosition);
    };
  }, [active, targetRef]);

  if (!active || !animationStyle) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      <span
        className={`${className} hero-intro-overlay fixed left-1/2 top-1/2`}
        style={animationStyle}
        aria-hidden="true"
      >
        {children}
      </span>
    </div>
  );
}
