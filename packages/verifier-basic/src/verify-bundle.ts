import type { BasicProofBundle } from "@decision-passport/core";
import type { BasicVerifierResult } from "./types.js";
import { verifyChain } from "@decision-passport/core";

export function verifyBasicBundle(bundle: BasicProofBundle): BasicVerifierResult {
  const checks: BasicVerifierResult["checks"] = [];

  const chainResult = verifyChain(bundle.passport_records);
  checks.push({
    name: "chain_integrity",
    passed: chainResult.valid,
    message: chainResult.error
  });

  if (bundle.passport_records.length > 0) {
    const manifestMatch =
      bundle.manifest.chain_hash ===
      bundle.passport_records[bundle.passport_records.length - 1].record_hash;

    checks.push({
      name: "manifest_chain_hash",
      passed: manifestMatch,
      message: manifestMatch ? undefined : "Manifest chain_hash mismatch"
    });
  }

  return {
    status: checks.every((c) => c.passed) ? "PASS" : "FAIL",
    checks
  };
}
