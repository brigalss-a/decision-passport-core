export type ActionType =
  | "AI_RECOMMENDATION"
  | "HUMAN_APPROVAL_GRANTED"
  | "HUMAN_APPROVAL_REJECTED"
  | "POLICY_APPROVAL_GRANTED"
  | "EXECUTION_PENDING"
  | "EXECUTION_SUCCEEDED"
  | "EXECUTION_FAILED"
  | "EXECUTION_ABORTED"
  | "HUMAN_OVERRIDE"
  | "POLICY_EXCEPTION";

export type ActorType = "human" | "ai_agent" | "system" | "policy";

export interface PassportRecord {
  readonly id: string;
  readonly chain_id: string;
  readonly sequence: number;
  readonly timestamp_utc: string;
  readonly actor_id: string;
  readonly actor_type: ActorType;
  readonly action_type: ActionType;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly payload_hash: string;
  readonly prev_hash: string;
  readonly record_hash: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ChainManifest {
  readonly chain_id: string;
  readonly record_count: number;
  readonly first_record_id: string;
  readonly last_record_id: string;
  readonly chain_hash: string;
}

export interface BasicProofBundle {
  readonly bundle_version: "1.4-basic";
  readonly exported_at_utc: string;
  readonly passport_records: readonly PassportRecord[];
  readonly manifest: ChainManifest;
}

export interface DecisionTrailInitiatingRequest {
  readonly request_id: string;
  readonly summary: string;
  readonly submitted_by?: string;
  readonly submitted_at_utc?: string;
}

export interface DecisionTrailContextReference {
  readonly ref_id: string;
  readonly ref_type: string;
  readonly hash?: string;
  readonly uri?: string;
}

export interface DecisionTrailAlternative {
  readonly alternative_id: string;
  readonly summary: string;
  readonly selected?: boolean;
}

export interface DecisionTrailRejectedOption {
  readonly option_id: string;
  readonly reason: string;
}

export interface DecisionTrailEscalationEvent {
  readonly event_id: string;
  readonly reason: string;
  readonly trigger: string;
  readonly policy_basis?: string;
  readonly escalated_at_utc?: string;
}

export interface DecisionTrailApprovalCheckpoint {
  readonly approval_status: "APPROVED" | "REJECTED" | "PENDING";
  readonly approved_by: string;
  readonly approved_at_utc: string;
  readonly policy_ref?: string;
  readonly note?: string;
}

export interface DecisionTrail {
  readonly trail_version: "0.7.0-trail";
  readonly trail_id: string;
  readonly initiating_request: DecisionTrailInitiatingRequest;
  readonly context_references: readonly DecisionTrailContextReference[];
  readonly alternatives_considered: readonly DecisionTrailAlternative[];
  readonly rejected_options: readonly DecisionTrailRejectedOption[];
  readonly escalation_events: readonly DecisionTrailEscalationEvent[];
  readonly approval_checkpoint: DecisionTrailApprovalCheckpoint;
  readonly final_approved_payload: Readonly<Record<string, unknown>>;
  readonly linked_passport_id: string;
}

export type RuntimeClaimStatus = "ACTIVE" | "REVOKED" | "USED" | "EXPIRED";

export interface RuntimeClaim {
  readonly claim_id: string;
  readonly passport_id: string;
  readonly nonce: string;
  readonly issued_at_utc: string;
  readonly expires_at_utc: string;
  readonly payload_hash: string;
  readonly authority_ref: string;
  readonly claim_status: RuntimeClaimStatus;
  readonly single_use: boolean;
  readonly guard_version: "0.7.0-guard";
}

export type GuardDenyReason =
  | "AUTHORITY_MISSING"
  | "CLAIM_EXPIRED"
  | "CLAIM_REVOKED"
  | "NONCE_REUSED"
  | "PAYLOAD_HASH_MISMATCH"
  | "PASSPORT_NOT_AUTHORIZED"
  | "CLAIM_MALFORMED";
