# Release Notes — v0.8.1

**Batch Verification + Audit Reports**

Released: 2026-04-25

---

## Summary

v0.8.1 adds batch verification and structured audit report generation to `@decision-passport/verifier-basic`. A set of `BasicProofBundle` objects can now be verified in a single call, failures classified deterministically, and results exported as JSON or Markdown audit artifacts.

All verification is offline. No database, Redis, network, GPU, or cloud dependency.

---

## What changed

### New module: `packages/verifier-basic/src/batch-verification.ts`

Three new exported functions added to `@decision-passport/verifier-basic`:

#### `verifyBundleBatch(bundles, options?)`

Verifies many bundles using the canonical `verifyBasicBundle`. No semantics are duplicated. Supports `failFast` (stop on first FAIL) and `label` (for report tagging). Returns a `BatchVerificationReport` with per-bundle results and aggregated failure summaries.

#### `classifyVerificationFailures(results)`

Deterministically classifies an array of `BundleVerificationResult` objects into `VerificationFailureSummary`. Can be called on any result set, not just from `verifyBundleBatch`.

#### `createVerificationAuditReport(report, options?)`

Converts a `BatchVerificationReport` into a `VerificationAuditArtifact`. Supports `format: "json"` (machine-readable structured output) and `format: "markdown"` (human-readable summary with failure table).

---

## Public API added

```typescript
// From @decision-passport/verifier-basic

export function verifyBundleBatch(
  bundles: readonly unknown[],
  options?: BatchVerificationOptions
): BatchVerificationReport;

export function classifyVerificationFailures(
  results: readonly BundleVerificationResult[]
): VerificationFailureSummary;

export function createVerificationAuditReport(
  report: BatchVerificationReport,
  options?: VerificationAuditReportOptions
): VerificationAuditArtifact;

// New types:
export type BatchFailureClass =
  | "CHAIN_BREAK" | "MANIFEST_MISMATCH" | "TAMPERED_PAYLOAD"
  | "UNSUPPORTED_VERSION" | "MALFORMED_BUNDLE" | "MISSING_RECORD"
  | "HASH_MISMATCH" | "AUTHORIZATION_MISMATCH" | "UNKNOWN";

export interface BatchVerificationOptions { failFast?: boolean; label?: string; }
export interface BundleVerificationResult { index: number; chainId?: string; result: BasicVerifierResult; batchFailureClass?: BatchFailureClass; }
export interface VerificationFailureSummary { totalFailed: number; byClass: Record<BatchFailureClass, number>; failedIndices: number[]; }
export interface BatchVerificationReport { totalCount: number; passedCount: number; failedCount: number; failFastTriggered: boolean; results: BundleVerificationResult[]; failureSummary: VerificationFailureSummary; }
export interface VerificationAuditReportOptions { format?: "json" | "markdown"; includePassedDetails?: boolean; }
export interface VerificationAuditArtifact { format: "json" | "markdown"; content: string; generatedAt: string; }
```

---

## Security boundary

- All new functions are pure, stateless, and offline
- No new external dependencies added
- No network calls, database writes, or filesystem side effects
- Deterministic: same input always produces same output

---

## What this proves

- A set of bundles verifies against the same rules as individual `verifyBasicBundle` calls
- Failures are classified into stable, machine-readable categories
- Audit reports can be reproduced offline at any time from the same bundle set

## What this does not prove

- GPU-accelerated or parallel verification
- Real-time monitoring service guarantees
- Enterprise streaming ingestion
- AI factory runtime integration
- Cloud audit compliance

---

## Tests added

`packages/verifier-basic/tests/batch-verification.test.ts` — 33 new tests:
- All-valid batch passes
- Mixed valid/invalid batch: correct counts and failure indices
- Failure classification determinism
- `failFast` stops at first failure
- Empty array input
- Null/undefined inputs classified as MALFORMED_BUNDLE
- JSON and Markdown audit report structure
- Tool-call-wrapper demo fixtures verify in batch
- Tampered tool-call-wrapper fixture fails in batch

Total tests: 185 (95 core + 51 verifier-basic + 39 tool-call-wrapper)

---

## Migration notes

No breaking changes. `verifyBasicBundle` and all existing exports remain unchanged. New exports are additive.

---

## Next recommended release

**v0.9.0 — Autonomous Action Receipt Profile**

Docs, fixtures, and examples for autonomous vehicle, robot, drone, and edge AI action receipts. Profile-only: no vendor SDK, no runtime enforcement, no safety certification claim.
