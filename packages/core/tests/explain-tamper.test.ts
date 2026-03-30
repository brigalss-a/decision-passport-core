import { describe, it, expect } from "vitest";
import { createRecord, createManifest, explainTamper } from "../src/index.js";

function buildChain() {
  const chainId = "explain-test-chain";
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
  return [r1, r2, r3];
}

describe("explainTamper", () => {
  it("returns no findings for a valid chain", () => {
    const records = buildChain();
    const result = explainTamper(records);
    expect(result.tampered).toBe(false);
    expect(result.findings).toHaveLength(0);
    expect(result.summary).toContain("No tampering detected");
  });

  it("returns no findings for a valid chain with matching manifest", () => {
    const records = buildChain();
    const manifest = createManifest(records);
    const result = explainTamper(records, manifest);
    expect(result.tampered).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  it("detects tampered payload", () => {
    const records = buildChain();
    // Tamper the payload of record 1 without updating hashes
    records[1] = { ...records[1], payload: { approved: false, injected: true } };
    const result = explainTamper(records);
    expect(result.tampered).toBe(true);
    const payloadFinding = result.findings.find((f) => f.kind === "payload_hash");
    expect(payloadFinding).toBeDefined();
    expect(payloadFinding!.recordIndex).toBe(1);
    expect(result.summary).toContain("payload content was modified");
  });

  it("detects broken chain link when record is replaced", () => {
    const records = buildChain();
    // Tamper record 1 payload — this breaks payload_hash and record_hash on record 1.
    // record 2's prev_hash still points to the OLD (now-stale) record_hash of record 1,
    // so prev_hash on record 2 does NOT mismatch (it matches the stored but wrong hash).
    records[1] = { ...records[1], payload: { approved: false } };
    const result = explainTamper(records);
    expect(result.tampered).toBe(true);
    // Should find payload_hash mismatch on record 1
    expect(result.findings.some((f) => f.kind === "payload_hash" && f.recordIndex === 1)).toBe(true);
    // Should find record_hash mismatch on record 1
    expect(result.findings.some((f) => f.kind === "record_hash" && f.recordIndex === 1)).toBe(true);
    expect(result.summary).toContain("payload content was modified");
    expect(result.summary).toContain("record hashes are inconsistent");
  });

  it("detects broken chain link when record_hash is changed", () => {
    const records = buildChain();
    // Change record 1's record_hash directly — this breaks record 2's prev_hash link
    records[1] = { ...records[1], record_hash: "0".repeat(64) };
    const result = explainTamper(records);
    expect(result.tampered).toBe(true);
    expect(result.findings.some((f) => f.kind === "prev_hash" && f.recordIndex === 2)).toBe(true);
    expect(result.summary).toContain("chain links are broken");
  });

  it("detects manifest mismatch", () => {
    const records = buildChain();
    const manifest = createManifest(records);
    // Give manifest a wrong chain_hash
    const badManifest = { ...manifest, chain_hash: "0000000000000000000000000000000000000000000000000000000000000000" };
    const result = explainTamper(records, badManifest);
    expect(result.tampered).toBe(true);
    expect(result.findings.some((f) => f.kind === "manifest_chain_hash")).toBe(true);
    expect(result.summary).toContain("manifest does not match chain");
  });

  it("detects sequence mismatch", () => {
    const records = buildChain();
    records[1] = { ...records[1], sequence: 99 };
    const result = explainTamper(records);
    expect(result.tampered).toBe(true);
    const seqFinding = result.findings.find((f) => f.kind === "sequence");
    expect(seqFinding).toBeDefined();
    expect(seqFinding!.recordIndex).toBe(1);
    expect(result.summary).toContain("record sequencing is wrong");
  });

  it("returns multiple findings for heavily tampered chain", () => {
    const records = buildChain();
    // Tamper multiple records
    records[0] = { ...records[0], payload: { action: "EVIL" } };
    records[2] = { ...records[2], payload: { result: "EVIL" } };
    const manifest = createManifest(records);
    const badManifest = { ...manifest, chain_hash: "bad" };
    const result = explainTamper(records, badManifest);
    expect(result.tampered).toBe(true);
    expect(result.findings.length).toBeGreaterThanOrEqual(4);
  });

  it("handles empty record array", () => {
    const result = explainTamper([]);
    expect(result.tampered).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  it("provides record ID in each finding", () => {
    const records = buildChain();
    records[1] = { ...records[1], payload: { approved: false } };
    const result = explainTamper(records);
    for (const finding of result.findings) {
      expect(finding.recordId).toBeTruthy();
    }
  });
});
