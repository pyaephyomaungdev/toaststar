# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **ESLint + Prettier**: Added code quality tooling with ESLint (flat config) and Prettier for consistent formatting.
- **Test coverage**: Expanded from 24 to 77 tests — added utility, theme, hook, and component tests.
- **Coverage reporting**: Added `@vitest/coverage-v8` with `test:coverage` script and CI artifact upload.
- **ARIA roles**: Toast cards now have `role="alert"` for error/warning intents and `role="status"` for others.
- **Keyboard navigation**: Expanded toasts are keyboard-focusable (`tabIndex={0}`); Escape dismisses a focused toast.
- **Stack count in ARIA label**: Collapsed stack label now announces notification count.
- **Error boundary**: `ToastErrorBoundary` wraps the toast layer to prevent host app crashes from custom `body` renderer errors.
- **CI matrix testing**: GitHub Actions now tests against Node 18, 20, and 22.
- **Lint + format checks in CI**: Added `npm run lint` and `npm run format:check` steps to the CI pipeline.

### Changed

- **Refactored ToastProvider**: Extracted `useExpandCollapse` and `useToastHistoryManager` hooks, reducing `ToastProvider.tsx` from 1404 to ~1050 lines.
- **Memory adapter**: Replaced `async` methods with explicit `Promise.resolve()` returns to eliminate `require-await` lint warnings.
- **CI workflow**: Updated from single Node 20 to Node 18/20/22 matrix strategy.

## [0.1.6]

### Added

- Swipe-to-dismiss gesture support for touch and pen inputs.
- URL-like descriptions use single-line truncation mode.
- Multiline title clamping (2 lines max with `-webkit-line-clamp`).
- Touch device tap-to-expand for collapsed stacks.
- Burst window: temporary visible overflow during rapid toast bursts (`burstMaxVisible`).

## [0.1.5]

### Added

- `ToastHistoryPanel` component for displaying notification history.
- History import/export with `postHistory` and `fetchHistory` API methods.
- Memory and IndexedDB history storage adapters with namespace isolation.

## [0.1.4]

### Added

- Scoped toast controllers (`createToastScope`, `createToastController`).
- `dedupeBehavior` prop: `"ignore"`, `"update"`, `"reset-duration"`.
- Queue overflow strategies: `"queue"`, `"drop-oldest"`, `"drop-newest"`.

## [0.1.3]

### Added

- Initial release: center-launch cinematic intro animations.
- 5 theme presets: glass, midnight, sunset, forest, ocean.
- Hover-only stack fan-out with configurable `expandOnHover`.
- Async flow support: `toast.loading()`, `toast.update()`, `toast.promise()`.
- Progress bars (determinate, indeterminate, auto-timer).
- Lifecycle callbacks: `onOpen`, `onClose`, `onAutoClose`, `onAction`.
- Pause-on-hover with timer preservation.
