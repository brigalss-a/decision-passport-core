/**
 * Tool Call Passport Wrapper — record builders.
 *
 * Maps the tool-call lifecycle into existing Decision Passport ActionType
 * semantics. All records chain correctly using the core hash-chain protocol.
 *
 * ActionType mapping
 * ------------------
 * TOOL_CALL_REQUESTED        → "AI_RECOMMENDATION"
 *   (tool_call_phase: "REQUESTED" in payload distinguishes it from a pure recommendation)
 *
 * TOOL_CALL_AUTHORIZED       → "POLICY_APPROVAL_GRANTED" (type: policy / system / none)
 *                            → "HUMAN_APPROVAL_GRANTED"  (type: human)
 *
 * TOOL_CALL_DENIED           → "POLICY_EXCEPTION"        (type: policy / system / none)
 *                            → "HUMAN_APPROVAL_REJECTED" (type: human)
 *
 * TOOL_CALL_EXECUTION_STARTED   → "EXECUTION_PENDING"
 * TOOL_CALL_EXECUTION_SUCCEEDED → "EXECUTION_SUCCEEDED"
 * TOOL_CALL_EXECUTION_FAILED    → "EXECUTION_FAILED"
 * TOOL_CALL_EXECUTION_ABORTED   → "EXECUTION_ABORTED"
 */

import { randomUUID } from "node:crypto";
import { GENESIS_HASH, hashCanonical, hashPayload } from "@decision-passport/core";
import type { ActionType, ActorType, PassportRecord } from "@decision-passport/core";
import type { ToolCallActor, ToolCallAuthorization, ToolCallTool } from "./types.js";

// ---------------------------------------------------------------------------
// Internal record builder (supports injectable clock for testing)
// ---------------------------------------------------------------------------

function buildRecord(params: {
  chainId: string;
  sequence: number;
  prevHash: string;
  actorId: string;
  actorType: ActorType;
  actionType: ActionType;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  now: () => Date;
}): PassportRecord {
  const id = randomUUID();
  const timestamp_utc = params.now().toISOString();
  const payload_hash = hashPayload(params.payload);

  const withoutHash = {
    id,
    chain_id: params.chainId,
    sequence: params.sequence,
    timestamp_utc,
    actor_id: params.actorId,
    actor_type: params.actorType,
    action_type: params.actionType,
    payload: params.payload,
    payload_hash,
    prev_hash: params.prevHash,
    ...(params.metadata ? { metadata: params.metadata } : {}),
  };

  return {
    ...withoutHash,
    record_hash: hashCanonical(withoutHash),
  };
}

// ---------------------------------------------------------------------------
// Lifecycle record creators
// ---------------------------------------------------------------------------

export interface RequestedRecordParams {
  chainId: string;
  actor: ToolCallActor;
  tool: ToolCallTool;
  inputHash: string;
  correlationId?: string;
  now: () => Date;
}

export function createRequestedRecord(p: RequestedRecordParams): PassportRecord {
  return buildRecord({
    chainId: p.chainId,
    sequence: 0,
    prevHash: GENESIS_HASH,
    actorId: p.actor.id,
    actorType: mapActorType(p.actor.type),
    actionType: "AI_RECOMMENDATION",
    payload: {
      tool_call_phase: "REQUESTED",
      tool_name: p.tool.name,
      ...(p.tool.version !== undefined ? { tool_version: p.tool.version } : {}),
      ...(p.tool.provider !== undefined ? { tool_provider: p.tool.provider } : {}),
      input_hash: p.inputHash,
      ...(p.correlationId !== undefined ? { correlation_id: p.correlationId } : {}),
    },
    now: p.now,
  });
}

export interface AuthorizedRecordParams {
  chainId: string;
  prevRecord: PassportRecord;
  authorization: ToolCallAuthorization;
  receiptId: string;
  now: () => Date;
}

export function createAuthorizedRecord(p: AuthorizedRecordParams): PassportRecord {
  const actionType: ActionType =
    p.authorization.type === "human" ? "HUMAN_APPROVAL_GRANTED" : "POLICY_APPROVAL_GRANTED";

  return buildRecord({
    chainId: p.chainId,
    sequence: p.prevRecord.sequence + 1,
    prevHash: p.prevRecord.record_hash,
    actorId: p.authorization.approvedBy ?? "authorization-engine",
    actorType: p.authorization.type === "human" ? "human" : "policy",
    actionType,
    payload: {
      tool_call_phase: "AUTHORIZED",
      authorization_type: p.authorization.type,
      ...(p.authorization.policyVersion !== undefined
        ? { policy_version: p.authorization.policyVersion }
        : {}),
      ...(p.authorization.approvedBy !== undefined
        ? { approved_by: p.authorization.approvedBy }
        : {}),
      ...(p.authorization.reason !== undefined ? { reason: p.authorization.reason } : {}),
      ...(p.authorization.decisionId !== undefined
        ? { decision_id: p.authorization.decisionId }
        : {}),
      receipt_id: p.receiptId,
    },
    now: p.now,
  });
}

