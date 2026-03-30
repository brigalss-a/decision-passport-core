import { createRecord, createManifest } from "@decision-passport/core";
import { verifyBasicBundle } from "@decision-passport/verifier-basic";
import { TerminalFormatter, printBlock } from "./lib/terminal.js";

const term = new TerminalFormatter();

const chainId = "demo-chain-001";

const record1 = createRecord({
  chainId,
  lastRecord: null,
  actorId: "ai-agent-01",
  actorType: "ai_agent",
  actionType: "AI_RECOMMENDATION",
  payload: {
    proposed_action: {
      type: "APPROVE_CHANGE_ORDER",
      change_order_id: "CO-2026-0042",
      cost_delta_gbp: 2400
    },
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
    approved_recommendation_id: record1.id
  }
});

const bundle = {
  bundle_version: "1.4-basic" as const,
  exported_at_utc: new Date().toISOString(),
  passport_records: [record1, record2],
  manifest: createManifest([record1, record2])
};

const result = verifyBasicBundle(bundle);
console.log(JSON.stringify({ bundle, result }, null, 2));

printBlock("");
printBlock(term.heading(" Decision Passport — Demo Summary"));
printBlock(
  term.list([
    term.kv("Chain ID", bundle.manifest.chain_id),
    term.kv("Records", bundle.passport_records.length),
    term.kv("Bundle", "EXPORTED"),
    term.kv("Verification", result.status === "PASS"
      ? term.status("check", "PASS")
      : term.status("cross", "FAIL")),
  ]),
);
printBlock(term.rule("heavyLine"));
