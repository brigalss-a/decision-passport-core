import { describe, expect, it } from "vitest";
import { createManifest } from "../src/manifest.js";
import { createRecord } from "../src/chain.js";

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

describe("createManifest", () => {
  it("returns an empty manifest for zero records", () => {
    const manifest = createManifest([]);
    expect(manifest.chain_id).toBe("empty-chain");
    expect(manifest.record_count).toBe(0);
    expect(manifest.first_record_id).toBe("");
    expect(manifest.last_record_id).toBe("");
    expect(manifest.chain_hash).toBe("");
  });

  it("returns correct manifest for a single record", () => {
    const records = buildChain(1);
    const manifest = createManifest(records);

    expect(manifest.chain_id).toBe("test-chain");
    expect(manifest.record_count).toBe(1);
    expect(manifest.first_record_id).toBe(records[0].id);
    expect(manifest.last_record_id).toBe(records[0].id);
    expect(manifest.chain_hash).toBe(records[0].record_hash);
  });

  it("returns correct manifest for multiple records", () => {
    const records = buildChain(4);
    const manifest = createManifest(records);

    expect(manifest.chain_id).toBe("test-chain");
    expect(manifest.record_count).toBe(4);
    expect(manifest.first_record_id).toBe(records[0].id);
    expect(manifest.last_record_id).toBe(records[3].id);
    expect(manifest.chain_hash).toBe(records[3].record_hash);
  });
});
