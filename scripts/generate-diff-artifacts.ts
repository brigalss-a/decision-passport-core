/**
 * Generate committed example diff artifacts from the fixture bundles.
 *
 * Produces:
 *   docs/examples/bundle-diff-report.json   machine-readable diff
 *   docs/examples/bundle-diff-report.txt    human-readable diff
 *
 * Run: pnpm tsx scripts/generate-diff-artifacts.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";
import { diffBundles } from "../packages/core/src/bundle-diff.js";
import { formatDiffText, formatDiffJson } from "../packages/core/src/bundle-diff-report.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "docs", "examples");
mkdirSync(outDir, { recursive: true });

const bundleA = JSON.parse(readFileSync(join(root, "fixtures", "valid-bundle.json"), "utf8"));
const bundleB = JSON.parse(readFileSync(join(root, "fixtures", "tampered-bundle.json"), "utf8"));

const result = diffBundles(bundleA, bundleB);

writeFileSync(
  join(outDir, "bundle-diff-report.json"),
  JSON.stringify({ generated_from: "fixtures/valid-bundle.json vs fixtures/tampered-bundle.json", ...formatDiffJson(result) as object }, null, 2)
);

const txtLines = [
  "# Bundle Diff Report",
  "# Source: fixtures/valid-bundle.json vs fixtures/tampered-bundle.json",
  "",
  formatDiffText(result),
];
writeFileSync(join(outDir, "bundle-diff-report.txt"), txtLines.join("\n"));

console.log("[OK] docs/examples/bundle-diff-report.json");
console.log("[OK] docs/examples/bundle-diff-report.txt");
