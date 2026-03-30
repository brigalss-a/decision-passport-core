/**
 * CI verification script.
 * Builds a demo bundle and asserts verification passes.
 * Generates artifacts/verification-report.html and artifacts/verification-summary.json.
 * Exit code 0 = PASS, exit code 1 = FAIL.
 */
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRecord, createManifest, explainTamper } from "@decision-passport/core";
import { verifyBasicBundle, renderVerificationReport } from "@decision-passport/verifier-basic";
import { TerminalFormatter, printBlock } from "../packages/demo/src/lib/terminal.js";

const term = new TerminalFormatter({ forceAscii: true });
const __dirname = dirname(fileURLToPath(import.meta.url));
const artifactsDir = join(__dirname, "..", "artifacts");
mkdirSync(artifactsDir, { recursive: true });

const chainId = "ci-verify-chain";

const record1 = createRecord({
  chainId,
  lastRecord: null,
  actorId: "ci-agent",
  actorType: "ai_agent",
  actionType: "AI_RECOMMENDATION",
  payload: { action: "test", confidence: 0.95 }
});

const record2 = createRecord({
  chainId,
  lastRecord: record1,
  actorId: "ci-human",
  actorType: "human",
  actionType: "HUMAN_APPROVAL_GRANTED",
  payload: { approved: true }
});

const bundle = {
  bundle_version: "1.4-basic" as const,
  exported_at_utc: new Date().toISOString(),
  passport_records: [record1, record2],
  manifest: createManifest([record1, record2])
};

const result = verifyBasicBundle(bundle);

if (result.status !== "PASS") {
  printBlock(term.status("cross", "VERIFY-DEMO FAILED"));
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

// Also verify a tampered bundle is caught
const tampered = structuredClone(bundle);
tampered.passport_records[0] = {
  ...tampered.passport_records[0],
  payload: { action: "TAMPERED", confidence: 0 }
};

const tamperedResult = verifyBasicBundle(tampered);
if (tamperedResult.status !== "FAIL") {
  printBlock(term.status("cross", "VERIFY-DEMO FAILED: tampered bundle was not rejected"));
  process.exit(1);
}

// Generate artifacts
const generatedAt = new Date().toISOString();
const validExplanation = explainTamper(bundle.passport_records, bundle.manifest);
const tamperedExplanation = explainTamper(tampered.passport_records, tampered.manifest);

const validReport = renderVerificationReport({
  bundle,
  result,
  explanation: validExplanation,
  generatedAt,
});

const tamperedReport = renderVerificationReport({
  bundle: tampered,
  result: tamperedResult,
  explanation: tamperedExplanation,
  generatedAt,
});

writeFileSync(join(artifactsDir, "verification-report.html"), validReport);
writeFileSync(join(artifactsDir, "tampered-report.html"), tamperedReport);

const summary = {
  generatedAt,
  valid: { status: result.status, checks: result.checks.length, tamperFindings: validExplanation.findings.length },
  tampered: { status: tamperedResult.status, checks: tamperedResult.checks.length, tamperFindings: tamperedExplanation.findings.length },
};
writeFileSync(join(artifactsDir, "verification-summary.json"), JSON.stringify(summary, null, 2));

printBlock(term.status("check", "verify-demo: PASS (valid bundle accepted, tampered bundle rejected)"));
printBlock(term.status("info", `Artifacts written to artifacts/`));
