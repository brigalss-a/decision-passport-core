# Batch Verification + Audit Reports

> Part of Decision Passport Core v0.8.1

---

## Overview

`verifyBundleBatch()` verifies many `BasicProofBundle` objects in a single call, using the canonical `verifyBasicBundle` verifier internally. It classifies failures deterministically and can produce JSON or Markdown audit reports via `createVerificationAuditReport()`.

**Protocol boundary**: No database, Redis, network, GPU, or cloud dependency. Fully offline.

---

## Quick example

```typescript
import { verifyBundleBatch, createVerificationAuditReport } from '@decision-passport/verifier-basic';
import { readFileSync } from 'fs';

const bundles = [
  JSON.parse(readFileSync('./bundle-a.json', 'utf8')),
  JSON.parse(readFileSync('./bundle-b.json', 'utf8')),
  JSON.parse(readFileSync('./bundle-c.json', 'utf8')),
];

const report = verifyBundleBatch(bundles, { label: 'audit-2026-q1' });

console.log(report.totalCount);   // 3
console.log(report.passedCount);  // 2
console.log(report.failedCount);  // 1
console.log(report.failureSummary.byClass);
// { CHAIN_BREAK: 0, TAMPERED_PAYLOAD: 1, MALFORMED_BUNDLE: 0, ... }

// Produce a Markdown audit report
const artifact = createVerificationAuditReport(report, { format: 'markdown' });
console.log(artifact.content);
```

---

## API Reference

### `verifyBundleBatch(bundles, options?)`

```typescript
function verifyBundleBatch(
  bundles: readonly unknown[],
  options?: BatchVerificationOptions
): BatchVerificationReport
```

Verifies all bundles using the canonical `verifyBasicBundle` verifier. Does not duplicate verifier semantics — every bundle goes through the same checks as a standalone call.

**Options:**

| Field | Type | Default | Description |
|---|---|---|---|
| `failFast` | `boolean` | `false` | Stop after the first FAIL result |
| `label` | `string` | — | Human-readable label for the batch |

**Returns: `BatchVerificationReport`**

| Field | Type | Description |
|---|---|---|
| `batchLabel` | `string \| undefined` | Label from options |
| `verifiedAt` | `string` | ISO 8601 timestamp |
| `totalCount` | `number` | Total number of bundles provided |
| `passedCount` | `number` | Number that passed |
| `failedCount` | `number` | Number that failed |
| `failFastTriggered` | `boolean` | Whether failFast stopped early |
| `results` | `BundleVerificationResult[]` | Per-bundle results |
| `failureSummary` | `VerificationFailureSummary` | Aggregated failure counts |

---

### `classifyVerificationFailures(results)`

```typescript
function classifyVerificationFailures(
  results: readonly BundleVerificationResult[]
): VerificationFailureSummary
```

Classifies failures from a set of bundle results. Deterministic — same input always produces same output. Can be called on results from `verifyBundleBatch` or any other source.

**Returns: `VerificationFailureSummary`**

| Field | Type | Description |
|---|---|---|
| `totalFailed` | `number` | Total failed results |
| `byClass` | `Record<BatchFailureClass, number>` | Count by failure class |
| `failedIndices` | `number[]` | 0-based indices of failed results |

---

### `createVerificationAuditReport(report, options?)`

```typescript
function createVerificationAuditReport(
  report: BatchVerificationReport,
  options?: VerificationAuditReportOptions
): VerificationAuditArtifact
```

Produces a JSON or Markdown audit report from a `BatchVerificationReport`.

**Options:**

| Field | Type | Default | Description |
|---|---|---|---|
| `format` | `"json" \| "markdown"` | `"json"` | Output format |
| `includePassedDetails` | `boolean` | `false` | Include per-bundle detail for passing bundles |

**Returns: `VerificationAuditArtifact`**

| Field | Type | Description |
|---|---|---|
| `format` | `"json" \| "markdown"` | Output format |
| `content` | `string` | Serialized JSON string or Markdown text |
| `generatedAt` | `string` | ISO 8601 timestamp |

