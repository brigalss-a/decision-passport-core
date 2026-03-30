#!/usr/bin/env node
import { readFileSync } from "fs";
import { verifyBasicBundle } from "./verify-bundle.js";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: dp-verify-basic <bundle.json>");
  process.exit(1);
}

const bundle = JSON.parse(readFileSync(filePath, "utf8"));
const result = verifyBasicBundle(bundle);
console.log(JSON.stringify(result, null, 2));
process.exit(result.status === "PASS" ? 0 : 1);
