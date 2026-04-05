/**
 * Generates canonical verification fixtures:
 *   fixtures/valid-bundle.json
 *   fixtures/tampered-bundle.json
 *   fixtures/chain-break-bundle.json
 *   fixtures/manifest-mismatch-bundle.json
 *   fixtures/missing-record-bundle.json
 *   fixtures/malformed-bundle.json
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

// Payload tamper case
const tamperedBundle = structuredClone(validBundle);
tamperedBundle.passport_records[1] = {
  ...tamperedBundle.passport_records[1],
  payload: {
    approved_recommendation_id: record1.id,
    note: "TAMPERED, approval was forged"
  }
  // record_hash and payload_hash are stale, verification should fail
};

// Chain break case
const chainBreakBundle = structuredClone(validBundle);
chainBreakBundle.passport_records[2] = {
  ...chainBreakBundle.passport_records[2],
  prev_hash: "0".repeat(64),
};

// Manifest mismatch case
const manifestMismatchBundle = structuredClone(validBundle);
manifestMismatchBundle.manifest = {
  ...manifestMismatchBundle.manifest,
  chain_hash: "f".repeat(64),
};

// Missing record case
const missingRecordBundle = structuredClone(validBundle);
missingRecordBundle.passport_records.splice(1, 1);

// Malformed shape case
const malformedBundle = {
  bundle_version: "1.4-basic",
  exported_at_utc: "2026-01-15T12:00:00.000Z",
  passport_records_typo: [],
  manifest: { chain_hash: "" },
};

const tamperedResult = verifyBasicBundle(tamperedBundle);
if (tamperedResult.status !== "FAIL") {
  console.error("ERROR: payload tampered bundle was not rejected");
  process.exit(1);
}

const chainBreakResult = verifyBasicBundle(chainBreakBundle);
if (chainBreakResult.status !== "FAIL") {
  console.error("ERROR: chain-break bundle was not rejected");
  process.exit(1);
}

const manifestMismatchResult = verifyBasicBundle(manifestMismatchBundle);
if (manifestMismatchResult.status !== "FAIL") {
  console.error("ERROR: manifest-mismatch bundle was not rejected");
  process.exit(1);
}

const missingRecordResult = verifyBasicBundle(missingRecordBundle);
if (missingRecordResult.status !== "FAIL") {
  console.error("ERROR: missing-record bundle was not rejected");
  process.exit(1);
}

const malformedResult = verifyBasicBundle(malformedBundle);
if (malformedResult.status !== "FAIL") {
  console.error("ERROR: malformed bundle was not rejected");
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

writeFileSync(
  resolve(fixturesDir, "chain-break-bundle.json"),
  JSON.stringify(chainBreakBundle, null, 2) + "\n"
);

writeFileSync(
  resolve(fixturesDir, "manifest-mismatch-bundle.json"),
  JSON.stringify(manifestMismatchBundle, null, 2) + "\n"
);

writeFileSync(
  resolve(fixturesDir, "missing-record-bundle.json"),
  JSON.stringify(missingRecordBundle, null, 2) + "\n"
);

writeFileSync(
  resolve(fixturesDir, "malformed-bundle.json"),
  JSON.stringify(malformedBundle, null, 2) + "\n"
);

console.log("Fixtures generated:");
console.log(`  fixtures/valid-bundle.json              verification: ${validResult.status}`);
console.log(`  fixtures/tampered-bundle.json           verification: ${tamperedResult.status}`);
console.log(`  fixtures/chain-break-bundle.json        verification: ${chainBreakResult.status}`);
console.log(`  fixtures/manifest-mismatch-bundle.json  verification: ${manifestMismatchResult.status}`);
console.log(`  fixtures/missing-record-bundle.json     verification: ${missingRecordResult.status}`);
console.log(`  fixtures/malformed-bundle.json          verification: ${malformedResult.status}`);
