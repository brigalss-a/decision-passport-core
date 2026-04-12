import type { TamperFinding } from "@decision-passport/core";

export type BasicVerifierStatus = "PASS" | "FAIL";
export type VerifierVerdict = "VALID" | "INVALID";

export type VerifierCode =
  | "SUCCESS_VALID"
  | "SCHEMA_MISSING_FIELD"
  | "SCHEMA_INVALID_FIELD"
  | "VERSION_UNSUPPORTED"
  | "PROFILE_UNSUPPORTED"
  | "HASH_MISMATCH"
  | "CHAIN_BROKEN"
  | "ORDER_INVALID"
  | "AUTHORIZATION_EXECUTION_MISMATCH"
  | "SEMANTIC_INCONSISTENCY"
  | "BUNDLE_MALFORMED";

export type VerifierFailureClass =
  | "success"
  | "schema"
  | "version"
  | "integrity"
  | "order"
  | "authorization"
  | "semantic";

export interface AuditorFinding {
  verdict: VerifierVerdict;
  code: VerifierCode;
  location: string;
  reason: string;
  remediation_hint: string;
  failure_class: VerifierFailureClass;
}

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
  verdict: VerifierVerdict;
  code: VerifierCode;
  location: string;
  reason: string;
  remediation_hint: string;
  failure_class: VerifierFailureClass;
  auditor_findings: AuditorFinding[];
  checks: BasicVerificationCheck[];
  reasonCodes: BasicVerificationReasonCode[];
  tamperFindings?: TamperFinding[];
  nextSteps?: string[];
}
