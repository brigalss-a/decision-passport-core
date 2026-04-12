#!/usr/bin/env node
import { readFileSync } from "fs";
import { verifyBasicBundle } from "./verify-bundle.js";
import type { BasicVerifierResult } from "./types.js";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: dp-verify-basic <bundle.json>");
  process.exit(1);
}

let result: BasicVerifierResult;

try {
  const bundle = JSON.parse(readFileSync(filePath, "utf8"));
  result = verifyBasicBundle(bundle);
} catch (error) {
  result = {
    status: "FAIL",
    summary: "Verification failed because bundle JSON could not be parsed.",
    verdict: "INVALID",
    code: "BUNDLE_MALFORMED",
    location: "$",
    reason: "Bundle JSON could not be parsed.",
    remediation_hint: "Validate JSON syntax and required fields before running verification.",
    failure_class: "schema",
    auditor_findings: [
      {
        verdict: "INVALID",
        code: "BUNDLE_MALFORMED",
        location: "$",
        reason: "Bundle JSON could not be parsed.",
        remediation_hint: "Validate JSON syntax and required fields before running verification.",
        failure_class: "schema",
      },
    ],
    checks: [
      {
        name: "bundle_structure",
        passed: false,
        message: error instanceof Error ? error.message : "Unknown JSON parse error",
      },
    ],
    reasonCodes: ["MALFORMED_BUNDLE"],
    authorization_status: "NOT_EVALUATED",
    payload_binding_status: "NOT_PRESENT",
    runtime_claim_status: "NOT_PRESENT",
    outcome_linkage_status: "NOT_PRESENT",
    revocation_status: "NOT_DECLARED",
    supersession_status: "NOT_DECLARED",
    trail_linkage_status: "NOT_PRESENT",
    nextSteps: [
      "Validate JSON syntax and required fields before running verification.",
    ],
  };
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === "PASS" ? 0 : 1);
