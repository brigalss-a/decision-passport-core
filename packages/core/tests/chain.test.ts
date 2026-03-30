import { describe, expect, it } from "vitest";
import { createRecord, verifyChain, assertValidChain, GENESIS_HASH } from "../src/chain.js";

function buildChain(count: number) {
  const chainId = "test-chain";
  const records = [];
  let last = null;
  for (let i = 0; i < count; i++) {
    const record = createRecord({
      chainId,
      lastRecord: last,
      actorId: "agent-1",
      actorType: "ai_agent",
      actionType: "AI_RECOMMENDATION",
      payload: { step: i }
    });
    records.push(record);
    last = record;
  }
  return records;
}

describe("GENESIS_HASH", () => {
  it("starts with GENESIS_ and is the expected length", () => {
    expect(GENESIS_HASH).toMatch(/^GENESIS_[0]{64}$/);
  });
});

describe("createRecord", () => {
  it("creates a genesis record with sequence 0 and GENESIS prev_hash", () => {
    const record = createRecord({
      chainId: "chain-1",
      lastRecord: null,
      actorId: "human-1",
      actorType: "human",
      actionType: "HUMAN_APPROVAL_GRANTED",
      payload: { approved: true }
    });

    expect(record.sequence).toBe(0);
    expect(record.prev_hash).toBe(GENESIS_HASH);
    expect(record.chain_id).toBe("chain-1");
    expect(record.actor_id).toBe("human-1");
    expect(record.actor_type).toBe("human");
    expect(record.action_type).toBe("HUMAN_APPROVAL_GRANTED");
    expect(record.record_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(record.payload_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(record.id).toBeTruthy();
    expect(record.timestamp_utc).toBeTruthy();
  });

  it("increments sequence and chains prev_hash from previous record", () => {
    const first = createRecord({
      chainId: "chain-1",
      lastRecord: null,
      actorId: "agent-1",
      actorType: "ai_agent",
      actionType: "AI_RECOMMENDATION",
      payload: { step: 0 }
    });

    const second = createRecord({
      chainId: "chain-1",
      lastRecord: first,
      actorId: "human-1",
      actorType: "human",
      actionType: "HUMAN_APPROVAL_GRANTED",
      payload: { step: 1 }
    });

    expect(second.sequence).toBe(1);
    expect(second.prev_hash).toBe(first.record_hash);
  });

  it("includes optional metadata when provided", () => {
    const record = createRecord({
      chainId: "chain-1",
      lastRecord: null,
      actorId: "agent-1",
      actorType: "ai_agent",
      actionType: "AI_RECOMMENDATION",
      payload: { step: 0 },
      metadata: { source: "test" }
    });

    expect(record.metadata).toEqual({ source: "test" });
  });

  it("omits metadata field when not provided", () => {
    const record = createRecord({
      chainId: "chain-1",
      lastRecord: null,
      actorId: "agent-1",
      actorType: "ai_agent",
      actionType: "AI_RECOMMENDATION",
      payload: { step: 0 }
    });

    expect(record).not.toHaveProperty("metadata");
  });
});

describe("verifyChain", () => {
  it("returns valid for a correct single-record chain", () => {
    const records = buildChain(1);
    expect(verifyChain(records)).toEqual({ valid: true });
  });

  it("returns valid for a correct multi-record chain", () => {
    const records = buildChain(5);
    expect(verifyChain(records)).toEqual({ valid: true });
  });

  it("returns valid for an empty chain", () => {
    expect(verifyChain([])).toEqual({ valid: true });
  });

  it("detects sequence mismatch", () => {
    const records = buildChain(3);
    records[1] = { ...records[1], sequence: 99 };
    const result = verifyChain(records);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Sequence mismatch");
  });

  it("detects prev_hash mismatch", () => {
    const records = buildChain(3);
    records[1] = { ...records[1], prev_hash: "tampered" };
    const result = verifyChain(records);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("prev_hash mismatch");
  });

  it("detects record_hash tampering", () => {
    const records = buildChain(2);
    records[0] = { ...records[0], record_hash: "0".repeat(64) };
    const result = verifyChain(records);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("record_hash mismatch");
  });

  it("detects payload tampering via hash recomputation", () => {
    const records = buildChain(2);
    records[0] = { ...records[0], payload: { step: 999 } };
    const result = verifyChain(records);
    expect(result.valid).toBe(false);
  });
});

describe("assertValidChain", () => {
  it("does not throw for a valid chain", () => {
    const records = buildChain(3);
    expect(() => assertValidChain(records)).not.toThrow();
  });

  it("throws ChainValidationError for an invalid chain", () => {
    const records = buildChain(2);
    records[0] = { ...records[0], sequence: 5 };
    expect(() => assertValidChain(records)).toThrow("Sequence mismatch");
  });
});
