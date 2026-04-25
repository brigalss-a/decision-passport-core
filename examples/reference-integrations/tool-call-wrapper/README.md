# Tool Call Passport Wrapper — Reference Integration

This example demonstrates all four execution flows of the
`@decision-passport/tool-call-wrapper` SDK.

## What it shows

| Flow | Description |
|------|-------------|
| SUCCESS | Tool executes and returns a result; `outputHash` is recorded |
| FAILED | Tool throws; `errorHash` is recorded; stack trace is NOT included |
| DENIED | `authorization.approved = false`; `execute()` is never called |
| ABORTED | `AbortSignal` already aborted; `execute()` is never called |

## Running the demo

```bash
# From the decision-passport-core workspace root:
pnpm install
pnpm build
tsx examples/reference-integrations/tool-call-wrapper/run-tool-call-wrapper-demo.ts
```

Generated fixtures are written to `fixtures/`:
- `success.bundle.json`
- `failed.bundle.json`
- `denied.bundle.json`
- `aborted.bundle.json`
- `tampered-input.bundle.json` (demonstrates verifier rejection)

## No external APIs

All tool functions in the demo are local async stubs.
No network calls are made.

## Verify any fixture offline

```bash
pnpm --filter @decision-passport/verifier-basic verify <path-to-bundle.json>
```
