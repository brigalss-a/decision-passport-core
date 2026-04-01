import { describe, expect, it } from "vitest";
import { createRecord } from "../src/chain.js";
import { createManifest } from "../src/manifest.js";
import type { BasicProofBundle, PassportRecord } from "../src/types.js";
import {
  computeActorReliabilityProfile,
  summarizeBundle,
  SIGNIFICANCE_THRESHOLD,
} from "../src/reliability.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBundle(
  chainId: string,
  records: PassportRecord[],
  exportedAt = "2026-01-01T00:00:00.000Z",
): BasicProofBundle {
  const manifest = createManifest(records);
  return {
    bundle_version: "1.4-basic",
    exported_at_utc: exportedAt,
    passport_records: records,
    manifest: { ...manifest, chain_id: chainId },
  };
}

function buildRecords(
  chainId: string,
  actorId: string,
  actionTypes: Array<import("../src/types.js").ActionType>,
): PassportRecord[] {
  const records: PassportRecord[] = [];
  let last: PassportRecord | null = null;
  for (const actionType of actionTypes) {
    const r = createRecord({
      chainId,
      lastRecord: last,
      actorId,
      actorType: "ai_agent",
      actionType,
      payload: {},
    });
    records.push(r);
    last = r;
  }
  return records;
}

// ---------------------------------------------------------------------------
// summarizeBundle
// ---------------------------------------------------------------------------

