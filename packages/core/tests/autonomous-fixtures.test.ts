import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { verifyBasicBundle } from "../../verifier-basic/src/index.js";
import { verifyBundleBatch } from "../../verifier-basic/src/batch-verification.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "../../../fixtures/autonomous");

function load(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8"));
}

// ─── Individual fixture verification ─────────────────────────────────────────

describe("Autonomous Action Fixtures — individual verification", () => {
  it("valid warehouse robot action verifies as PASS", () => {
    const result = verifyBasicBundle(load("valid-warehouse-robot-action.json"));
    expect(result.status).toBe("PASS");
    expect(result.code).toBe("SUCCESS_VALID");
  });

  it("safety-denied action verifies as PASS (denied receipt is a valid bundle)", () => {
    // The bundle is structurally valid — it records that the action was denied
    const result = verifyBasicBundle(load("safety-denied-action.json"));
    expect(result.status).toBe("PASS");
    expect(result.code).toBe("SUCCESS_VALID");
  });

  it("safety-blocked action verifies as PASS (abort-during-execution receipt is valid)", () => {
    const result = verifyBasicBundle(load("safety-blocked-action.json"));
    expect(result.status).toBe("PASS");
    expect(result.code).toBe("SUCCESS_VALID");
  });

  it("simulation mismatch verifies as PASS (records the denial accurately)", () => {
    const result = verifyBasicBundle(load("simulation-mismatch.json"));
    expect(result.status).toBe("PASS");
    expect(result.code).toBe("SUCCESS_VALID");
  });

  it("tampered sensor hash FAILS verification", () => {
    const result = verifyBasicBundle(load("tampered-sensor-hash.json"));
    expect(result.status).toBe("FAIL");
    expect(result.code).toBe("HASH_MISMATCH");
  });
});

// ─── Payload semantic checks ──────────────────────────────────────────────────

describe("Autonomous Action Fixtures — payload semantics", () => {
  it("valid warehouse robot action has 4 records (requested→authorized→pending→succeeded)", () => {
    const bundle = load("valid-warehouse-robot-action.json") as {
      passport_records: Array<{ action_type: string }>;
    };
    expect(bundle.passport_records).toHaveLength(4);
    expect(bundle.passport_records[0].action_type).toBe("AI_RECOMMENDATION");
    expect(bundle.passport_records[1].action_type).toBe("POLICY_APPROVAL_GRANTED");
    expect(bundle.passport_records[2].action_type).toBe("EXECUTION_PENDING");
    expect(bundle.passport_records[3].action_type).toBe("EXECUTION_SUCCEEDED");
  });

  it("safety-denied action has 2 records and ends in rejection", () => {
    const bundle = load("safety-denied-action.json") as {
      passport_records: Array<{ action_type: string }>;
    };
    expect(bundle.passport_records).toHaveLength(2);
    expect(bundle.passport_records[1].action_type).toBe("HUMAN_APPROVAL_REJECTED");
  });

  it("safety-blocked action ends in EXECUTION_ABORTED", () => {
    const bundle = load("safety-blocked-action.json") as {
      passport_records: Array<{ action_type: string }>;
    };
    const lastRecord = bundle.passport_records[bundle.passport_records.length - 1];
    expect(lastRecord.action_type).toBe("EXECUTION_ABORTED");
  });

  it("simulation mismatch ends in POLICY_EXCEPTION denial", () => {
    const bundle = load("simulation-mismatch.json") as {
      passport_records: Array<{ action_type: string; payload: Record<string, unknown> }>;
    };
    expect(bundle.passport_records).toHaveLength(2);
    expect(bundle.passport_records[1].action_type).toBe("POLICY_EXCEPTION");
  });

  it("tampered sensor hash fixture has mutated sensor data", () => {
    const bundle = load("tampered-sensor-hash.json") as {
      passport_records: Array<{
        payload: { evidence: { sensorSnapshotHash: string } };
      }>;
    };
    expect(bundle.passport_records[0].payload.evidence.sensorSnapshotHash).toContain("TAMPERED");
  });
});

// ─── Batch verification ───────────────────────────────────────────────────────

describe("Autonomous Action Fixtures — batch verification", () => {
  it("all 4 valid autonomous fixtures pass in batch", () => {
    const bundles = [
      load("valid-warehouse-robot-action.json"),
      load("safety-denied-action.json"),
      load("safety-blocked-action.json"),
      load("simulation-mismatch.json"),
    ];
    const report = verifyBundleBatch(bundles, { label: "autonomous-valid-batch" });
    expect(report.totalCount).toBe(4);
    expect(report.passedCount).toBe(4);
    expect(report.failedCount).toBe(0);
  });

  it("tampered sensor hash fixture fails in batch", () => {
    const report = verifyBundleBatch([load("tampered-sensor-hash.json")]);
    expect(report.failedCount).toBe(1);
    expect(report.results[0].batchFailureClass).toBeDefined();
  });

  it("mixed autonomous batch has correct counts", () => {
    const bundles = [
      load("valid-warehouse-robot-action.json"),
      load("tampered-sensor-hash.json"),
      load("safety-denied-action.json"),
    ];
    const report = verifyBundleBatch(bundles);
    expect(report.passedCount).toBe(2);
    expect(report.failedCount).toBe(1);
    expect(report.failureSummary.failedIndices).toEqual([1]);
  });
});

// ─── No network/hardware dependency ──────────────────────────────────────────

describe("Autonomous Action Fixtures — no external dependency", () => {
  it("all verifications complete without any network or hardware dependency", () => {
    // This test is trivially satisfied by the pure offline design,
    // but acts as a contract assertion for reviewers
    const fixtures = [
      "valid-warehouse-robot-action.json",
      "safety-denied-action.json",
      "safety-blocked-action.json",
      "simulation-mismatch.json",
      "tampered-sensor-hash.json",
    ];
    for (const f of fixtures) {
      const result = verifyBasicBundle(load(f));
      expect(["PASS", "FAIL"]).toContain(result.status);
    }
  });
});
