import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createManifest, createRecord } from "@decision-passport/core";
import { verifyBasicBundle } from "@decision-passport/verifier-basic";

const outDir = resolve("artifacts", "reference-integrations");
mkdirSync(outDir, { recursive: true });

const chainId = "ref-webhook-approval";

const record0 = createRecord({
  chainId,
  lastRecord: null,
  actorId: "agent-router",
  actorType: "ai_agent",
  actionType: "AI_RECOMMENDATION",
  payload: {
    scenario: "webhook_approval_receipt",
    event_type: "payment_webhook",
    event_id: "evt-1001",
    intent: "dispatch_approved_webhook",
  },
});

const record1 = createRecord({
  chainId,
  lastRecord: record0,
  actorId: "reviewer-01",
  actorType: "human",
  actionType: "HUMAN_APPROVAL_GRANTED",
  payload: {
    approved_event_id: "evt-1001",
    approval_scope: "webhook_dispatch",
  },
});

const record2 = createRecord({
  chainId,
  lastRecord: record1,
  actorId: "worker-webhook",
  actorType: "system",
  actionType: "EXECUTION_SUCCEEDED",
  payload: {
    dispatch_id: "wh-2001",
    delivered: true,
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
