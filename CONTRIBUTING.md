# Contributing

## Local setup

```bash
npm ci
npm --prefix demo ci
```

## Verification

Run the full local gate before opening a pull request:

```bash
npm run ci
```

This runs:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run demo:build`

## Pull request notes

- Keep public API changes backward-compatible unless the change is intentionally breaking.
- Add or update tests for queueing, dedupe, scoped controllers, and history behavior when you touch runtime logic.
- Prefer small focused pull requests with a short summary of user-visible behavior changes.
- By participating in this project, you agree to follow the Code of Conduct.
