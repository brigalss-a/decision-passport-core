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
  | "CLAIM_EXPIRED"
  | "CLAIM_REVOKED"
  | "CLAIM_NONCE_REUSED"
  | "CLAIM_PAYLOAD_MISMATCH"
  | "OUTCOME_MISSING"
  | "OUTCOME_STATUS_INVALID"
  | "OUTCOME_LINKAGE_MISMATCH"
  | "TRAIL_LINKAGE_MISSING"
  | "TRAIL_PAYLOAD_MISMATCH"
  | "PASSPORT_REVOKED"
  | "PASSPORT_SUPERSEDED"
  | "BUNDLE_MALFORMED";

export type VerifierFailureClass =
  | "success"
  | "schema"
  | "version"
  | "integrity"
  | "order"
  | "authorization"
  | "claim"
  | "outcome"
  | "trail"
  | "semantic";

export type AuthorizationStatus = "AUTHORIZED" | "NOT_AUTHORIZED" | "NOT_EVALUATED";

export type PayloadBindingStatus = "MATCHED" | "MISMATCH" | "NOT_PRESENT" | "NOT_EVALUATED";

export type RuntimeClaimStatusView =
  | "VALID"
  | "EXPIRED"
  | "REVOKED"
  | "NONCE_REUSED"
  | "PAYLOAD_MISMATCH"
  | "MALFORMED"
  | "NOT_PRESENT";

export type OutcomeLinkageStatus = "LINKED" | "MISSING" | "INVALID" | "MISMATCH" | "NOT_PRESENT";

export type RevocationStatus = "CLEAR" | "REVOKED" | "NOT_DECLARED";

export type SupersessionStatus = "CLEAR" | "SUPERSEDED" | "NOT_DECLARED";

export type TrailLinkageStatus = "LINKED" | "MISSING" | "PAYLOAD_MISMATCH" | "NOT_PRESENT";

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
  | "CLAIM_EXPIRED"
  | "CLAIM_REVOKED"
  | "CLAIM_NONCE_REUSED"
  | "CLAIM_PAYLOAD_MISMATCH"
  | "OUTCOME_MISSING"
  | "OUTCOME_STATUS_INVALID"
  | "OUTCOME_LINKAGE_MISMATCH"
  | "TRAIL_LINKAGE_MISSING"
  | "TRAIL_PAYLOAD_MISMATCH"
  | "PASSPORT_REVOKED"
  | "PASSPORT_SUPERSEDED"
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
  authorization_status: AuthorizationStatus;
  payload_binding_status: PayloadBindingStatus;
  runtime_claim_status: RuntimeClaimStatusView;
  outcome_linkage_status: OutcomeLinkageStatus;
  revocation_status: RevocationStatus;
  supersession_status: SupersessionStatus;
  trail_linkage_status: TrailLinkageStatus;
  tamperFindings?: TamperFinding[];
  nextSteps?: string[];
}
