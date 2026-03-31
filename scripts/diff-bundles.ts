#!/usr/bin/env node
/**
 * CLI: diff two Decision Passport bundles.
 *
 * Usage:
 *   pnpm tsx scripts/diff-bundles.ts <bundle-a.json> <bundle-b.json>
 */
import { readFileSync } from "fs";
import { diffBundles } from "@decision-passport/core";

const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error("Usage: pnpm diff-bundles <bundle-a.json> <bundle-b.json>");
  process.exit(1);
}

const [pathA, pathB] = args;

const bundleA = JSON.parse(readFileSync(pathA, "utf8"));
const bundleB = JSON.parse(readFileSync(pathB, "utf8"));

const result = diffBundles(bundleA, bundleB);

if (result.identical) {
  console.log("✓ Bundles are identical.");
  process.exit(0);
}

console.log(`✗ ${result.summary}\n`);

for (const finding of result.findings) {
  const icon =
    finding.kind === "record_added"
      ? "+"
      : finding.kind === "record_removed"
        ? "-"
        : "~";
  console.log(`  [${icon}] ${finding.path}: ${finding.message}`);
  if (finding.before !== undefined) console.log(`       before: ${JSON.stringify(finding.before)}`);
  if (finding.after !== undefined) console.log(`       after:  ${JSON.stringify(finding.after)}`);
}

process.exit(1);
