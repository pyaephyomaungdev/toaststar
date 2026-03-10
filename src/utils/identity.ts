const PACKAGE_PREFIX = "toaststar";
const GLOBAL_SCOPE = `${PACKAGE_PREFIX}:global`;
let cachedImplicitScope: string | undefined;

function normalizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function hashString(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function getLocationParts(): { origin: string; pathname: string } | null {
  if (typeof window === "undefined" || !window.location) {
    return null;
  }

  return {
    origin: window.location.origin || "local",
    pathname: window.location.pathname || "/",
  };
}

function normalizeScope(scope: string | undefined): string | undefined {
  if (typeof scope !== "string") {
    return undefined;
  }

  const trimmed = scope.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveImplicitScope(): string {
  if (cachedImplicitScope) {
    return cachedImplicitScope;
  }

  const locationParts = getLocationParts();

  if (!locationParts) {
    return GLOBAL_SCOPE;
  }

  // Freeze the implicit scope for the lifetime of the page so SPA route changes
  // do not disconnect the default toast singleton from the mounted provider.
  cachedImplicitScope = `${PACKAGE_PREFIX}:site:${locationParts.origin}${locationParts.pathname}`;
  return cachedImplicitScope;
}

export function resolveToastScope(scope?: string): string {
  const explicitScope = normalizeScope(scope);

  if (explicitScope) {
    return `${PACKAGE_PREFIX}:scope:${explicitScope}`;
  }

  return resolveImplicitScope();
}

export function resolveHistoryDatabaseName(scope?: string): string {
  const locationParts = getLocationParts();
  const origin = locationParts?.origin ?? "global";
  const explicitScope = normalizeScope(scope);
  const scopeSegment = explicitScope
    ? `-${normalizeSegment(explicitScope) || "scoped"}`
    : "";

  return `${PACKAGE_PREFIX}-history-${normalizeSegment(origin) || "global"}${scopeSegment}-${hashString(origin)}`;
}

export function resolveHistoryNamespace(scope?: string): string {
  const scopeKey = resolveToastScope(scope);
  const slug = normalizeSegment(scopeKey) || "default";

  return `${PACKAGE_PREFIX}-history-${slug}-${hashString(scopeKey)}`;
}
