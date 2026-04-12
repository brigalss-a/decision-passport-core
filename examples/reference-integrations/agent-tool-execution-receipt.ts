import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { GENESIS_HASH, createManifest, hashCanonical, hashPayload } from "@decision-passport/core";
import { verifyBasicBundle } from "@decision-passport/verifier-basic";

type ActorType = "human" | "ai_agent" | "system" | "policy";

function buildRecord(params: {
  id: string;
  chain_id: string;
  sequence: number;
  timestamp_utc: string;
  actor_id: string;
  actor_type: ActorType;
  action_type:
    | "AI_RECOMMENDATION"
    | "POLICY_APPROVAL_GRANTED"
    | "EXECUTION_SUCCEEDED";
  payload: Record<string, unknown>;
  prev_hash: string;
}) {
  const payload_hash = hashPayload(params.payload);
  const withoutHash = {
    ...params,
    payload_hash,
  };
  return {
    ...withoutHash,
    record_hash: hashCanonical(withoutHash),
  };
}

const outDir = resolve("artifacts", "reference-integrations");
mkdirSync(outDir, { recursive: true });

const chainId = "ref-agent-tool-exec";

const record0 = buildRecord({
  id: "ref-agent-r0",
  chain_id: chainId,
  sequence: 0,
  timestamp_utc: "2026-04-12T00:10:00.000Z",
  actor_id: "agent-ops",
  actor_type: "ai_agent",
  action_type: "AI_RECOMMENDATION",
  prev_hash: GENESIS_HASH,
  payload: {
    scenario: "agent_tool_execution_receipt",
    tool: "document_classifier",
    intent: "classify_document",
    document_id: "doc-334",
  },
});

const record1 = buildRecord({
  id: "ref-agent-r1",
  chain_id: chainId,
  sequence: 1,
  timestamp_utc: "2026-04-12T00:10:01.000Z",
  actor_id: "policy-engine",
  actor_type: "policy",
  action_type: "POLICY_APPROVAL_GRANTED",
  prev_hash: record0.record_hash,
  payload: {
    policy_id: "pol-doc-allow-v1",
    authorization_scope: "tool_execution",
  },
});

const record2 = buildRecord({
  id: "ref-agent-r2",
  chain_id: chainId,
  sequence: 2,
  timestamp_utc: "2026-04-12T00:10:02.000Z",
  actor_id: "tool-runner",
  actor_type: "system",
  action_type: "EXECUTION_SUCCEEDED",
  prev_hash: record1.record_hash,
  payload: {
    tool_run_id: "run-778",
    classification: "invoice",
  },
});

const bundle = {
  bundle_version: "1.4-basic" as const,
  exported_at_utc: "2026-04-12T00:10:03.000Z",
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
