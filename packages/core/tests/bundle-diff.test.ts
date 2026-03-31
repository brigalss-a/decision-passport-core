import { describe, it, expect } from "vitest";
import { createRecord, createManifest, diffBundles } from "../src/index.js";
import type { BasicProofBundle } from "../src/types.js";

function buildBundle(): BasicProofBundle {
  const chainId = "diff-test-chain";
  const r1 = createRecord({
    chainId,
    lastRecord: null,
    actorId: "agent-01",
    actorType: "ai_agent",
    actionType: "AI_RECOMMENDATION",
    payload: { action: "approve", confidence: 0.9 },
  });
  const r2 = createRecord({
    chainId,
    lastRecord: r1,
    actorId: "human-01",
    actorType: "human",
    actionType: "HUMAN_APPROVAL_GRANTED",
    payload: { approved: true },
  });
  const r3 = createRecord({
    chainId,
    lastRecord: r2,
    actorId: "system",
    actorType: "system",
    actionType: "EXECUTION_SUCCEEDED",
    payload: { result: "done" },
  });
  const records = [r1, r2, r3];
  return {
    bundle_version: "1.4-basic",
    exported_at_utc: "2026-01-15T12:00:00.000Z",
    passport_records: records,
    manifest: createManifest(records),
  };
}

describe("diffBundles", () => {
  it("reports identical bundles", () => {
    const bundle = buildBundle();
    const result = diffBundles(bundle, bundle);
    expect(result.identical).toBe(true);
    expect(result.findings).toHaveLength(0);
    expect(result.summary).toContain("identical");
  });

  it("detects tampered payload", () => {
    const bundleA = buildBundle();
    const bundleB = structuredClone(bundleA);
    bundleB.passport_records[1] = {
      ...bundleB.passport_records[1],
      payload: { approved: false, injected: true },
    };

    const result = diffBundles(bundleA, bundleB);
    expect(result.identical).toBe(false);
    expect(result.findings.some((f) => f.kind === "record_changed" && f.path.includes("payload"))).toBe(true);
  });

  it("detects added records", () => {
    const bundleA = buildBundle();
    const bundleB = structuredClone(bundleA);

    const extra = createRecord({
      chainId: "diff-test-chain",
      lastRecord: bundleB.passport_records[2],
      actorId: "agent-01",
      actorType: "ai_agent",
      actionType: "AI_RECOMMENDATION",
      payload: { action: "extra" },
    });
    bundleB.passport_records.push(extra);
    bundleB.manifest = createManifest(bundleB.passport_records);

    const result = diffBundles(bundleA, bundleB);
    expect(result.identical).toBe(false);
    expect(result.findings.some((f) => f.kind === "record_added")).toBe(true);
    expect(result.summary).toContain("added");
  });

  it("detects removed records", () => {
    const bundleA = buildBundle();
    const bundleB = structuredClone(bundleA);
    bundleB.passport_records = bundleB.passport_records.slice(0, 2);
    bundleB.manifest = createManifest(bundleB.passport_records);

    const result = diffBundles(bundleA, bundleB);
    expect(result.identical).toBe(false);
    expect(result.findings.some((f) => f.kind === "record_removed")).toBe(true);
    expect(result.summary).toContain("removed");
  });

  it("detects manifest changes", () => {
    const bundleA = buildBundle();
    const bundleB = structuredClone(bundleA);
    bundleB.manifest = { ...bundleB.manifest, chain_hash: "0".repeat(64) };

    const result = diffBundles(bundleA, bundleB);
    expect(result.identical).toBe(false);
    expect(result.findings.some((f) => f.kind === "manifest_changed" && f.path === "manifest.chain_hash")).toBe(true);
    expect(result.summary).toContain("manifest differs");
  });

  it("detects exported_at_utc change", () => {
    const bundleA = buildBundle();
    const bundleB = structuredClone(bundleA);
    bundleB.exported_at_utc = "2026-06-01T00:00:00.000Z";

    const result = diffBundles(bundleA, bundleB);
    expect(result.identical).toBe(false);
    expect(result.findings.some((f) => f.kind === "metadata_changed" && f.path === "exported_at_utc")).toBe(true);
  });

  it("detects changed record_hash without payload change", () => {
    const bundleA = buildBundle();
    const bundleB = structuredClone(bundleA);
    bundleB.passport_records[0] = {
      ...bundleB.passport_records[0],
      record_hash: "0".repeat(64),
    };

    const result = diffBundles(bundleA, bundleB);
    expect(result.identical).toBe(false);
    expect(result.findings.some((f) => f.kind === "record_changed" && f.path.includes("record_hash"))).toBe(true);
  });

  it("detects metadata changes on a record", () => {
    const bundleA = buildBundle();
    const bundleB = structuredClone(bundleA);
    bundleB.passport_records[0] = {
      ...bundleB.passport_records[0],
      metadata: { env: "prod" },
    };

    const result = diffBundles(bundleA, bundleB);
    expect(result.identical).toBe(false);
    expect(result.findings.some((f) => f.kind === "record_changed" && f.path.includes("metadata"))).toBe(true);
  });

  it("handles empty bundles", () => {
    const bundleA: BasicProofBundle = {
      bundle_version: "1.4-basic",
      exported_at_utc: "2026-01-01T00:00:00.000Z",
      passport_records: [],
      manifest: { chain_id: "empty", record_count: 0, first_record_id: "", last_record_id: "", chain_hash: "" },
    };
    const bundleB = structuredClone(bundleA);
    const result = diffBundles(bundleA, bundleB);
    expect(result.identical).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it("reports multiple differences in summary", () => {
    const bundleA = buildBundle();
    const bundleB = structuredClone(bundleA);
    // Change payload
    bundleB.passport_records[0] = {
      ...bundleB.passport_records[0],
      payload: { action: "TAMPERED" },
    };
    // Change manifest
    bundleB.manifest = { ...bundleB.manifest, chain_hash: "bad" };
    // Change exported time
    bundleB.exported_at_utc = "2099-01-01T00:00:00.000Z";

    const result = diffBundles(bundleA, bundleB);
    expect(result.identical).toBe(false);
    expect(result.findings.length).toBeGreaterThanOrEqual(3);
    expect(result.summary).toContain("field change(s)");
    expect(result.summary).toContain("manifest differs");
    expect(result.summary).toContain("bundle metadata differs");
  });
});
