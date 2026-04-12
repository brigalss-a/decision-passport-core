import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createManifest, createRecord } from "@decision-passport/core";
import { verifyBasicBundle } from "@decision-passport/verifier-basic";

const outDir = resolve("artifacts", "reference-integrations");
mkdirSync(outDir, { recursive: true });

const chainId = "ref-agent-tool-exec";

const record0 = createRecord({
  chainId,
  lastRecord: null,
  actorId: "agent-ops",
  actorType: "ai_agent",
  actionType: "AI_RECOMMENDATION",
  payload: {
    scenario: "agent_tool_execution_receipt",
    tool: "document_classifier",
    intent: "classify_document",
    document_id: "doc-334",
  },
});

const record1 = createRecord({
  chainId,
  lastRecord: record0,
  actorId: "policy-engine",
  actorType: "policy",
  actionType: "POLICY_APPROVAL_GRANTED",
  payload: {
    policy_id: "pol-doc-allow-v1",
    authorization_scope: "tool_execution",
  },
});

const record2 = createRecord({
  chainId,
  lastRecord: record1,
  actorId: "tool-runner",
  actorType: "system",
  actionType: "EXECUTION_SUCCEEDED",
  payload: {
    tool_run_id: "run-778",
    classification: "invoice",
  },
});

const bundle = {
  bundle_version: "1.4-basic" as const,
  exported_at_utc: new Date().toISOString(),
  passport_records: [record0, record1, record2],
  manifest: createManifest([record0, record1, record2]),
};

const valid = verifyBasicBundle(bundle);
if (valid.status !== "PASS") {
  throw new Error(`Expected PASS, got ${valid.status} (${valid.code})`);
}

const tampered = structuredClone(bundle);
tampered.passport_records[1] = {
  ...tampered.passport_records[1],
  payload: {
    policy_id: "pol-doc-block-v1",
    authorization_scope: "tool_execution",
  },
};

const invalid = verifyBasicBundle(tampered);
if (invalid.status !== "FAIL") {
  throw new Error(`Expected FAIL for tampered bundle, got ${invalid.status}`);
}

const validPath = resolve(outDir, "agent-tool-execution-receipt.bundle.generated.json");
const tamperedPath = resolve(outDir, "agent-tool-execution-receipt.bundle.tampered.generated.json");
writeFileSync(validPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf-8");
writeFileSync(tamperedPath, `${JSON.stringify(tampered, null, 2)}\n`, "utf-8");

console.log(`VALID_STATUS ${valid.status} ${valid.code}`);
console.log(`TAMPERED_STATUS ${invalid.status} ${invalid.code}`);
console.log(`VALID_BUNDLE ${validPath}`);
console.log(`TAMPERED_BUNDLE ${tamperedPath}`);
