#!/usr/bin/env node
/**
 * Generate SHA-256 checksums for specified files.
 *
 * Usage:
 *   pnpm tsx scripts/generate-checksums.ts <file1> [file2] [...]
 *
 * Output format (one line per file):
 *   <sha256-hex>  <relative-path>
 *
 * If no arguments are given, checksums are generated for default release-relevant files.
 */
import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import { relative } from "path";

const defaultFiles = [
  "fixtures/valid-bundle.json",
  "fixtures/tampered-bundle.json",
];

const files = process.argv.length > 2 ? process.argv.slice(2) : defaultFiles;

let hasErrors = false;

for (const filePath of files) {
  if (!existsSync(filePath)) {
    console.error(`ERROR: file not found: ${filePath}`);
    hasErrors = true;
    continue;
  }

  const content = readFileSync(filePath);
  const hash = createHash("sha256").update(content).digest("hex");
  const rel = relative(process.cwd(), filePath) || filePath;
  console.log(`${hash}  ${rel}`);
}

if (hasErrors) {
  process.exit(1);
}
