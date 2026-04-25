/**
 * Batch Verification + Audit Reports
 *
 * Wraps the canonical verifyBasicBundle to verify many bundles in one call,
 * classify failures deterministically, and produce JSON or Markdown reports.
 *
 * Protocol boundary: no DB, Redis, network, GPU, or cloud dependency.
 */

import type { BasicProofBundle } from "@decision-passport/core";
import { verifyBasicBundle } from "./verify-bundle.js";
import type { BasicVerifierResult, VerifierCode, VerifierFailureClass } from "./types.js";

// ─── Batch Types ─────────────────────────────────────────────────────────────

export type BatchFailureClass =
  | "CHAIN_BREAK"
  | "MANIFEST_MISMATCH"
  | "TAMPERED_PAYLOAD"
  | "UNSUPPORTED_VERSION"
  | "MALFORMED_BUNDLE"
  | "MISSING_RECORD"
  | "HASH_MISMATCH"
  | "AUTHORIZATION_MISMATCH"
  | "UNKNOWN";

export interface BatchVerificationOptions {
  /** Stop processing after the first FAIL result. Default: false */
  failFast?: boolean;
  /** Human-readable label for the batch, used in audit reports */
  label?: string;
}

export interface BundleVerificationResult {
  /** 0-based index in the input array */
  index: number;
  /** Optional per-bundle label (from options.labels array if provided) */
  label?: string;
  /** chain_id extracted from the first record, when available */
  chainId?: string;
  /** Full verifier result for this bundle */
  result: BasicVerifierResult;
  /** Classified failure reason (only present when result.status === "FAIL") */
  batchFailureClass?: BatchFailureClass;
}

export interface VerificationFailureSummary {
  totalFailed: number;
  byClass: Record<BatchFailureClass, number>;
  failedIndices: number[];
}

export interface BatchVerificationReport {
  batchLabel?: string;
  verifiedAt: string;
  totalCount: number;
  passedCount: number;
  failedCount: number;
  /** True when failFast was triggered and verification stopped early */
  failFastTriggered: boolean;
  results: BundleVerificationResult[];
  failureSummary: VerificationFailureSummary;
}

export type VerificationAuditReportFormat = "json" | "markdown";

export interface VerificationAuditReportOptions {
  /** Output format. Default: "json" */
  format?: VerificationAuditReportFormat;
  /** Include per-bundle detail for passing bundles. Default: false */
  includePassedDetails?: boolean;
}

export interface VerificationAuditArtifact {
  format: VerificationAuditReportFormat;
  /** Serialized JSON string or Markdown text */
  content: string;
  generatedAt: string;
}

// ─── Failure Classification ───────────────────────────────────────────────────

const VERIFIER_CODE_TO_BATCH_CLASS: Partial<Record<VerifierCode, BatchFailureClass>> = {
  SCHEMA_MISSING_FIELD: "MALFORMED_BUNDLE",
  SCHEMA_INVALID_FIELD: "MALFORMED_BUNDLE",
  VERSION_UNSUPPORTED: "UNSUPPORTED_VERSION",
  PROFILE_UNSUPPORTED: "UNSUPPORTED_VERSION",
  HASH_MISMATCH: "HASH_MISMATCH",
  CHAIN_BROKEN: "CHAIN_BREAK",
  ORDER_INVALID: "CHAIN_BREAK",
  AUTHORIZATION_EXECUTION_MISMATCH: "AUTHORIZATION_MISMATCH",
  CLAIM_PAYLOAD_MISMATCH: "TAMPERED_PAYLOAD",
  OUTCOME_LINKAGE_MISMATCH: "MANIFEST_MISMATCH",
  TRAIL_PAYLOAD_MISMATCH: "TAMPERED_PAYLOAD",
  OUTCOME_MISSING: "MISSING_RECORD",
  TRAIL_LINKAGE_MISSING: "MISSING_RECORD",
  BUNDLE_MALFORMED: "MALFORMED_BUNDLE",
};

