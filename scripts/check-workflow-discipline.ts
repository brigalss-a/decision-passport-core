import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function assertContains(text: string, needle: string, label: string): void {
  if (!text.includes(needle)) {
    throw new Error(`Workflow discipline check failed: missing ${label}`);
  }
}

function main(): void {
  const releasePath = resolve(repoRoot, ".github", "workflows", "release.yml");
  const releaseYml = readFileSync(releasePath, "utf-8");

  // Canonical release must verify the same trust-critical surfaces as CI.
  const requiredReleaseSteps = [
    "pnpm install --frozen-lockfile",
    "pnpm build",
    "pnpm typecheck",
    "pnpm lint",
    "pnpm test",
    "pnpm example:smoke",
    "python -m decision_passport.verify examples/reference-integrations/webhook-approval-receipt.bundle.json",
    "python -m decision_passport.verify examples/reference-integrations/agent-tool-execution-receipt.bundle.json",
    "pnpm conformance",
    "pnpm verify-demo",
  ];

  for (const step of requiredReleaseSteps) {
    assertContains(releaseYml, step, `release gate: ${step}`);
  }

  // Canonical release notes source must be enforced.
  assertContains(releaseYml, "notes_file=\"RELEASE_NOTES_${GITHUB_REF_NAME}.md\"", "tag-bound release notes filename resolution");
  assertContains(releaseYml, "Missing canonical release notes file:", "clear failure message for missing release notes file");
  assertContains(releaseYml, "body_path: ${{ steps.notes.outputs.file }}", "release body from canonical release notes file");

  // Identity-grade provenance must remain enabled on the canonical release path.
  assertContains(releaseYml, "attestations: write", "release workflow attestations permission");
  assertContains(releaseYml, "id-token: write", "release workflow OIDC permission");
  assertContains(releaseYml, "actions/attest-build-provenance@", "release artifact attestation step");
  assertContains(releaseYml, "subject-path: release-artifacts/*", "attestation subject scope");

  console.log("Workflow discipline check PASS.");
}

main();
