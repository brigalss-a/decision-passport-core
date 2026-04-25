import { verifyBasicBundle } from "@decision-passport/verifier-basic";
import type { BasicProofBundle } from "@decision-passport/core";
import type { ToolCallVerification } from "./types.js";

/**
 * Verify a tool-call proof bundle using the core offline verifier.
 *
 * The verification result is mapped to a simple { ok, errors, warnings }
 * shape for convenience, while the full verifierResult is also exposed for
 * advanced consumers.
 *
 * This is a pure, stateless function with no external network calls.
 */
export function verifyToolCallReceipt(bundle: BasicProofBundle): ToolCallVerification {
  const result = verifyBasicBundle(bundle);

  const errors: string[] = [];
  const warnings: string[] = [];

  if (result.status !== "PASS") {
    // Surface every failed check as an error
    for (const check of result.checks) {
      if (!check.passed) {
        errors.push(check.message ?? check.name);
      }
    }
    // Surface auditor findings
    for (const finding of result.auditor_findings) {
      if (finding.verdict === "INVALID") {
        errors.push(`[${finding.code}] ${finding.reason}`);
      }
    }
    // If somehow we ended up with no errors logged but status is FAIL, add summary
    if (errors.length === 0) {
      errors.push(result.summary);
    }
  }

  // Warn on semantic gaps (optional extensions not yet present)
  if (result.authorization_status === "NOT_EVALUATED") {
    warnings.push(
      "authorization_status is NOT_EVALUATED: the bundle uses custom tool-call action types that the basic verifier does not semantically interpret. Chain integrity is verified.",
    );
  }

  return {
    ok: result.status === "PASS",
    errors,
    warnings,
    verifierResult: result,
  };
}