const REASON_CODE_PREFIX_TO_BATCH_CLASS: Array<[string, BatchFailureClass]> = [
  ["UNSUPPORTED_BUNDLE_VERSION", "UNSUPPORTED_VERSION"],
  ["CHAIN_INTEGRITY_FAILED", "CHAIN_BREAK"],
  ["MANIFEST_HASH_MISMATCH", "MANIFEST_MISMATCH"],
  ["PAYLOAD_HASH_MISMATCH", "TAMPERED_PAYLOAD"],
  ["PREV_HASH_MISMATCH", "CHAIN_BREAK"],
  ["SEQUENCE_MISMATCH", "CHAIN_BREAK"],
  ["MALFORMED_BUNDLE", "MALFORMED_BUNDLE"],
  ["EMPTY_OR_MISSING_RECORDS", "MISSING_RECORD"],
];

function classifyResult(result: BasicVerifierResult): BatchFailureClass {
  // First try verifier code (most authoritative for schema/version/auth errors)
  const fromCode = VERIFIER_CODE_TO_BATCH_CLASS[result.code];
  if (fromCode) return fromCode;
  // Then try reason codes (more specific for integrity failures)
  for (const reasonCode of result.reasonCodes) {
    for (const [prefix, cls] of REASON_CODE_PREFIX_TO_BATCH_CLASS) {
      if (reasonCode.startsWith(prefix)) {
        return cls;
      }
    }
  }
  // Fall back to failure_class
  const fc: VerifierFailureClass = result.failure_class;
  if (fc === "integrity") return "CHAIN_BREAK";
  if (fc === "schema") return "MALFORMED_BUNDLE";
  if (fc === "version") return "UNSUPPORTED_VERSION";
  if (fc === "authorization") return "AUTHORIZATION_MISMATCH";
  return "UNKNOWN";
}