export interface DeniedRecordParams {
  chainId: string;
  prevRecord: PassportRecord;
  authorization: ToolCallAuthorization;
  receiptId: string;
  now: () => Date;
}

export function createDeniedRecord(p: DeniedRecordParams): PassportRecord {
  const actionType: ActionType =
    p.authorization.type === "human" ? "HUMAN_APPROVAL_REJECTED" : "POLICY_EXCEPTION";

  return buildRecord({
    chainId: p.chainId,
    sequence: p.prevRecord.sequence + 1,
    prevHash: p.prevRecord.record_hash,
    actorId: p.authorization.approvedBy ?? "authorization-engine",
    actorType: p.authorization.type === "human" ? "human" : "policy",
    actionType,
    payload: {
      tool_call_phase: "DENIED",
      authorization_type: p.authorization.type,
      ...(p.authorization.reason !== undefined ? { reason: p.authorization.reason } : {}),
      ...(p.authorization.decisionId !== undefined
        ? { decision_id: p.authorization.decisionId }
        : {}),
      receipt_id: p.receiptId,
    },
    now: p.now,
  });
}

export interface ExecutionStartedRecordParams {
  chainId: string;
  prevRecord: PassportRecord;
  tool: ToolCallTool;
  inputHash: string;
  receiptId: string;
  now: () => Date;
}

export function createExecutionStartedRecord(p: ExecutionStartedRecordParams): PassportRecord {
  return buildRecord({
    chainId: p.chainId,
    sequence: p.prevRecord.sequence + 1,
    prevHash: p.prevRecord.record_hash,
    actorId: "tool-call-wrapper",
    actorType: "system",
    actionType: "EXECUTION_PENDING",
    payload: {
      tool_call_phase: "EXECUTION_STARTED",
      tool_name: p.tool.name,
      ...(p.tool.version !== undefined ? { tool_version: p.tool.version } : {}),
      input_hash: p.inputHash,
      receipt_id: p.receiptId,
    },
    now: p.now,
  });
}

export interface ExecutionSucceededRecordParams {
  chainId: string;
  prevRecord: PassportRecord;
  outputHash: string;
  durationMs: number;
  receiptId: string;
  now: () => Date;
}

export function createExecutionSucceededRecord(
  p: ExecutionSucceededRecordParams,
): PassportRecord {
  return buildRecord({
    chainId: p.chainId,
    sequence: p.prevRecord.sequence + 1,
    prevHash: p.prevRecord.record_hash,
    actorId: "tool-call-wrapper",
    actorType: "system",
    actionType: "EXECUTION_SUCCEEDED",
    payload: {
      tool_call_phase: "EXECUTION_SUCCEEDED",
      output_hash: p.outputHash,
      duration_ms: p.durationMs,
      receipt_id: p.receiptId,
    },
    now: p.now,
  });
}

export interface ExecutionFailedRecordParams {
  chainId: string;
  prevRecord: PassportRecord;
  errorHash: string;
  normalizedErrorName: string;
  normalizedErrorMessage: string;
  durationMs: number;
  receiptId: string;
  now: () => Date;
}

export function createExecutionFailedRecord(p: ExecutionFailedRecordParams): PassportRecord {
  return buildRecord({
    chainId: p.chainId,
    sequence: p.prevRecord.sequence + 1,
    prevHash: p.prevRecord.record_hash,
    actorId: "tool-call-wrapper",
    actorType: "system",
    actionType: "EXECUTION_FAILED",
    payload: {
      tool_call_phase: "EXECUTION_FAILED",
      error_hash: p.errorHash,
      error_name: p.normalizedErrorName,
      error_message: p.normalizedErrorMessage,
      duration_ms: p.durationMs,
      receipt_id: p.receiptId,
    },
    now: p.now,
  });
}

export interface ExecutionAbortedRecordParams {
  chainId: string;
  prevRecord: PassportRecord;
  reason: string;
  durationMs: number;
  receiptId: string;
  now: () => Date;
}

export function createExecutionAbortedRecord(p: ExecutionAbortedRecordParams): PassportRecord {
  return buildRecord({
    chainId: p.chainId,
    sequence: p.prevRecord.sequence + 1,
    prevHash: p.prevRecord.record_hash,
    actorId: "tool-call-wrapper",
    actorType: "system",
    actionType: "EXECUTION_ABORTED",
    payload: {
      tool_call_phase: "EXECUTION_ABORTED",
      reason: p.reason,
      duration_ms: p.durationMs,
      receipt_id: p.receiptId,
    },
    now: p.now,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapActorType(type: string): ActorType {
  switch (type) {
    case "human":
      return "human";
    case "ai_agent":
      return "ai_agent";
    case "system":
    case "service":
      return "system";
    default:
      return "system";
  }
}
