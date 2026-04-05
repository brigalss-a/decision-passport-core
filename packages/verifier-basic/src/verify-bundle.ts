import { explainTamper, verifyChain } from "@decision-passport/core";
import type { BasicProofBundle } from "@decision-passport/core";
import type {
  BasicVerifierResult,
  BasicVerificationCheck,
  BasicVerificationReasonCode,
} from "./types.js";

export function verifyBasicBundle(bundle: unknown): BasicVerifierResult {
  const malformed = validateBundleShape(bundle);
  if (malformed) {
    return failWith(
      [
        {
          name: "bundle_structure",
          passed: false,
          message: malformed,
        },
      ],
      ["MALFORMED_BUNDLE"],
      "Verification failed because bundle structure is malformed.",
      undefined,
      [
        "Validate JSON parsing and required top-level fields.",
        "Ensure bundle_version, passport_records, and manifest are present.",
      ],
    );
  }

  const typedBundle = bundle as BasicProofBundle;
  const records = typedBundle.passport_records;
  const manifest = typedBundle.manifest;

  if (records.length === 0) {
    return failWith(
      [
        {
          name: "records_present",
          passed: false,
          message: "Bundle has no records.",
        },
      ],
      ["EMPTY_OR_MISSING_RECORDS"],
      "Verification failed because bundle has no records.",
      undefined,
      [
        "Confirm export step included at least one material action record.",
        "Re-export bundle and re-run verification.",
      ],
    );
  }

  const checks: BasicVerificationCheck[] = [];
  const reasonCodes = new Set<BasicVerificationReasonCode>();

  const chainResult = verifyChain(records);
  checks.push({
    name: "chain_integrity",
    passed: chainResult.valid,
    message: chainResult.error,
  });

  if (!chainResult.valid) {
    reasonCodes.add("CHAIN_INTEGRITY_FAILED");
  }

  const manifestMatch =
    manifest.chain_hash ===
    records[records.length - 1].record_hash;

  checks.push({
    name: "manifest_chain_hash",
    passed: manifestMatch,
    message: manifestMatch ? undefined : "Manifest chain_hash mismatch",
  });

  if (!manifestMatch) {
    reasonCodes.add("MANIFEST_HASH_MISMATCH");
  }

  const passed = checks.every((c) => c.passed);
  if (passed) {
    return {
      status: "PASS",
      summary: "Verification passed. Bundle integrity checks succeeded.",
      checks,
      reasonCodes: [],
      nextSteps: [
        "Preserve original bundle bytes and checksums for future review.",
      ],
    };
  }

  const explanation = explainTamper(records, manifest);
  const mappedFromFindings = mapFindingCodes(explanation.findings);
  for (const code of mappedFromFindings) {
    reasonCodes.add(code);
  }

  if (reasonCodes.size === 0) {
    reasonCodes.add("UNKNOWN_VERIFICATION_ERROR");
  }

  return failWith(
    checks,
    [...reasonCodes],
    buildFailSummary([...reasonCodes]),
    explanation.findings,
    buildNextSteps([...reasonCodes]),
  );
}

function failWith(
  checks: BasicVerificationCheck[],
  reasonCodes: BasicVerificationReasonCode[],
  summary: string,
  tamperFindings?: BasicVerifierResult["tamperFindings"],
  nextSteps?: string[],
): BasicVerifierResult {
  return {
    status: "FAIL",
    summary,
    checks,
    reasonCodes,
    tamperFindings,
    nextSteps,
  };
}

function validateBundleShape(bundle: unknown): string | null {
  if (!isObject(bundle)) {
    return "Bundle must be an object.";
  }

  if (!Array.isArray(bundle.passport_records)) {
    return "Field passport_records must be an array.";
  }

  if (!isObject(bundle.manifest)) {
    return "Field manifest must be an object.";
  }

  if (typeof bundle.bundle_version !== "string") {
    return "Field bundle_version must be a string.";
  }

  if (typeof bundle.exported_at_utc !== "string") {
    return "Field exported_at_utc must be a string.";
  }

  const manifest = bundle.manifest;
  if (typeof manifest.chain_hash !== "string") {
    return "Field manifest.chain_hash must be a string.";
  }

  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mapFindingCodes(
  findings: readonly { kind: string }[],
): BasicVerificationReasonCode[] {
  const codes = new Set<BasicVerificationReasonCode>();

  for (const finding of findings) {
    if (finding.kind === "payload_hash") {
      codes.add("PAYLOAD_HASH_MISMATCH");
    } else if (finding.kind === "prev_hash") {
      codes.add("PREV_HASH_MISMATCH");
    } else if (finding.kind === "sequence") {
      codes.add("SEQUENCE_MISMATCH");
    } else if (finding.kind === "manifest_chain_hash") {
      codes.add("MANIFEST_HASH_MISMATCH");
    }
  }

  return [...codes];
}

function buildFailSummary(reasonCodes: BasicVerificationReasonCode[]): string {
  const parts: string[] = [];
  if (reasonCodes.includes("MALFORMED_BUNDLE")) {
    parts.push("bundle structure is malformed");
  }
  if (reasonCodes.includes("EMPTY_OR_MISSING_RECORDS")) {
    parts.push("bundle has no records");
  }
  if (reasonCodes.includes("CHAIN_INTEGRITY_FAILED")) {
    parts.push("record hash chain integrity failed");
  }
  if (reasonCodes.includes("MANIFEST_HASH_MISMATCH")) {
    parts.push("manifest chain hash does not match terminal record");
  }
  if (reasonCodes.includes("PAYLOAD_HASH_MISMATCH")) {
    parts.push("payload hash mismatch detected");
  }
  if (reasonCodes.includes("PREV_HASH_MISMATCH")) {
    parts.push("prev_hash linkage mismatch detected");
  }
  if (reasonCodes.includes("SEQUENCE_MISMATCH")) {
    parts.push("record sequence mismatch detected");
  }

  if (parts.length === 0) {
    return "Verification failed due to an unknown integrity or structure error.";
  }

  return `Verification failed because ${parts.join("; ")}.`;
}

function buildNextSteps(reasonCodes: BasicVerificationReasonCode[]): string[] {
  const steps = new Set<string>();

  if (reasonCodes.includes("MALFORMED_BUNDLE")) {
    steps.add("Validate required top-level fields and JSON shape before verification.");
  }

  if (reasonCodes.includes("EMPTY_OR_MISSING_RECORDS")) {
    steps.add("Confirm export pipeline included material action records.");
  }

  if (reasonCodes.includes("CHAIN_INTEGRITY_FAILED")) {
    steps.add("Inspect chain_integrity check details and failing record index.");
  }

  if (reasonCodes.includes("PREV_HASH_MISMATCH") || reasonCodes.includes("SEQUENCE_MISMATCH")) {
    steps.add("Inspect record ordering and prev_hash linkage across adjacent records.");
  }

  if (reasonCodes.includes("PAYLOAD_HASH_MISMATCH")) {
    steps.add("Inspect payload mutation after record creation.");
  }

  if (reasonCodes.includes("MANIFEST_HASH_MISMATCH")) {
    steps.add("Confirm manifest chain_hash matches final record_hash.");
  }

  steps.add("Compare with a known-good bundle artifact if available.");
  return [...steps];
}