function emptyFailureSummary(): VerificationFailureSummary {
  return {
    totalFailed: 0,
    byClass: {
      CHAIN_BREAK: 0,
      MANIFEST_MISMATCH: 0,
      TAMPERED_PAYLOAD: 0,
      UNSUPPORTED_VERSION: 0,
      MALFORMED_BUNDLE: 0,
      MISSING_RECORD: 0,
      HASH_MISMATCH: 0,
      AUTHORIZATION_MISMATCH: 0,
      UNKNOWN: 0,
    },
    failedIndices: [],
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Verify many BasicProofBundles in one call.
 *
 * Uses the canonical `verifyBasicBundle` — no semantics are duplicated.
 * Does not call any network, database, or cloud service.
 */
export function verifyBundleBatch(
  bundles: readonly unknown[],
  options?: BatchVerificationOptions,
): BatchVerificationReport {
  const failFast = options?.failFast ?? false;
  const batchLabel = options?.label;
  const verifiedAt = new Date().toISOString();

  const results: BundleVerificationResult[] = [];
  const failureSummary = emptyFailureSummary();
  let passedCount = 0;
  let failedCount = 0;
  let failFastTriggered = false;

  for (let i = 0; i < bundles.length; i++) {
    const bundle = bundles[i];
    const result = verifyBasicBundle(bundle);

    // Extract chain_id from first passport record if available
    let chainId: string | undefined;
    try {
      const b = bundle as BasicProofBundle;
      chainId = b?.passport_records?.[0]?.chain_id;
    } catch {
      // Malformed — chainId stays undefined
    }

    const entry: BundleVerificationResult = {
      index: i,
      chainId,
      result,
    };

    if (result.status === "FAIL") {
      const cls = classifyResult(result);
      entry.batchFailureClass = cls;
      failedCount++;
      failureSummary.totalFailed++;
      failureSummary.byClass[cls]++;
      failureSummary.failedIndices.push(i);
    } else {
      passedCount++;
    }

    results.push(entry);

    if (failFast && result.status === "FAIL") {
      failFastTriggered = true;
      // Fill remaining as not-evaluated (do not add false pass results)
      break;
    }
  }

  return {
    batchLabel,
    verifiedAt,
    totalCount: bundles.length,
    passedCount,
    failedCount,
    failFastTriggered,
    results,
    failureSummary,
  };
}

/**
 * Classify failures from a set of BundleVerificationResults.
 *
 * Deterministic — same inputs always produce same output.
 */
export function classifyVerificationFailures(
  results: readonly BundleVerificationResult[],
): VerificationFailureSummary {
  const summary = emptyFailureSummary();
  for (const entry of results) {
    if (entry.result.status === "FAIL") {
      const cls = entry.batchFailureClass ?? classifyResult(entry.result);
      summary.totalFailed++;
      summary.byClass[cls]++;
      summary.failedIndices.push(entry.index);
    }
  }
  return summary;
}

/**
 * Produce a JSON or Markdown audit report from a BatchVerificationReport.
 *
 * JSON: machine-readable structured output.
 * Markdown: human-readable summary with failure breakdown.
 */
export function createVerificationAuditReport(
  report: BatchVerificationReport,
  options?: VerificationAuditReportOptions,
): VerificationAuditArtifact {
  const format = options?.format ?? "json";
  const includePassedDetails = options?.includePassedDetails ?? false;
  const generatedAt = new Date().toISOString();

  if (format === "json") {
    const payload = {
      batchLabel: report.batchLabel,
      verifiedAt: report.verifiedAt,
      generatedAt,
      summary: {
        totalCount: report.totalCount,
        passedCount: report.passedCount,
        failedCount: report.failedCount,
        failFastTriggered: report.failFastTriggered,
      },
      failureSummary: report.failureSummary,
      results: report.results
        .filter((r) => includePassedDetails || r.result.status === "FAIL")
        .map((r) => ({
          index: r.index,
          chainId: r.chainId,
          status: r.result.status,
          code: r.result.code,
          reason: r.result.reason,
          batchFailureClass: r.batchFailureClass,
          reasonCodes: r.result.reasonCodes,
        })),
    };
    return { format, content: JSON.stringify(payload, null, 2), generatedAt };
  }

  // Markdown format
  const label = report.batchLabel ? `**${report.batchLabel}**` : "Batch";
  const passRate =
    report.totalCount > 0
      ? ((report.passedCount / report.totalCount) * 100).toFixed(1)
      : "0.0";

  const failureRows = Object.entries(report.failureSummary.byClass)
    .filter(([, count]) => count > 0)
    .map(([cls, count]) => `| ${cls} | ${count} |`)
    .join("\n");

  const failedDetails = report.results
    .filter((r) => r.result.status === "FAIL")
    .map(
      (r) =>
        `- **Index ${r.index}**${r.chainId ? ` (chain: \`${r.chainId}\`)` : ""}: \`${r.batchFailureClass ?? "UNKNOWN"}\` — ${r.result.reason}`,
    )
    .join("\n");

  const passedSection =
    includePassedDetails && report.passedCount > 0
      ? `\n### Passed bundles\n\n${report.results
          .filter((r) => r.result.status === "PASS")
          .map((r) => `- **Index ${r.index}**${r.chainId ? ` (chain: \`${r.chainId}\`)` : ""}: PASS`)
          .join("\n")}\n`
      : "";

  const failFastNote = report.failFastTriggered
    ? `\n> **Note**: failFast was triggered. Only the first ${report.results.length} of ${report.totalCount} bundles were evaluated.\n`
    : "";

  const md = `# Decision Passport — Batch Verification Report

${label} · Verified at: \`${report.verifiedAt}\` · Generated at: \`${generatedAt}\`

## Summary

| Metric | Value |
|---|---|
| Total bundles | ${report.totalCount} |
| Passed | ${report.passedCount} |
| Failed | ${report.failedCount} |
| Pass rate | ${passRate}% |
${failFastNote}
## Failure breakdown

${failureRows.length > 0 ? `| Failure class | Count |\n|---|---|\n${failureRows}` : "_No failures._"}

${failedDetails.length > 0 ? `## Failed bundles\n\n${failedDetails}` : ""}
${passedSection}
---

_Generated by \`@decision-passport/verifier-basic\` — offline, no network, no database._
`;

  return { format, content: md, generatedAt };
}
