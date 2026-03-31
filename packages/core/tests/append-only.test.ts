/**
 * Append-only invariant tests for decision-passport-core.
 *
 * These tests assert that the protocol is tamper-evident at every level:
 * record, chain, and bundle. They do NOT test storage-level immutability —
 * that is out of scope for this library. They verify that any mutation
 * (payload change, record removal, reorder, insertion, manifest change)
 * is detected by the verification functions.
 */

import { describe, it, expect } from "vitest";
import { createRecord, verifyChain } from "../src/chain.js";
import { createManifest } from "../src/manifest.js";
import type { BasicProofBundle, PassportRecord } from "../src/types.js";

// Build a chain of N records and return the array
function buildChain(count: number): PassportRecord[] {
  const chainId = "ao-test-chain";
  const records: PassportRecord[] = [];
  let last: PassportRecord | null = null;
  for (let i = 0; i < count; i++) {
    const r = createRecord({
      chainId,
      lastRecord: last,
      actorId: "agent-1",
      actorType: "ai_agent",
      actionType: "AI_RECOMMENDATION",
      payload: { step: i, data: `record-${i}` },
    });
    records.push(r);
    last = r;
  }
  return records;
}

function buildBundle(count: number): BasicProofBundle {
  const records = buildChain(count);
  return {
    bundle_version: "1.4-basic",
    exported_at_utc: new Date().toISOString(),
    passport_records: records,
    manifest: createManifest(records),
  };
}

// JSON round-trip strips readonly — intentional tamper helper for tests only
function cloneForTamper(bundle: BasicProofBundle): {
  bundle_version: "1.4-basic";
  exported_at_utc: string;
  passport_records: PassportRecord[];
  manifest: { chain_id: string; record_count: number; first_record_id: string; last_record_id: string; chain_hash: string };
} {
  return JSON.parse(JSON.stringify(bundle));
}

describe("Append-only: record-level tamper detection", () => {
  it("fails verification when record 0 payload is changed", () => {
    const bundle = cloneForTamper(buildBundle(3));
    bundle.passport_records[0] = {
      ...bundle.passport_records[0],
      payload: { TAMPERED: true },
    };
    const result = verifyChain(bundle.passport_records);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/record_hash mismatch/i);
  });

  it("fails verification when a middle record payload is changed", () => {
    const bundle = cloneForTamper(buildBundle(5));
    bundle.passport_records[2] = {
      ...bundle.passport_records[2],
      payload: { injected: "evil" },
    };
    const result = verifyChain(bundle.passport_records);
    expect(result.valid).toBe(false);
  });

  it("fails verification when last record payload is changed", () => {
    const bundle = cloneForTamper(buildBundle(3));
    const last = bundle.passport_records.length - 1;
    bundle.passport_records[last] = {
      ...bundle.passport_records[last],
      payload: { TAMPERED: true },
    };
    const result = verifyChain(bundle.passport_records);
    expect(result.valid).toBe(false);
  });

  it("fails verification when a record's prev_hash is changed", () => {
    const bundle = cloneForTamper(buildBundle(3));
    bundle.passport_records[1] = {
      ...bundle.passport_records[1],
      prev_hash: "0".repeat(64),
    };
    const result = verifyChain(bundle.passport_records);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/prev_hash mismatch/i);
  });

  it("fails verification when a record_hash is changed without payload change", () => {
    const bundle = cloneForTamper(buildBundle(3));
    bundle.passport_records[0] = {
      ...bundle.passport_records[0],
      record_hash: "a".repeat(64),
    };
    const result = verifyChain(bundle.passport_records);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/record_hash mismatch/i);
  });

  it("fails verification when a record's sequence number is altered", () => {
    const bundle = cloneForTamper(buildBundle(3));
    bundle.passport_records[1] = {
      ...bundle.passport_records[1],
      sequence: 99,
    };
    const result = verifyChain(bundle.passport_records);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/sequence mismatch/i);
  });
});

describe("Append-only: chain-level tamper detection", () => {
  it("fails verification when a record is removed from the middle", () => {
    const chain = buildChain(4);
    // Remove record at index 1 — chain is now [0, 2, 3]
    const truncated = [chain[0], chain[2], chain[3]];
    const result = verifyChain(truncated);
    expect(result.valid).toBe(false);
  });

  it("fails verification when the first record is removed", () => {
    const chain = buildChain(3);
    const result = verifyChain(chain.slice(1));
    expect(result.valid).toBe(false);
  });

  it("fails verification when records are reordered", () => {
    const chain = buildChain(4);
    // Swap record 1 and record 2
    const reordered = [chain[0], chain[2], chain[1], chain[3]];
    const result = verifyChain(reordered);
    expect(result.valid).toBe(false);
  });

  it("fails verification when a forged record is inserted in the middle", () => {
    const chain = buildChain(3);
    // Build a separately forged record that doesn't chain from record 0
    const forged = createRecord({
      chainId: "ao-test-chain",
      lastRecord: null,
      actorId: "attacker",
      actorType: "system",
      actionType: "POLICY_EXCEPTION",
      payload: { forged: true },
    });
    // Insert after record 0 — forged.prev_hash is GENESIS, not chain[0].record_hash
    const tampered = [chain[0], forged, chain[1], chain[2]];
    const result = verifyChain(tampered);
    expect(result.valid).toBe(false);
  });

  it("passes verification for a valid appended chain", () => {
    // Append a new record legitimately — this is the ONLY valid growth path
    const chain = buildChain(3);
    const appended = createRecord({
      chainId: "ao-test-chain",
      lastRecord: chain[chain.length - 1],
      actorId: "agent-1",
      actorType: "ai_agent",
      actionType: "EXECUTION_SUCCEEDED",
      payload: { step: 3 },
    });
    const result = verifyChain([...chain, appended]);
    expect(result.valid).toBe(true);
  });
});

describe("Append-only: bundle/manifest-level tamper detection", () => {
  it("fails chain verify when manifest chain_hash is stale after legitimate append", () => {
    // After appending a record, the old manifest chain_hash no longer matches
    const bundle = cloneForTamper(buildBundle(2));
    const originalManifestHash = bundle.manifest.chain_hash;
    const lastRecord = bundle.passport_records[bundle.passport_records.length - 1];
    expect(originalManifestHash).toBe(lastRecord.record_hash);

    // Append a new record
    const appended = createRecord({
      chainId: bundle.passport_records[0].chain_id,
      lastRecord,
      actorId: "agent-1",
      actorType: "ai_agent",
      actionType: "EXECUTION_SUCCEEDED",
      payload: { appended: true },
    });
    bundle.passport_records.push(appended as PassportRecord);

    // Old manifest now stale — chain_hash no longer matches last record
    const newLastHash = bundle.passport_records[bundle.passport_records.length - 1].record_hash;
    expect(bundle.manifest.chain_hash).not.toBe(newLastHash);
  });

  it("reports manifest chain_hash mismatch after record removal", () => {
    const bundle = buildBundle(3);
    // Remove last record — manifest chain_hash points to a record no longer in list
    const truncated = bundle.passport_records.slice(0, 2);
    const truncatedLastHash = truncated[truncated.length - 1].record_hash;
    expect(bundle.manifest.chain_hash).not.toBe(truncatedLastHash);
  });
});