describe("summarizeBundle", () => {
  it("returns zero rates for empty bundles", () => {
    const bundle = makeBundle("chain-empty", []);
    const summary = summarizeBundle(bundle);
    expect(summary.adverse_rate).toBe(0);
    expect(summary.override_rate).toBe(0);
    expect(summary.execution_success_rate).toBe(0);
    expect(summary.record_count).toBe(0);
  });

  it("computes correct adverse_rate for failures + rejections", () => {
    const records = buildRecords("c1", "agent-1", [
      "EXECUTION_SUCCEEDED",
      "EXECUTION_FAILED",
      "HUMAN_APPROVAL_REJECTED",
      "AI_RECOMMENDATION",
    ]);
    const bundle = makeBundle("c1", records);
    const summary = summarizeBundle(bundle);
    // 2 adverse out of 4
    expect(summary.adverse_rate).toBeCloseTo(0.5);
  });

  it("computes correct execution_success_rate", () => {
    const records = buildRecords("c2", "agent-1", [
      "EXECUTION_SUCCEEDED",
      "EXECUTION_SUCCEEDED",
      "EXECUTION_FAILED",
      "AI_RECOMMENDATION", // not an execution attempt
    ]);
    const bundle = makeBundle("c2", records);
    const summary = summarizeBundle(bundle);
    // 2 successes out of 3 attempts
    expect(summary.execution_success_rate).toBeCloseTo(2 / 3);
  });

  it("computes correct override_rate", () => {
    const records = buildRecords("c3", "agent-1", [
      "HUMAN_OVERRIDE",
      "EXECUTION_SUCCEEDED",
      "EXECUTION_SUCCEEDED",
      "EXECUTION_SUCCEEDED",
    ]);
    const bundle = makeBundle("c3", records);
    const summary = summarizeBundle(bundle);
    expect(summary.override_rate).toBeCloseTo(0.25);
  });

  it("anchors provenance to manifest chain_hash", () => {
    const records = buildRecords("c4", "agent-1", ["AI_RECOMMENDATION"]);
    const bundle = makeBundle("c4", records);
    const summary = summarizeBundle(bundle);
    expect(summary.source_chain_hash).toBe(bundle.manifest.chain_hash);
    expect(summary.chain_id).toBe(bundle.manifest.chain_id);
    expect(summary.exported_at_utc).toBe(bundle.exported_at_utc);
  });

  it("returns execution_success_rate 0 when no execution records exist", () => {
    const records = buildRecords("c5", "agent-1", [
      "AI_RECOMMENDATION",
      "HUMAN_APPROVAL_GRANTED",
    ]);
    const bundle = makeBundle("c5", records);
    const summary = summarizeBundle(bundle);
    expect(summary.execution_success_rate).toBe(0);
  });

  it("counts all ActionTypes in action_type_counts", () => {
    const records = buildRecords("c6", "agent-1", [
      "EXECUTION_SUCCEEDED",
      "EXECUTION_SUCCEEDED",
      "EXECUTION_FAILED",
    ]);
    const bundle = makeBundle("c6", records);
    const summary = summarizeBundle(bundle);
    expect(summary.action_type_counts["EXECUTION_SUCCEEDED"]).toBe(2);
    expect(summary.action_type_counts["EXECUTION_FAILED"]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// computeActorReliabilityProfile
// ---------------------------------------------------------------------------

describe("computeActorReliabilityProfile", () => {
  it("throws RangeError for empty bundles", () => {
    expect(() => computeActorReliabilityProfile("agent-x", [])).toThrow(RangeError);
  });

  it("returns profile with no trends for a single bundle", () => {
    const records = buildRecords("chain-1", "agent-1", [
      "EXECUTION_SUCCEEDED",
      "EXECUTION_FAILED",
    ]);
    const bundle = makeBundle("chain-1", records, "2026-01-01T00:00:00.000Z");
    const profile = computeActorReliabilityProfile("agent-1", [bundle]);
    expect(profile.actor_id).toBe("agent-1");
    expect(profile.sessions).toHaveLength(1);
    expect(profile.trends).toBeUndefined();
    expect(profile.source_chain_hashes).toHaveLength(1);
  });

  it("includes trends for two or more bundles", () => {
    const r1 = buildRecords("chain-s1", "agent-1", ["EXECUTION_SUCCEEDED"]);
    const r2 = buildRecords("chain-s2", "agent-1", ["EXECUTION_FAILED"]);
    const b1 = makeBundle("chain-s1", r1, "2026-01-01T00:00:00.000Z");
    const b2 = makeBundle("chain-s2", r2, "2026-01-02T00:00:00.000Z");
    const profile = computeActorReliabilityProfile("agent-1", [b1, b2]);
    expect(profile.trends).toBeDefined();
    expect(profile.trends).toHaveLength(3); // adverse_rate, override_rate, execution_success_rate
  });

  it("detects worsening adverse_rate trend", () => {
    // Three sessions: adverse_rate 0, 0.5, 1.0 — clear monotone increase
    const bundles = [
      makeBundle("c1", buildRecords("c1", "a1", ["EXECUTION_SUCCEEDED"]), "2026-01-01T00:00:00.000Z"),
      makeBundle("c2", buildRecords("c2", "a1", ["EXECUTION_SUCCEEDED", "EXECUTION_FAILED"]), "2026-01-02T00:00:00.000Z"),
      makeBundle("c3", buildRecords("c3", "a1", ["EXECUTION_FAILED"]), "2026-01-03T00:00:00.000Z"),
    ];
    const profile = computeActorReliabilityProfile("a1", bundles);
    const adverseTrend = profile.trends!.find((t) => t.metric === "adverse_rate")!;
    expect(adverseTrend.direction).toBe("worsening");
    expect(adverseTrend.slope).toBeGreaterThan(0);
    expect(adverseTrend.significant).toBe(true);
  });

  it("detects improving execution_success_rate trend", () => {
    // Three sessions: success_rate 0.0, 0.5, 1.0 — clear improvement
    const bundles = [
      makeBundle("c1", buildRecords("c1", "a1", ["EXECUTION_FAILED"]), "2026-01-01T00:00:00.000Z"),
      makeBundle("c2", buildRecords("c2", "a1", ["EXECUTION_SUCCEEDED", "EXECUTION_FAILED"]), "2026-01-02T00:00:00.000Z"),
      makeBundle("c3", buildRecords("c3", "a1", ["EXECUTION_SUCCEEDED"]), "2026-01-03T00:00:00.000Z"),
    ];
    const profile = computeActorReliabilityProfile("a1", bundles);
    const successTrend = profile.trends!.find((t) => t.metric === "execution_success_rate")!;
    expect(successTrend.direction).toBe("improving");
    expect(successTrend.slope).toBeGreaterThan(0);
  });

  it("labels stable trend when slope is below SIGNIFICANCE_THRESHOLD", () => {
    // Two identical sessions — slope 0
    const r = buildRecords("c1", "a1", ["EXECUTION_SUCCEEDED"]);
    const b1 = makeBundle("c1", r, "2026-01-01T00:00:00.000Z");
    const b2 = makeBundle("c2", buildRecords("c2", "a1", ["EXECUTION_SUCCEEDED"]), "2026-01-02T00:00:00.000Z");
    const profile = computeActorReliabilityProfile("a1", [b1, b2]);
    const trend = profile.trends!.find((t) => t.metric === "adverse_rate")!;
    expect(trend.direction).toBe("stable");
    expect(trend.significant).toBe(false);
    expect(trend.slope).toBeCloseTo(0);
  });

  it("preserves source_chain_hashes provenance in session order", () => {
    const b1 = makeBundle("c1", buildRecords("c1", "a1", ["EXECUTION_SUCCEEDED"]), "2026-01-01T00:00:00.000Z");
    const b2 = makeBundle("c2", buildRecords("c2", "a1", ["EXECUTION_FAILED"]), "2026-01-02T00:00:00.000Z");
    const profile = computeActorReliabilityProfile("a1", [b1, b2]);
    expect(profile.source_chain_hashes[0]).toBe(b1.manifest.chain_hash);
    expect(profile.source_chain_hashes[1]).toBe(b2.manifest.chain_hash);
  });

  it("only counts the target actor's records per session", () => {
    // Bundle has two actors; profile for "agent-a" should not include "agent-b" records
    let last: PassportRecord | null = null;
    const records: PassportRecord[] = [];
    // agent-a: EXECUTION_SUCCEEDED
    const ra = createRecord({
      chainId: "mixed", lastRecord: last, actorId: "agent-a",
      actorType: "ai_agent", actionType: "EXECUTION_SUCCEEDED", payload: {},
    });
    records.push(ra);
    last = ra;
    // agent-b: EXECUTION_FAILED (should not count toward agent-a's adverse_rate)
    const rb = createRecord({
      chainId: "mixed", lastRecord: last, actorId: "agent-b",
      actorType: "ai_agent", actionType: "EXECUTION_FAILED", payload: {},
    });
    records.push(rb);

    const bundle = makeBundle("mixed", records, "2026-01-01T00:00:00.000Z");
    const profile = computeActorReliabilityProfile("agent-a", [bundle]);
    expect(profile.sessions[0].adverse_rate).toBe(0);
    expect(profile.sessions[0].record_count).toBe(1);
  });

  it("handles unsorted bundle inputs without throwing", () => {
    // Caller passes bundles out-of-order; we don't validate order — just process
    const b1 = makeBundle("c1", buildRecords("c1", "a1", ["EXECUTION_SUCCEEDED"]), "2026-01-03T00:00:00.000Z");
    const b2 = makeBundle("c2", buildRecords("c2", "a1", ["EXECUTION_FAILED"]), "2026-01-01T00:00:00.000Z");
    expect(() => computeActorReliabilityProfile("a1", [b1, b2])).not.toThrow();
  });

  it("handles duplicate chain_ids without throwing", () => {
    const r1 = buildRecords("same-chain", "a1", ["EXECUTION_SUCCEEDED"]);
    const r2 = buildRecords("same-chain", "a1", ["EXECUTION_FAILED"]);
    const b1 = makeBundle("same-chain", r1, "2026-01-01T00:00:00.000Z");
    const b2 = makeBundle("same-chain", r2, "2026-01-02T00:00:00.000Z");
    const profile = computeActorReliabilityProfile("a1", [b1, b2]);
    expect(profile.sessions).toHaveLength(2);
    expect(profile.source_chain_hashes).toHaveLength(2);
  });

  it("handles bundles where the actor has zero records in a session", () => {
    // Bundle has only "agent-b" records; agent-a has no participation
    const r = buildRecords("c1", "agent-b", ["EXECUTION_SUCCEEDED"]);
    const bundle = makeBundle("c1", r, "2026-01-01T00:00:00.000Z");
    const profile = computeActorReliabilityProfile("agent-a", [bundle]);
    expect(profile.sessions[0].record_count).toBe(0);
    expect(profile.sessions[0].adverse_rate).toBe(0);
    expect(profile.sessions[0].execution_success_rate).toBe(0);
  });

  it("window_size in trend matches the number of sessions", () => {
    const bundles = [
      makeBundle("c1", buildRecords("c1", "a1", ["EXECUTION_SUCCEEDED"]), "2026-01-01T00:00:00.000Z"),
      makeBundle("c2", buildRecords("c2", "a1", ["EXECUTION_FAILED"]), "2026-01-02T00:00:00.000Z"),
      makeBundle("c3", buildRecords("c3", "a1", ["EXECUTION_SUCCEEDED"]), "2026-01-03T00:00:00.000Z"),
    ];
    const profile = computeActorReliabilityProfile("a1", bundles);
    for (const trend of profile.trends!) {
      expect(trend.window_size).toBe(3);
    }
  });

  it("SIGNIFICANCE_THRESHOLD is exported and equals 0.01", () => {
    expect(SIGNIFICANCE_THRESHOLD).toBe(0.01);
  });
});
