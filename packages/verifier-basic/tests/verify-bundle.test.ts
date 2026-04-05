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
    expect(result.reasonCodes).toEqual([]);
    expect(result.summary).toContain("passed");
  });

  it("returns PASS for a single-record bundle", () => {
    const bundle = buildValidBundle(1);
    const result = verifyBasicBundle(bundle);
    expect(result.status).toBe("PASS");
  });

  it("returns FAIL when chain integrity is broken", () => {
    const clean = buildValidBundle(3);
    // JSON round-trip produces a plain mutable object; intentional tamper for test
    const bundle = JSON.parse(JSON.stringify(clean)) as BasicProofBundle;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bundle.passport_records as any[])[1] = { ...bundle.passport_records[1], payload: { step: 999 } };

    const result = verifyBasicBundle(bundle);
    expect(result.status).toBe("FAIL");
    expect(result.checks.find((c) => c.name === "chain_integrity")?.passed).toBe(false);
    expect(result.reasonCodes).toContain("CHAIN_INTEGRITY_FAILED");
    expect(result.reasonCodes).toContain("PAYLOAD_HASH_MISMATCH");
    expect((result.tamperFindings?.length ?? 0)).toBeGreaterThan(0);
  });

  it("returns FAIL when manifest chain_hash mismatches", () => {
    const clean = buildValidBundle(3);
    const bundle: BasicProofBundle = {
      ...clean,
      manifest: { ...clean.manifest, chain_hash: "0".repeat(64) }
    };

    const result = verifyBasicBundle(bundle);
    expect(result.status).toBe("FAIL");
    expect(result.checks.find((c) => c.name === "manifest_chain_hash")?.passed).toBe(false);
    expect(result.reasonCodes).toContain("MANIFEST_HASH_MISMATCH");
  });

  it("returns FAIL for an empty records bundle", () => {
    const bundle: BasicProofBundle = {
      bundle_version: "1.4-basic",
      exported_at_utc: new Date().toISOString(),
      passport_records: [],
      manifest: createManifest([])
    };

    const result = verifyBasicBundle(bundle);
    expect(result.status).toBe("FAIL");
    expect(result.checks).toHaveLength(1);
    expect(result.reasonCodes).toContain("EMPTY_OR_MISSING_RECORDS");
  });

  it("returns FAIL with malformed reason for non-object input", () => {
    const result = verifyBasicBundle(null);
    expect(result.status).toBe("FAIL");
    expect(result.reasonCodes).toContain("MALFORMED_BUNDLE");
    expect(result.checks[0].name).toBe("bundle_structure");
  });

  it("returns FAIL with malformed reason for missing records array", () => {
    const malformed = {
      bundle_version: "1.4-basic",
      exported_at_utc: new Date().toISOString(),
      manifest: {
        chain_id: "x",
        record_count: 0,
        first_record_id: "",
        last_record_id: "",
        chain_hash: ""
      }
    };
    const result = verifyBasicBundle(malformed);
    expect(result.status).toBe("FAIL");
    expect(result.reasonCodes).toContain("MALFORMED_BUNDLE");
  });
});
