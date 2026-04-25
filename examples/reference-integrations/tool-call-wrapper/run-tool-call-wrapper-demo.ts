/**
 * Tool Call Passport Wrapper — Reference Integration Demo
 *
 * This script demonstrates all four execution flows:
 *   1. SUCCESS  — tool executes and returns a result
 *   2. FAILED   — tool throws an error
 *   3. DENIED   — authorization not approved
 *   4. ABORTED  — AbortSignal already aborted before execution
 *
 * No external APIs are called. All tool functions are local async stubs.
 * Generated bundles are written to fixtures/ for reference.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { withDecisionPassportToolCall } from "@decision-passport/tool-call-wrapper";
import { verifyBasicBundle } from "@decision-passport/verifier-basic";
import type { BasicProofBundle } from "@decision-passport/core";
import type { PassportRecord } from "@decision-passport/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "fixtures");
mkdirSync(fixturesDir, { recursive: true });

// ---------------------------------------------------------------------------
// Fake tool implementations (no external calls)
// ---------------------------------------------------------------------------

async function fakeSendEmail(to: string, _subject: string): Promise<{ messageId: string }> {
  void to;
  return { messageId: `msg_demo` };
}

async function fakeAnalyzeDocument(docId: string): Promise<{ category: string; confidence: number }> {
  if (docId === "invalid") throw new Error("Document not found: " + docId);
  return { category: "finance", confidence: 0.97 };
}

// ---------------------------------------------------------------------------
// Main demo runner
// ---------------------------------------------------------------------------

async function main(): Promise<void> {

  // --- 1. SUCCESS flow ------------------------------------------------------
  console.log("\n=== 1. SUCCESS flow ===");

  const successReceipt = await withDecisionPassportToolCall({
    actor: { id: "agent-mailer", type: "ai_agent", displayName: "Email Dispatch Agent" },
    tool: { name: "send_email", version: "1.0.0", provider: "local-smtp" },
    authorization: {
      type: "policy",
      approved: true,
      policyVersion: "policy-v1",
      reason: "Allowed by communication policy",
    },
    input: { to: "client@example.com", subject: "Project update" },
    execute: async (ctx) => {
      const input = ctx.input as { to: string; subject: string };
      return fakeSendEmail(input.to, input.subject);
    },
    options: { includeRawOutput: true },
  });

  console.log("status:", successReceipt.status);
  console.log("inputHash:", successReceipt.inputHash);
  console.log("outputHash:", successReceipt.outputHash);
  console.log("verification.ok:", successReceipt.verification.ok);
  writeFileSync(
    resolve(fixturesDir, "success.bundle.json"),
    JSON.stringify(successReceipt.bundle, null, 2),
  );
  console.log("✓ Written: fixtures/success.bundle.json");

  // --- 2. FAILED flow -------------------------------------------------------
  console.log("\n=== 2. FAILED flow ===");

  const failedReceipt = await withDecisionPassportToolCall({
    actor: { id: "agent-analyst", type: "ai_agent" },
    tool: { name: "analyze_document", version: "2.0.0" },
    authorization: {
      type: "policy",
      approved: true,
      policyVersion: "policy-v2",
    },
    input: { docId: "invalid" },
    execute: async (ctx) => {
      return fakeAnalyzeDocument((ctx.input as { docId: string }).docId);
    },
  });

  console.log("status:", failedReceipt.status);
  console.log("inputHash:", failedReceipt.inputHash);
  console.log("errorHash:", failedReceipt.errorHash);
  console.log("verification.ok:", failedReceipt.verification.ok);
  writeFileSync(
    resolve(fixturesDir, "failed.bundle.json"),
    JSON.stringify(failedReceipt.bundle, null, 2),
  );
  console.log("✓ Written: fixtures/failed.bundle.json");

  // --- 3. DENIED flow -------------------------------------------------------
  console.log("\n=== 3. DENIED flow ===");

  const deniedReceipt = await withDecisionPassportToolCall({
    actor: { id: "agent-risky", type: "ai_agent" },
    tool: { name: "delete_production_table", version: "1.0.0" },
    authorization: {
      type: "policy",
      approved: false,
      reason: "Destructive operations require explicit human approval",
      policyVersion: "policy-v1",
    },
    input: { table: "users", environment: "production" },
    execute: async () => {
      throw new Error("Should never run");
    },
  });

  console.log("status:", deniedReceipt.status);
  console.log("inputHash:", deniedReceipt.inputHash);
  console.log("verification.ok:", deniedReceipt.verification.ok);
  writeFileSync(
    resolve(fixturesDir, "denied.bundle.json"),
    JSON.stringify(deniedReceipt.bundle, null, 2),
  );
  console.log("✓ Written: fixtures/denied.bundle.json");

  // --- 4. ABORTED flow ------------------------------------------------------
  console.log("\n=== 4. ABORTED flow ===");

  const controller = new AbortController();
  controller.abort(); // Pre-abort before execution

  const abortedReceipt = await withDecisionPassportToolCall({
    actor: { id: "agent-01", type: "ai_agent" },
    tool: { name: "long_running_export" },
    authorization: { type: "policy", approved: true },
    input: { format: "csv", rows: 1_000_000 },
    execute: async () => {
      throw new Error("Should never run");
    },
    options: { abortSignal: controller.signal },
  });

  console.log("status:", abortedReceipt.status);
  console.log("inputHash:", abortedReceipt.inputHash);
  console.log("verification.ok:", abortedReceipt.verification.ok);
  writeFileSync(
    resolve(fixturesDir, "aborted.bundle.json"),
    JSON.stringify(abortedReceipt.bundle, null, 2),
  );
  console.log("✓ Written: fixtures/aborted.bundle.json");

  // --- Tampered bundle example (demonstrates verifier detecting tampering) ---
  console.log("\n=== Tampered bundle example ===");

  const tampered: BasicProofBundle = JSON.parse(JSON.stringify(successReceipt.bundle)) as BasicProofBundle;
  const records = tampered.passport_records as PassportRecord[];
  (records[0] as Record<string, unknown>)["payload"] = {
    ...(records[0]!.payload as Record<string, unknown>),
    tool_name: "INJECTED_TOOL",
  };
  const tamperedResult = verifyBasicBundle(tampered);
  writeFileSync(
    resolve(fixturesDir, "tampered-input.bundle.json"),
    JSON.stringify(tampered, null, 2),
  );
  console.log("Tampered verification status:", tamperedResult.status); // FAIL
  console.log("✓ Written: fixtures/tampered-input.bundle.json");

  console.log("\n✅ All demo flows completed successfully.");
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});

