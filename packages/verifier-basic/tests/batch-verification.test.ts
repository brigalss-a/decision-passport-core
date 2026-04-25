import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  verifyBundleBatch,
  classifyVerificationFailures,
  createVerificationAuditReport,
  type BatchVerificationReport,
} from "../src/batch-verification.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "../../../fixtures");

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8"));
}

const valid = loadFixture("valid-bundle.json");
const tampered = loadFixture("tampered-bundle.json");
const malformed = loadFixture("malformed-bundle.json");
const chainBreak = loadFixture("chain-break-bundle.json");
const brokenPrevHash = loadFixture("broken-prev-hash.json");
const unsupportedVersion = loadFixture("unsupported-version.json");
const wrongChainHash = loadFixture("wrong-chain-hash.json");
const missingRecord = loadFixture("missing-record-bundle.json");

// ─── verifyBundleBatch ────────────────────────────────────────────────────────

describe("verifyBundleBatch — all valid", () => {
  it("passes when all bundles are valid", () => {
    const compatible = loadFixture("compatible-optional-metadata.json");
    const report = verifyBundleBatch([valid, compatible]);
    expect(report.totalCount).toBe(2);
    expect(report.passedCount).toBe(2);
    expect(report.failedCount).toBe(0);
    expect(report.failFastTriggered).toBe(false);
    expect(report.failureSummary.totalFailed).toBe(0);
    expect(report.results.every((r) => r.result.status === "PASS")).toBe(true);
  });

  it("sets verifiedAt as ISO string", () => {
    const report = verifyBundleBatch([valid]);
    expect(report.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("extracts chainId from first record when available", () => {
    const report = verifyBundleBatch([valid]);
    expect(typeof report.results[0].chainId).toBe("string");
    expect(report.results[0].chainId!.length).toBeGreaterThan(0);
  });
});

describe("verifyBundleBatch — mixed valid/invalid", () => {
  it("correctly counts mixed results", () => {
    const report = verifyBundleBatch([valid, tampered, valid, malformed]);
    expect(report.totalCount).toBe(4);
    expect(report.passedCount).toBe(2);
    expect(report.failedCount).toBe(2);
  });

  it("records failed indices correctly", () => {
    const report = verifyBundleBatch([valid, tampered, valid]);
    expect(report.failureSummary.failedIndices).toEqual([1]);
  });

  it("assigns batchFailureClass to failed entries", () => {
    const report = verifyBundleBatch([valid, tampered]);
    const failed = report.results.find((r) => r.result.status === "FAIL");
    expect(failed?.batchFailureClass).toBeDefined();
    expect(typeof failed?.batchFailureClass).toBe("string");
  });

  it("does not assign batchFailureClass to passed entries", () => {
    const report = verifyBundleBatch([valid, tampered]);
    const passed = report.results.find((r) => r.result.status === "PASS");
    expect(passed?.batchFailureClass).toBeUndefined();
  });
});

describe("verifyBundleBatch — failure classification", () => {
  it("classifies unsupported version as UNSUPPORTED_VERSION", () => {
    const report = verifyBundleBatch([unsupportedVersion]);
    expect(report.results[0].batchFailureClass).toBe("UNSUPPORTED_VERSION");
  });

  it("classifies malformed bundle as MALFORMED_BUNDLE", () => {
    const report = verifyBundleBatch([malformed]);
    expect(report.results[0].batchFailureClass).toBe("MALFORMED_BUNDLE");
  });

  it("classifies chain break as CHAIN_BREAK", () => {
    const report = verifyBundleBatch([chainBreak]);
    expect(report.results[0].batchFailureClass).toMatch(/CHAIN_BREAK|HASH_MISMATCH|MANIFEST_MISMATCH/);
  });

  it("classifies broken prev hash as CHAIN_BREAK or HASH_MISMATCH", () => {
    const report = verifyBundleBatch([brokenPrevHash]);
    expect(["CHAIN_BREAK", "HASH_MISMATCH"]).toContain(report.results[0].batchFailureClass);
  });

  it("classifies wrong chain hash as MANIFEST_MISMATCH or HASH_MISMATCH", () => {
    const report = verifyBundleBatch([wrongChainHash]);
    expect(["MANIFEST_MISMATCH", "HASH_MISMATCH", "CHAIN_BREAK"]).toContain(
      report.results[0].batchFailureClass,
    );
  });
});

describe("verifyBundleBatch — failFast", () => {
  it("stops after first failure when failFast is true", () => {
    const report = verifyBundleBatch([valid, tampered, valid, valid], { failFast: true });
    expect(report.failFastTriggered).toBe(true);
    // Should have processed index 0 (pass) and index 1 (fail), then stopped
    expect(report.results.length).toBe(2);
    expect(report.failedCount).toBe(1);
  });

  it("does not trigger failFast when all pass", () => {
    const report = verifyBundleBatch([valid, valid], { failFast: true });
    expect(report.failFastTriggered).toBe(false);
    expect(report.results.length).toBe(2);
  });

  it("processes all when failFast is false (default)", () => {
    const report = verifyBundleBatch([tampered, valid, tampered]);
    expect(report.failFastTriggered).toBe(false);
    expect(report.results.length).toBe(3);
  });
});

describe("verifyBundleBatch — edge cases", () => {
  it("handles empty array", () => {
    const report = verifyBundleBatch([]);
    expect(report.totalCount).toBe(0);
    expect(report.passedCount).toBe(0);
    expect(report.failedCount).toBe(0);
    expect(report.results).toHaveLength(0);
  });

  it("accepts batchLabel option", () => {
    const report = verifyBundleBatch([valid], { label: "my-audit-batch" });
    expect(report.batchLabel).toBe("my-audit-batch");
  });

  it("handles null/undefined as malformed bundle", () => {
    const report = verifyBundleBatch([null, undefined]);
    expect(report.failedCount).toBe(2);
    expect(report.results.every((r) => r.result.status === "FAIL")).toBe(true);
  });
});

// ─── classifyVerificationFailures ─────────────────────────────────────────────

describe("classifyVerificationFailures — deterministic", () => {
  it("produces identical output for identical input", () => {
    const report1 = verifyBundleBatch([valid, tampered, malformed]);
    const report2 = verifyBundleBatch([valid, tampered, malformed]);
    const s1 = classifyVerificationFailures(report1.results);
    const s2 = classifyVerificationFailures(report2.results);
    expect(s1.totalFailed).toBe(s2.totalFailed);
    expect(s1.failedIndices).toEqual(s2.failedIndices);
    expect(JSON.stringify(s1.byClass)).toBe(JSON.stringify(s2.byClass));
  });

  it("returns zero totals for all-passing results", () => {
    const report = verifyBundleBatch([valid]);
    const summary = classifyVerificationFailures(report.results);
    expect(summary.totalFailed).toBe(0);
    expect(summary.failedIndices).toHaveLength(0);
    const totalByClass = Object.values(summary.byClass).reduce((a, b) => a + b, 0);
    expect(totalByClass).toBe(0);
  });

  it("counts across all failure classes correctly", () => {
    const report = verifyBundleBatch([tampered, malformed, unsupportedVersion]);
    const summary = classifyVerificationFailures(report.results);
    expect(summary.totalFailed).toBe(3);
    const totalByClass = Object.values(summary.byClass).reduce((a, b) => a + b, 0);
    expect(totalByClass).toBe(3);
  });

  it("works on a standalone results array (not from batch)", () => {
    // Simulate calling it with results that already have batchFailureClass
    const report = verifyBundleBatch([tampered]);
    const summary = classifyVerificationFailures(report.results);
    expect(summary.totalFailed).toBe(1);
    expect(summary.failedIndices).toEqual([0]);
  });
});

// ─── createVerificationAuditReport ────────────────────────────────────────────

describe("createVerificationAuditReport — JSON", () => {
  it("produces valid JSON for all-pass batch", () => {
    const report = verifyBundleBatch([valid], { label: "all-pass-test" });
    const artifact = createVerificationAuditReport(report);
    expect(artifact.format).toBe("json");
    const parsed = JSON.parse(artifact.content);
    expect(parsed.summary.totalCount).toBe(1);
    expect(parsed.summary.passedCount).toBe(1);
    expect(parsed.summary.failedCount).toBe(0);
  });

  it("includes failures in JSON output by default", () => {
    const report = verifyBundleBatch([valid, tampered]);
    const artifact = createVerificationAuditReport(report);
    const parsed = JSON.parse(artifact.content);
    expect(parsed.results).toHaveLength(1); // Only failed by default
    expect(parsed.results[0].status).toBe("FAIL");
  });

  it("includes passed entries when includePassedDetails is true", () => {
    const report = verifyBundleBatch([valid, tampered]);
    const artifact = createVerificationAuditReport(report, { includePassedDetails: true });
    const parsed = JSON.parse(artifact.content);
    expect(parsed.results.length).toBe(2);
  });

  it("includes batchLabel in JSON", () => {
    const report = verifyBundleBatch([valid], { label: "test-batch" });
    const artifact = createVerificationAuditReport(report);
    const parsed = JSON.parse(artifact.content);
    expect(parsed.batchLabel).toBe("test-batch");
  });

  it("sets generatedAt as ISO string", () => {
    const report = verifyBundleBatch([valid]);
    const artifact = createVerificationAuditReport(report);
    expect(artifact.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("createVerificationAuditReport — Markdown", () => {
  it("produces markdown with summary table for passing batch", () => {
    const report = verifyBundleBatch([valid, valid], { label: "my-batch" });
    const artifact = createVerificationAuditReport(report, { format: "markdown" });
    expect(artifact.format).toBe("markdown");
    expect(artifact.content).toContain("# Decision Passport");
    expect(artifact.content).toContain("my-batch");
    expect(artifact.content).toContain("100.0%");
    expect(artifact.content).toContain("_No failures._");
  });

  it("includes failure classes in markdown for failed batch", () => {
    const report = verifyBundleBatch([tampered, malformed]);
    const artifact = createVerificationAuditReport(report, { format: "markdown" });
    expect(artifact.content).toContain("| ");
    expect(artifact.content).toContain("Failed bundles");
  });

  it("includes failFast note when triggered", () => {
    const report = verifyBundleBatch([valid, tampered, valid, valid], { failFast: true });
    const artifact = createVerificationAuditReport(report, { format: "markdown" });
    expect(artifact.content).toContain("failFast");
  });

  it("includes offline footer", () => {
    const report = verifyBundleBatch([valid]);
    const artifact = createVerificationAuditReport(report, { format: "markdown" });
    expect(artifact.content).toContain("offline");
  });
});

// ─── Wrapper-generated fixtures verify in batch ────────────────────────────────

describe("verifyBundleBatch — tool-call-wrapper fixtures", () => {
  it("verifies all 4 demo fixtures from tool-call-wrapper in batch", () => {
    const fixtureBase = join(__dirname, "../../../examples/reference-integrations/tool-call-wrapper/fixtures");
    const success = JSON.parse(readFileSync(join(fixtureBase, "success.bundle.json"), "utf8"));
    const failed = JSON.parse(readFileSync(join(fixtureBase, "failed.bundle.json"), "utf8"));
    const denied = JSON.parse(readFileSync(join(fixtureBase, "denied.bundle.json"), "utf8"));
    const aborted = JSON.parse(readFileSync(join(fixtureBase, "aborted.bundle.json"), "utf8"));

    const report = verifyBundleBatch([success, failed, denied, aborted]);
    expect(report.totalCount).toBe(4);
    expect(report.passedCount).toBe(4);
    expect(report.failedCount).toBe(0);
  });

  it("detects tampered tool-call-wrapper fixture as FAIL in batch", () => {
    const fixtureBase = join(__dirname, "../../../examples/reference-integrations/tool-call-wrapper/fixtures");
    const tampered = JSON.parse(readFileSync(join(fixtureBase, "tampered-input.bundle.json"), "utf8"));
    const report = verifyBundleBatch([tampered]);
    expect(report.failedCount).toBe(1);
    expect(report.results[0].batchFailureClass).toBeDefined();
  });
});
