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
    expect(result.verdict).toBe("VALID");
    expect(result.code).toBe("SUCCESS_VALID");
    expect(result.location).toBe("$.bundle");
    expect(result.checks).toHaveLength(2);
    expect(result.checks.every((c) => c.passed)).toBe(true);
    expect(result.reasonCodes).toEqual([]);
    expect(result.summary).toContain("passed");
  });

  it("returns PASS for a single-record bundle", () => {
    const bundle = buildValidBundle(1);
    const result = verifyBasicBundle(bundle);
    expect(result.status).toBe("PASS");
    expect(result.code).toBe("SUCCESS_VALID");
  });

  it("returns FAIL when chain integrity is broken", () => {
    const clean = buildValidBundle(3);
    // JSON round-trip produces a plain mutable object; intentional tamper for test
    const bundle = JSON.parse(JSON.stringify(clean)) as BasicProofBundle;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bundle.passport_records as any[])[1] = { ...bundle.passport_records[1], payload: { step: 999 } };

    const result = verifyBasicBundle(bundle);
    expect(result.status).toBe("FAIL");
    expect(result.verdict).toBe("INVALID");
    expect(result.code).toBe("HASH_MISMATCH");
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
    expect(result.code).toBe("HASH_MISMATCH");
    expect(result.location).toBe("$.manifest.chain_hash");
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
    expect(result.code).toBe("SCHEMA_INVALID_FIELD");
    expect(result.location).toBe("$.passport_records");
    expect(result.checks).toHaveLength(1);
    expect(result.reasonCodes).toContain("EMPTY_OR_MISSING_RECORDS");
  });

  it("returns FAIL with malformed reason for non-object input", () => {
    const result = verifyBasicBundle(null);
    expect(result.status).toBe("FAIL");
    expect(result.code).toBe("BUNDLE_MALFORMED");
    expect(result.location).toBe("$");
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
    expect(result.code).toBe("SCHEMA_MISSING_FIELD");
    expect(result.location).toBe("$.passport_records");
    expect(result.reasonCodes).toContain("EMPTY_OR_MISSING_RECORDS");
  });

  it("returns PROFILE_UNSUPPORTED for unsupported 1.4 profile", () => {
    const bundle = {
      ...buildValidBundle(2),
      bundle_version: "1.4-enterprise",
    };
    const result = verifyBasicBundle(bundle);
    expect(result.status).toBe("FAIL");
    expect(result.code).toBe("PROFILE_UNSUPPORTED");
    expect(result.location).toBe("$.bundle_version");
  });

  it("returns AUTHORIZATION_EXECUTION_MISMATCH for execution before approval", () => {
    const chainId = "auth-mismatch";
    const first = createRecord({
      chainId,
      lastRecord: null,
      actorId: "agent-1",
      actorType: "ai_agent",
      actionType: "EXECUTION_SUCCEEDED",
      payload: { outcome: "ok" }
    });

    const bundle: BasicProofBundle = {
      bundle_version: "1.4-basic",
      exported_at_utc: new Date().toISOString(),
      passport_records: [first],
      manifest: createManifest([first])
    };

    const result = verifyBasicBundle(bundle);
    expect(result.status).toBe("FAIL");
    expect(result.code).toBe("AUTHORIZATION_EXECUTION_MISMATCH");
    expect(result.location).toBe("$.passport_records[0].action_type");
    expect(result.failure_class).toBe("authorization");
  });

  it("returns SEMANTIC_INCONSISTENCY for contradictory execution outcomes", () => {
    const chainId = "semantic-inconsistency";
    const r0 = createRecord({
      chainId,
      lastRecord: null,
      actorId: "agent-1",
      actorType: "ai_agent",
      actionType: "AI_RECOMMENDATION",
      payload: { step: "recommend" }
    });
    const r1 = createRecord({
      chainId,
      lastRecord: r0,
      actorId: "human-1",
      actorType: "human",
      actionType: "HUMAN_APPROVAL_GRANTED",
      payload: { approved: true }
    });
    const r2 = createRecord({
      chainId,
      lastRecord: r1,
      actorId: "agent-1",
      actorType: "ai_agent",
      actionType: "EXECUTION_SUCCEEDED",
      payload: { result: "ok" }
    });
    const r3 = createRecord({
      chainId,
      lastRecord: r2,
      actorId: "agent-1",
      actorType: "ai_agent",
      actionType: "EXECUTION_FAILED",
      payload: { result: "error" }
    });

    const bundle: BasicProofBundle = {
      bundle_version: "1.4-basic",
      exported_at_utc: new Date().toISOString(),
      passport_records: [r0, r1, r2, r3],
      manifest: createManifest([r0, r1, r2, r3])
    };

    const result = verifyBasicBundle(bundle);
    expect(result.status).toBe("FAIL");
    expect(result.code).toBe("SEMANTIC_INCONSISTENCY");
    expect(result.location).toBe("$.passport_records[*].action_type");
    expect(result.failure_class).toBe("semantic");
  });
});
