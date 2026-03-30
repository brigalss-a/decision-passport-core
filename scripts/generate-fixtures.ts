/**
 * Generates deterministic test fixtures:
 *   fixtures/valid-bundle.json   — a bundle that verifies as PASS
 *   fixtures/tampered-bundle.json — identical but with payload tampered (verifies as FAIL)
 *
 * Usage: tsx scripts/generate-fixtures.ts
 */
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRecord, createManifest } from "@decision-passport/core";
import { verifyBasicBundle } from "@decision-passport/verifier-basic";
import type { BasicProofBundle } from "@decision-passport/core";

const __dirname = dirname(fileURLToPath(import.meta.url));

const chainId = "fixture-chain-001";

const record1 = createRecord({
  chainId,
  lastRecord: null,
  actorId: "ai-agent-01",
  actorType: "ai_agent",
  actionType: "AI_RECOMMENDATION",
  payload: {
    action: "approve_change_order",
    change_order_id: "CO-2026-0042",
    confidence: 0.94
  }
});

const record2 = createRecord({
  chainId,
  lastRecord: record1,
  actorId: "human-approver-01",
  actorType: "human",
  actionType: "HUMAN_APPROVAL_GRANTED",
  payload: {
    approved_recommendation_id: record1.id,
    note: "Reviewed and approved"
  }
});

const record3 = createRecord({
  chainId,
  lastRecord: record2,
  actorId: "ai-agent-01",
  actorType: "ai_agent",
  actionType: "EXECUTION_SUCCEEDED",
  payload: {
    result: "Change order executed",
    execution_id: "exec-001"
  }
});

const records = [record1, record2, record3];
const validBundle: BasicProofBundle = {
  bundle_version: "1.4-basic",
  exported_at_utc: "2026-01-15T12:00:00.000Z",
  passport_records: records,
  manifest: createManifest(records)
};

// Verify valid bundle is actually valid
const validResult = verifyBasicBundle(validBundle);
if (validResult.status !== "PASS") {
  console.error("ERROR: valid bundle did not pass verification");
  process.exit(1);
}

// Create tampered bundle (change payload of record[1] without recalculating hashes)
const tamperedBundle = structuredClone(validBundle);
tamperedBundle.passport_records[1] = {
  ...tamperedBundle.passport_records[1],
  payload: {
    approved_recommendation_id: record1.id,
    note: "TAMPERED — approval was forged"
  }
  // record_hash and payload_hash are now stale → verification should FAIL
};

// Verify tampered bundle is actually caught
const tamperedResult = verifyBasicBundle(tamperedBundle);
if (tamperedResult.status !== "FAIL") {
  console.error("ERROR: tampered bundle was not rejected");
  process.exit(1);
}

const fixturesDir = resolve(__dirname, "..", "fixtures");

writeFileSync(
  resolve(fixturesDir, "valid-bundle.json"),
  JSON.stringify(validBundle, null, 2) + "\n"
);

writeFileSync(
  resolve(fixturesDir, "tampered-bundle.json"),
  JSON.stringify(tamperedBundle, null, 2) + "\n"
);

console.log("Fixtures generated:");
console.log(`  fixtures/valid-bundle.json     → verification: ${validResult.status}`);
console.log(`  fixtures/tampered-bundle.json  → verification: ${tamperedResult.status}`);
