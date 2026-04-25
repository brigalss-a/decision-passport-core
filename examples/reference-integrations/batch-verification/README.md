# Batch Verification Demo

This example demonstrates `verifyBundleBatch()`, `classifyVerificationFailures()`, and `createVerificationAuditReport()` from `@decision-passport/verifier-basic`.

## Run

```bash
pnpm example:batch-verification
```

## What it demonstrates

1. **All-pass batch** — 6 valid bundles (core fixtures + tool-call-wrapper fixtures) verified in one call. Produces a Markdown report.

2. **Mixed batch** — 6 bundles with 2 valid and 4 invalid. Shows failure counts, failure class breakdown, and failed indices. Produces JSON and Markdown reports.

3. **failFast** — Stops after the first FAIL result. Only 2 of 3 bundles evaluated.

4. **Standalone classification** — `classifyVerificationFailures()` called on an existing result set.

## Output files

Results are written to `examples/reference-integrations/batch-verification/output/`:

- `all-pass-report.md` — Markdown report for all-pass batch
- `mixed-report.json` — JSON report for mixed batch (includes passed + failed)
- `mixed-report.md` — Markdown report for mixed batch

## No runtime dependencies

All verification is offline. No network, database, or cloud service.

## See also

- [docs/BATCH_VERIFICATION.md](../../../docs/BATCH_VERIFICATION.md) — Full API reference
- [RELEASE_NOTES_v0.8.1.md](../../../RELEASE_NOTES_v0.8.1.md) — Release notes
