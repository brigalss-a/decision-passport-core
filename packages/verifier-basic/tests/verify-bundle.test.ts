import { describe, expect, it } from "vitest";
import { verifyBasicBundle } from "../src/verify-bundle.js";
import { createRecord, createManifest, hashCanonical, verifyChain } from "@decision-passport/core";
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

function buildSemanticBundle(overrides?: Record<string, unknown>): BasicProofBundle & Record<string, unknown> {
  const chainId = "semantic-test-chain";
  const recommendation = createRecord({
    chainId,
    lastRecord: null,
    actorId: "agent-1",
    actorType: "ai_agent",
    actionType: "AI_RECOMMENDATION",
    payload: { action: "approve_change_order", change_order_id: "CO-TEST-001", confidence: 0.94 },
  });
  const approval = createRecord({
    chainId,
    lastRecord: recommendation,
    actorId: "human-approver-01",
    actorType: "human",
    actionType: "HUMAN_APPROVAL_GRANTED",
    payload: { approved_recommendation_id: recommendation.id, note: "Reviewed and approved" },
  });
  const execution = createRecord({
    chainId,
    lastRecord: approval,
    actorId: "agent-1",
    actorType: "ai_agent",
    actionType: "EXECUTION_SUCCEEDED",
    payload: { result: "Change order executed", execution_id: "exec-test-001" },
  });

  const base = {
    bundle_version: "1.4-basic",
    exported_at_utc: "2026-04-12T12:10:00.000Z",
    passport_records: [recommendation, approval, execution],
    manifest: createManifest([recommendation, approval, execution]),
  } as BasicProofBundle & Record<string, unknown>;
  const finalApprovedPayload = { ...recommendation.payload };

  return {
    ...base,
    decision_trail: {
      trail_version: "0.7.0-trail",
      trail_id: "trail-test-001",
      initiating_request: {
        request_id: "req-test-001",
        summary: "Approve change order",
      },
      context_references: [],
      alternatives_considered: [],
      rejected_options: [],
      escalation_events: [],
      approval_checkpoint: {
        approval_status: "APPROVED",
        approved_by: "human-approver-01",
        approved_at_utc: "2026-04-12T12:00:00.000Z",
      },
      final_approved_payload: finalApprovedPayload,
      linked_passport_id: "passport-test-001",
    },
    runtime_claim: {
      claim_id: "claim-test-001",
      passport_id: "passport-test-001",
      nonce: "nonce-test-001",
      issued_at_utc: "2026-04-12T11:55:00.000Z",
      expires_at_utc: "2026-04-12T12:30:00.000Z",
      payload_hash: hashCanonical(finalApprovedPayload),
      authority_ref: "policy.change-order.approver",
      claim_status: "ACTIVE",
      single_use: true,
      guard_version: "0.7.0-guard",
    },
    outcome_binding: {
      outcome_status: "SUCCESS",
      executor_id: "executor.worker-1",
      executed_at_utc: "2026-04-12T12:05:00.000Z",
      reason_code: "EXECUTION_SUCCEEDED",
      linked_runtime_claim_id: "claim-test-001",
    },
    ...overrides,
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

  it("returns explicit semantic statuses for linked trail, claim, and outcome", () => {
    const result = verifyBasicBundle(buildSemanticBundle());

    expect(result.status).toBe("PASS");
    expect(result.authorization_status).toBe("AUTHORIZED");
    expect(result.payload_binding_status).toBe("MATCHED");
    expect(result.runtime_claim_status).toBe("VALID");
    expect(result.outcome_linkage_status).toBe("LINKED");
    expect(result.revocation_status).toBe("CLEAR");
    expect(result.supersession_status).toBe("NOT_DECLARED");
    expect(result.trail_linkage_status).toBe("LINKED");
  });

  it("returns CLAIM_EXPIRED for expired runtime claim", () => {
    const result = verifyBasicBundle(buildSemanticBundle({
      runtime_claim: {
        claim_id: "claim-expired-test",
        passport_id: "passport-test-001",
        nonce: "nonce-expired-test",
        issued_at_utc: "2026-04-12T11:00:00.000Z",
        expires_at_utc: "2026-04-12T11:30:00.000Z",
        payload_hash: hashCanonical(buildValidBundle(3).passport_records[0].payload),
        authority_ref: "policy.change-order.approver",
        claim_status: "EXPIRED",
        single_use: true,
        guard_version: "0.7.0-guard",
      },
      outcome_binding: undefined,
    }));

    expect(result.status).toBe("FAIL");
    expect(result.code).toBe("CLAIM_EXPIRED");
    expect(result.runtime_claim_status).toBe("EXPIRED");
  });

  it("returns CLAIM_NONCE_REUSED for consumed single-use claim", () => {
    const result = verifyBasicBundle(buildSemanticBundle({
      runtime_claim: {
        claim_id: "claim-used-test",
        passport_id: "passport-test-001",
        nonce: "nonce-used-test",
        issued_at_utc: "2026-04-12T11:55:00.000Z",
        expires_at_utc: "2026-04-12T12:30:00.000Z",
        payload_hash: hashCanonical(buildValidBundle(3).passport_records[0].payload),
        authority_ref: "policy.change-order.approver",
        claim_status: "USED",
        single_use: true,
        guard_version: "0.7.0-guard",
      },
      outcome_binding: undefined,
    }));

    expect(result.status).toBe("FAIL");
    expect(result.code).toBe("CLAIM_NONCE_REUSED");
    expect(result.runtime_claim_status).toBe("NONCE_REUSED");
  });

  it("returns CLAIM_PAYLOAD_MISMATCH for claim payload drift from approved trail payload", () => {
    const result = verifyBasicBundle(buildSemanticBundle({
      runtime_claim: {
        claim_id: "claim-mismatch-test",
        passport_id: "passport-test-001",
        nonce: "nonce-mismatch-test",
        issued_at_utc: "2026-04-12T11:55:00.000Z",
        expires_at_utc: "2026-04-12T12:30:00.000Z",
        payload_hash: "0".repeat(64),
        authority_ref: "policy.change-order.approver",
        claim_status: "ACTIVE",
        single_use: true,
        guard_version: "0.7.0-guard",
      },
      outcome_binding: undefined,
    }));

    expect(result.status).toBe("FAIL");
    expect(result.code).toBe("CLAIM_PAYLOAD_MISMATCH");
    expect(result.payload_binding_status).toBe("MISMATCH");
    expect(result.trail_linkage_status).toBe("PAYLOAD_MISMATCH");
  });

  it("returns OUTCOME_LINKAGE_MISMATCH for mismatched linked runtime claim id", () => {
    const result = verifyBasicBundle(buildSemanticBundle({
      outcome_binding: {
        outcome_status: "SUCCESS",
        executor_id: "executor.worker-1",
        executed_at_utc: "2026-04-12T12:05:00.000Z",
        reason_code: "EXECUTION_SUCCEEDED",
        linked_runtime_claim_id: "claim-other",
      },
    }));

    expect(result.status).toBe("FAIL");
    expect(result.code).toBe("OUTCOME_LINKAGE_MISMATCH");
    expect(result.outcome_linkage_status).toBe("MISMATCH");
  });

  it("returns PASSPORT_REVOKED when bundle declares revoked passport state", () => {
    const result = verifyBasicBundle(buildSemanticBundle({ passport_status: "REVOKED" }));
    expect(result.status).toBe("FAIL");
    expect(result.code).toBe("PASSPORT_REVOKED");
    expect(result.revocation_status).toBe("REVOKED");
  });

  it("returns PASSPORT_SUPERSEDED when bundle declares superseded passport state", () => {
    const result = verifyBasicBundle(buildSemanticBundle({
      passport_status: "SUPERSEDED",
      superseded_by_passport_id: "passport-test-002",
    }));
    expect(result.status).toBe("FAIL");
    expect(result.code).toBe("PASSPORT_SUPERSEDED");
    expect(result.supersession_status).toBe("SUPERSEDED");
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
