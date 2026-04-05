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
    checks: [
      {
        name: "bundle_structure",
        passed: false,
        message: error instanceof Error ? error.message : "Unknown JSON parse error",
      },
    ],
    reasonCodes: ["MALFORMED_BUNDLE"],
    nextSteps: [
      "Validate JSON syntax and required fields before running verification.",
    ],
  };
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === "PASS" ? 0 : 1);
