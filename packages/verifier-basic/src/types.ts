import type { TamperFinding } from "@decision-passport/core";

export type BasicVerifierStatus = "PASS" | "FAIL";

export type BasicVerificationReasonCode =
  | "UNSUPPORTED_BUNDLE_VERSION"
  | "CHAIN_INTEGRITY_FAILED"
  | "MANIFEST_HASH_MISMATCH"
  | "PAYLOAD_HASH_MISMATCH"
  | "PREV_HASH_MISMATCH"
  | "SEQUENCE_MISMATCH"
  | "MALFORMED_BUNDLE"
  | "EMPTY_OR_MISSING_RECORDS"
  | "UNKNOWN_VERIFICATION_ERROR";

export interface BasicVerificationCheck {
  name: string;
  passed: boolean;
  message?: string;
}

export interface BasicVerifierResult {
  status: BasicVerifierStatus;
  summary: string;
  checks: BasicVerificationCheck[];
  reasonCodes: BasicVerificationReasonCode[];
  tamperFindings?: TamperFinding[];
  nextSteps?: string[];
}