---

## Failure Classes

| Class | Verifier codes | Description |
|---|---|---|
| `CHAIN_BREAK` | `CHAIN_BROKEN`, `ORDER_INVALID`, `PREV_HASH_MISMATCH`, `SEQUENCE_MISMATCH`, `CHAIN_INTEGRITY_FAILED` | Record chain is broken or out of order |
| `MANIFEST_MISMATCH` | `OUTCOME_LINKAGE_MISMATCH`, `MANIFEST_HASH_MISMATCH` | Manifest chain hash does not match records |
| `TAMPERED_PAYLOAD` | `CLAIM_PAYLOAD_MISMATCH`, `TRAIL_PAYLOAD_MISMATCH`, `PAYLOAD_HASH_MISMATCH` | Payload content was mutated after signing |
| `HASH_MISMATCH` | `HASH_MISMATCH` | Record hash does not match recomputed value |
| `UNSUPPORTED_VERSION` | `VERSION_UNSUPPORTED`, `PROFILE_UNSUPPORTED`, `UNSUPPORTED_BUNDLE_VERSION` | Bundle version is not supported |
| `MALFORMED_BUNDLE` | `SCHEMA_MISSING_FIELD`, `SCHEMA_INVALID_FIELD`, `BUNDLE_MALFORMED`, `MALFORMED_BUNDLE` | Bundle structure is invalid or missing required fields |
| `MISSING_RECORD` | `OUTCOME_MISSING`, `TRAIL_LINKAGE_MISSING`, `EMPTY_OR_MISSING_RECORDS` | Required records are absent |
| `AUTHORIZATION_MISMATCH` | `AUTHORIZATION_EXECUTION_MISMATCH` | Execution action without prior authorization |
| `UNKNOWN` | All other codes | Unclassified failure |

---

## Sample JSON Report

```json
{
  "batchLabel": "audit-2026-q1",
  "verifiedAt": "2026-01-15T12:00:00.000Z",
  "generatedAt": "2026-01-15T12:00:01.000Z",
  "summary": {
    "totalCount": 3,
    "passedCount": 2,
    "failedCount": 1,
    "failFastTriggered": false
  },
  "failureSummary": {
    "totalFailed": 1,
    "byClass": {
      "CHAIN_BREAK": 0,
      "MANIFEST_MISMATCH": 0,
      "TAMPERED_PAYLOAD": 1,
      "UNSUPPORTED_VERSION": 0,
      "MALFORMED_BUNDLE": 0,
      "MISSING_RECORD": 0,
      "HASH_MISMATCH": 0,
      "AUTHORIZATION_MISMATCH": 0,
      "UNKNOWN": 0
    },
    "failedIndices": [2]
  },
  "results": [
    {
      "index": 2,
      "chainId": "session-xyz",
      "status": "FAIL",
      "code": "HASH_MISMATCH",
      "reason": "record_hash mismatch at index 2",
      "batchFailureClass": "TAMPERED_PAYLOAD",
      "reasonCodes": ["PAYLOAD_HASH_MISMATCH"]
    }
  ]
}
```

---

## What this proves

- A set of bundles can be verified against the same offline, deterministic rules as individual verification
- Failures are classified into stable categories for programmatic processing
- Audit reports are reproducible and contain no sensitive runtime state

## What this does not prove

- GPU-accelerated verification
- Real-time monitoring
- Enterprise-grade streaming ingestion
- AI factory runtime integration
- Cloud-native audit service

---

## Protocol boundary

This module:
- Uses only the existing `verifyBasicBundle` function — no new verification semantics
- Holds no state between calls
- Makes no network calls
- Writes no files
- Requires no database

---

## Tests

See `packages/verifier-basic/tests/batch-verification.test.ts` for:
- All valid bundles pass
- Mixed valid/invalid produce correct counts
- Failure classification is deterministic
- Markdown and JSON audit reports contain expected fields
- failFast stops at first failure
- Tool-call-wrapper demo fixtures verify in batch
- Null/undefined bundles classified as MALFORMED_BUNDLE
