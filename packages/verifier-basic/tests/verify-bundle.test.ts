import { describe, expect, it } from "vitest";
import { verifyBasicBundle } from "../src/verify-bundle.js";
import { createRecord, createManifest, verifyChain } from "@decision-passport/core";
import type { BasicProofBundle } from "@decision-passport/core";

function buildValidBundle(recordCount: number): BasicProofBundle {
  const chainId = "test-chain";
  const records = [];
  let last = null;
  for (let i = 0; i < recordCount; i++) {
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

  return {
    bundle_version: "1.4-basic",
    exported_at_utc: new Date().toISOString(),
    passport_records: records,
    manifest: createManifest(records)
  };
}

describe("verifyBasicBundle", () => {
  it("returns PASS for a valid bundle", () => {
    const bundle = buildValidBundle(3);
    const result = verifyBasicBundle(bundle);

    expect(result.status).toBe("PASS");
    expect(result.checks).toHaveLength(2);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("returns PASS for a single-record bundle", () => {
    const bundle = buildValidBundle(1);
    const result = verifyBasicBundle(bundle);
    expect(result.status).toBe("PASS");
  });

  it("returns FAIL when chain integrity is broken", () => {
    const bundle = buildValidBundle(3);
    bundle.passport_records[1] = {
      ...bundle.passport_records[1],
      payload: { step: 999 }
    };

    const result = verifyBasicBundle(bundle);
    expect(result.status).toBe("FAIL");
    expect(result.checks.find((c) => c.name === "chain_integrity")?.passed).toBe(false);
  });

  it("returns FAIL when manifest chain_hash mismatches", () => {
    const bundle = buildValidBundle(3);
    bundle.manifest = { ...bundle.manifest, chain_hash: "0".repeat(64) };

    const result = verifyBasicBundle(bundle);
    expect(result.status).toBe("FAIL");
    expect(result.checks.find((c) => c.name === "manifest_chain_hash")?.passed).toBe(false);
  });

  it("handles empty records (chain_integrity only)", () => {
    const bundle: BasicProofBundle = {
      bundle_version: "1.4-basic",
      exported_at_utc: new Date().toISOString(),
      passport_records: [],
      manifest: createManifest([])
    };

    const result = verifyBasicBundle(bundle);
    expect(result.status).toBe("PASS");
    expect(result.checks).toHaveLength(1);
  });
});
