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
  id: string;
  chain_id: string;
  sequence: number;
  timestamp_utc: string;
  actor_id: string;
  actor_type: ActorType;
  action_type: ActionType;
  payload: Record<string, unknown>;
  payload_hash: string;
  prev_hash: string;
  record_hash: string;
  metadata?: Record<string, unknown>;
}

export interface ChainManifest {
  chain_id: string;
  record_count: number;
  first_record_id: string;
  last_record_id: string;
  chain_hash: string;
}

export interface BasicProofBundle {
  bundle_version: "1.4-basic";
  exported_at_utc: string;
  passport_records: PassportRecord[];
  manifest: ChainManifest;
}
