/**
 * Batch Verification Demo
 *
 * Demonstrates verifyBundleBatch(), classifyVerificationFailures(),
 * and createVerificationAuditReport() using canonical fixtures.
 *
 * Run: pnpm example:batch-verification
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  verifyBundleBatch,
  classifyVerificationFailures,
  createVerificationAuditReport,
} from "@decision-passport/verifier-basic";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "../../../fixtures");
const wrapperFixturesDir = join(
  __dirname,
  "../tool-call-wrapper/fixtures",
);
const outputDir = join(__dirname, "output");

function loadFixture(dir: string, name: string): unknown {
  return JSON.parse(readFileSync(join(dir, name), "utf8"));
}

async function main() {
  mkdirSync(outputDir, { recursive: true });

  // ─── 1. All-pass batch (valid fixtures) ─────────────────────────────────
  console.log("=== 1. All-pass batch ===");
  const allPassBatch = [
    loadFixture(fixturesDir, "valid-bundle.json"),
    loadFixture(fixturesDir, "compatible-optional-metadata.json"),
    loadFixture(wrapperFixturesDir, "success.bundle.json"),
    loadFixture(wrapperFixturesDir, "failed.bundle.json"),
    loadFixture(wrapperFixturesDir, "denied.bundle.json"),
    loadFixture(wrapperFixturesDir, "aborted.bundle.json"),
  ];
  const allPassReport = verifyBundleBatch(allPassBatch, { label: "all-pass-demo" });
  console.log(`totalCount: ${allPassReport.totalCount}`);
  console.log(`passedCount: ${allPassReport.passedCount}`);
  console.log(`failedCount: ${allPassReport.failedCount}`);
  console.log(`failFastTriggered: ${allPassReport.failFastTriggered}`);
  const allPassArtifact = createVerificationAuditReport(allPassReport, { format: "markdown" });
  writeFileSync(join(outputDir, "all-pass-report.md"), allPassArtifact.content);
  console.log("✓ Written: output/all-pass-report.md\n");

  // ─── 2. Mixed batch (valid + invalid) ───────────────────────────────────
  console.log("=== 2. Mixed batch (valid + invalid) ===");
  const mixedBatch = [
    loadFixture(fixturesDir, "valid-bundle.json"),                   // PASS
    loadFixture(fixturesDir, "tampered-bundle.json"),                // FAIL
    loadFixture(wrapperFixturesDir, "success.bundle.json"),          // PASS
    loadFixture(fixturesDir, "malformed-bundle.json"),               // FAIL
    loadFixture(fixturesDir, "unsupported-version.json"),            // FAIL
    loadFixture(wrapperFixturesDir, "tampered-input.bundle.json"),   // FAIL
  ];
  const mixedReport = verifyBundleBatch(mixedBatch, { label: "mixed-demo" });
  console.log(`totalCount: ${mixedReport.totalCount}`);
  console.log(`passedCount: ${mixedReport.passedCount}`);
  console.log(`failedCount: ${mixedReport.failedCount}`);
  console.log("failureSummary.byClass:", JSON.stringify(mixedReport.failureSummary.byClass, null, 2));
  console.log(`failedIndices: [${mixedReport.failureSummary.failedIndices.join(", ")}]`);

  const jsonArtifact = createVerificationAuditReport(mixedReport, {
    format: "json",
    includePassedDetails: true,
  });
  writeFileSync(join(outputDir, "mixed-report.json"), jsonArtifact.content);
  console.log("✓ Written: output/mixed-report.json");

  const mdArtifact = createVerificationAuditReport(mixedReport, { format: "markdown" });
  writeFileSync(join(outputDir, "mixed-report.md"), mdArtifact.content);
  console.log("✓ Written: output/mixed-report.md\n");

  // ─── 3. failFast demo ──────────────────────────────────────────────────
  console.log("=== 3. failFast demo ===");
  const failFastReport = verifyBundleBatch(
    [
      loadFixture(fixturesDir, "valid-bundle.json"),
      loadFixture(fixturesDir, "tampered-bundle.json"),
      loadFixture(fixturesDir, "valid-bundle.json"),  // never evaluated
    ],
    { failFast: true, label: "fail-fast-demo" },
  );
  console.log(`failFastTriggered: ${failFastReport.failFastTriggered}`);
  console.log(`results evaluated: ${failFastReport.results.length} of ${failFastReport.totalCount}`);
  console.log();

  // ─── 4. classifyVerificationFailures standalone ─────────────────────────
  console.log("=== 4. classifyVerificationFailures standalone ===");
  const summary = classifyVerificationFailures(mixedReport.results);
  console.log("standalone classification matches batch:", summary.totalFailed === mixedReport.failureSummary.totalFailed);
  console.log();

  console.log("✅ All batch verification demo flows completed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
