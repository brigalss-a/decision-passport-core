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
    | "HUMAN_APPROVAL_GRANTED"
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

const chainId = "ref-webhook-approval";

const record0 = buildRecord({
  id: "ref-webhook-r0",
  chain_id: chainId,
  sequence: 0,
  timestamp_utc: "2026-04-12T00:00:00.000Z",
  actor_id: "agent-router",
  actor_type: "ai_agent",
  action_type: "AI_RECOMMENDATION",
  prev_hash: GENESIS_HASH,
  payload: {
    scenario: "webhook_approval_receipt",
    event_type: "payment_webhook",
    event_id: "evt-1001",
    intent: "dispatch_approved_webhook",
  },
});

const record1 = buildRecord({
  id: "ref-webhook-r1",
  chain_id: chainId,
  sequence: 1,
  timestamp_utc: "2026-04-12T00:00:01.000Z",
  actor_id: "reviewer-01",
  actor_type: "human",
  action_type: "HUMAN_APPROVAL_GRANTED",
  prev_hash: record0.record_hash,
  payload: {
    approved_event_id: "evt-1001",
    approval_scope: "webhook_dispatch",
  },
});

const record2 = buildRecord({
  id: "ref-webhook-r2",
  chain_id: chainId,
  sequence: 2,
  timestamp_utc: "2026-04-12T00:00:02.000Z",
  actor_id: "worker-webhook",
  actor_type: "system",
  action_type: "EXECUTION_SUCCEEDED",
  prev_hash: record1.record_hash,
  payload: {
    dispatch_id: "wh-2001",
    delivered: true,
  },
});

const bundle = {
  bundle_version: "1.4-basic" as const,
  exported_at_utc: "2026-04-12T00:00:03.000Z",
  passport_records: [record0, record1, record2],
  manifest: createManifest([record0, record1, record2]),
};

const valid = verifyBasicBundle(bundle);
if (valid.status !== "PASS") {
  throw new Error(`Expected PASS, got ${valid.status} (${valid.code})`);
}

const tampered = structuredClone(bundle);
tampered.passport_records[2] = {
  ...tampered.passport_records[2],
  payload: {
    dispatch_id: "wh-2001",
    delivered: false,
  },
};

const invalid = verifyBasicBundle(tampered);
if (invalid.status !== "FAIL") {
  throw new Error(`Expected FAIL for tampered bundle, got ${invalid.status}`);
}

const validPath = resolve(outDir, "webhook-approval-receipt.bundle.generated.json");
const tamperedPath = resolve(outDir, "webhook-approval-receipt.bundle.tampered.generated.json");
writeFileSync(validPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf-8");
writeFileSync(tamperedPath, `${JSON.stringify(tampered, null, 2)}\n`, "utf-8");

console.log(`VALID_STATUS ${valid.status} ${valid.code}`);
console.log(`TAMPERED_STATUS ${invalid.status} ${invalid.code}`);
console.log(`VALID_BUNDLE ${validPath}`);
console.log(`TAMPERED_BUNDLE ${tamperedPath}`);
