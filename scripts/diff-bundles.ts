#!/usr/bin/env node
/**
 * CLI: diff two Decision Passport bundles.
 *
 * Usage:
 *   pnpm tsx scripts/diff-bundles.ts <bundle-a.json> <bundle-b.json>
 *   pnpm tsx scripts/diff-bundles.ts --json <bundle-a.json> <bundle-b.json>
 *
 * --json  Output machine-readable JSON instead of human-readable text.
 */
import { readFileSync } from "fs";
import { diffBundles } from "../packages/core/src/bundle-diff.js";
import { formatDiffText, formatDiffJson } from "../packages/core/src/bundle-diff-report.js";

const rawArgs = process.argv.slice(2);
const jsonMode = rawArgs.includes("--json");
const args = rawArgs.filter((a) => a !== "--json");

if (args.length !== 2) {
  console.error("Usage: pnpm diff-bundles [--json] <bundle-a.json> <bundle-b.json>");
  process.exit(1);
}

const [pathA, pathB] = args;

const bundleA = JSON.parse(readFileSync(pathA, "utf8"));
const bundleB = JSON.parse(readFileSync(pathB, "utf8"));

const result = diffBundles(bundleA, bundleB);

if (jsonMode) {
  console.log(JSON.stringify(formatDiffJson(result), null, 2));
  process.exit(result.identical ? 0 : 1);
}

if (result.identical) {
  console.log("✓ Bundles are identical.");
  process.exit(0);
}

console.log(`✗ ${result.summary}\n`);
console.log(formatDiffText(result));
process.exit(1);

