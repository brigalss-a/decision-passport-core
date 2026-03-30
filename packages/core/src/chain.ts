import { randomUUID } from "crypto";
import { hashCanonical, hashPayload } from "./hashing.js";
import type { ActionType, ActorType, PassportRecord } from "./types.js";
import { ChainValidationError } from "./errors.js";

export const GENESIS_HASH =
  "GENESIS_0000000000000000000000000000000000000000000000000000000000000000";

export function createRecord(params: {
  chainId: string;
  lastRecord: PassportRecord | null;
  actorId: string;
  actorType: ActorType;
  actionType: ActionType;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): PassportRecord {
  const sequence = params.lastRecord ? params.lastRecord.sequence + 1 : 0;
  const prevHash = params.lastRecord ? params.lastRecord.record_hash : GENESIS_HASH;
  const payloadHash = hashPayload(params.payload);

  const recordWithoutHash = {
    id: randomUUID(),
    chain_id: params.chainId,
    sequence,
    timestamp_utc: new Date().toISOString(),
    actor_id: params.actorId,
    actor_type: params.actorType,
    action_type: params.actionType,
    payload: params.payload,
    payload_hash: payloadHash,
    prev_hash: prevHash,
    ...(params.metadata ? { metadata: params.metadata } : {})
  };

  return {
    ...recordWithoutHash,
    record_hash: hashCanonical(recordWithoutHash)
  };
}

export function verifyChain(records: PassportRecord[]): { valid: boolean; error?: string } {
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const expectedSequence = i;
    const expectedPrevHash = i === 0 ? GENESIS_HASH : records[i - 1].record_hash;

    if (record.sequence !== expectedSequence) {
      return { valid: false, error: `Sequence mismatch at index ${i}` };
    }

    if (record.prev_hash !== expectedPrevHash) {
      return { valid: false, error: `prev_hash mismatch at index ${i}` };
    }

    const { record_hash, ...rest } = record;
    const recomputed = hashCanonical(rest);
    if (recomputed !== record_hash) {
      return { valid: false, error: `record_hash mismatch at index ${i}` };
    }
  }
  return { valid: true };
}

export function assertValidChain(records: PassportRecord[]): void {
  const result = verifyChain(records);
  if (!result.valid) {
    throw new ChainValidationError(result.error ?? "Invalid chain");
  }
}
