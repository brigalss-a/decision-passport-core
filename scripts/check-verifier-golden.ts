import { readFileSync } from "node:fs";
import { resolve, dirname, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { verifyBasicBundle } from "../packages/verifier-basic/src/verify-bundle.js";

interface Snapshot {
  status: string;
  verdict: string;
  code: string;
  location: string;
  failure_class: string;
  authorization_status?: string;
  payload_binding_status?: string;
  runtime_claim_status?: string;
  outcome_linkage_status?: string;
  revocation_status?: string;
  supersession_status?: string;
  trail_linkage_status?: string;
}

interface GoldenFile {
  schema_version: string;
  fixtures: Record<string, {
    typescript: Snapshot;
    python: Snapshot;
  }>;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const fixturesDir = resolve(repoRoot, "fixtures");
const goldenPath = resolve(fixturesDir, "verifier-golden-outputs.json");
const auditorDocPath = resolve(repoRoot, "docs", "verifier-auditor-output.md");

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function runPython(bundlePath: string): Snapshot {
  const pythonPath = process.env.DP_PYTHON || "python";
  const pythonSrcPath = resolve(repoRoot, "python", "decision_passport_py", "src");
  const env = {
    ...process.env,
    PYTHONPATH: process.env.PYTHONPATH
      ? `${pythonSrcPath}${delimiter}${process.env.PYTHONPATH}`
      : pythonSrcPath,
  };

  const proc = spawnSync(
    pythonPath,
    ["-m", "decision_passport.verify", bundlePath],
    {
      cwd: repoRoot,
      encoding: "utf-8",
      env,
    },
  );

  if (!proc.stdout || proc.stdout.trim().length === 0) {
    throw new Error(`Python verifier produced no output for ${bundlePath}. stderr: ${proc.stderr}`);
  }

  const parsed = JSON.parse(proc.stdout) as Snapshot;
  return {
    status: parsed.status,
    verdict: parsed.verdict,
    code: parsed.code,
    location: parsed.location,
    failure_class: parsed.failure_class,
    authorization_status: parsed.authorization_status,
    payload_binding_status: parsed.payload_binding_status,
    runtime_claim_status: parsed.runtime_claim_status,
    outcome_linkage_status: parsed.outcome_linkage_status,
    revocation_status: parsed.revocation_status,
    supersession_status: parsed.supersession_status,
    trail_linkage_status: parsed.trail_linkage_status,
  };
}

function runTypescript(bundlePath: string): Snapshot {
  const bundle = loadJson<unknown>(bundlePath);
  const result = verifyBasicBundle(bundle);
  return {
    status: result.status,
    verdict: result.verdict,
    code: result.code,
    location: result.location,
    failure_class: result.failure_class,
    authorization_status: result.authorization_status,
    payload_binding_status: result.payload_binding_status,
    runtime_claim_status: result.runtime_claim_status,
    outcome_linkage_status: result.outcome_linkage_status,
    revocation_status: result.revocation_status,
    supersession_status: result.supersession_status,
    trail_linkage_status: result.trail_linkage_status,
  };
}

function assertEqualSnapshot(label: string, expected: Snapshot, actual: Snapshot): void {
  const comparableActual: Snapshot = {
    status: actual.status,
    verdict: actual.verdict,
    code: actual.code,
    location: actual.location,
    failure_class: actual.failure_class,
  };

  for (const key of [
    "authorization_status",
    "payload_binding_status",
    "runtime_claim_status",
    "outcome_linkage_status",
    "revocation_status",
    "supersession_status",
    "trail_linkage_status",
  ] as const) {
    if (typeof expected[key] !== "undefined") {
      comparableActual[key] = actual[key];
    }
  }

  const expectedJson = JSON.stringify(expected);
  const actualJson = JSON.stringify(comparableActual);
  if (expectedJson !== actualJson) {
    throw new Error(`${label} mismatch. expected=${expectedJson} actual=${actualJson}`);
  }
}

function extractJsonCodeBlock(markdown: string, heading: string): Snapshot {
  const headingIndex = markdown.indexOf(heading);
  if (headingIndex === -1) {
    throw new Error(`Missing heading in verifier contract doc: ${heading}`);
  }

  const fencedStart = markdown.indexOf("```json", headingIndex);
  if (fencedStart === -1) {
    throw new Error(`Missing JSON code block after heading: ${heading}`);
  }

  const contentStart = fencedStart + "```json".length;
  const fencedEnd = markdown.indexOf("```", contentStart);
  if (fencedEnd === -1) {
    throw new Error(`Unclosed JSON code block after heading: ${heading}`);
  }

  const jsonText = markdown.slice(contentStart, fencedEnd).trim();
  const parsed = JSON.parse(jsonText) as { status: string; verdict: string; code: string; location: string };

  return {
    status: parsed.status,
    verdict: parsed.verdict,
    code: parsed.code,
    location: parsed.location,
    failure_class: "",
  };
}

function main(): void {
  const golden = loadJson<GoldenFile>(goldenPath);
  const mismatches: string[] = [];

  for (const [fixture, expectations] of Object.entries(golden.fixtures)) {
    const fixturePath = resolve(fixturesDir, fixture);
    const tsActual = runTypescript(fixturePath);
    const pyActual = runPython(fixturePath);

    try {
      assertEqualSnapshot(`${fixture} TypeScript`, expectations.typescript, tsActual);
    } catch (error) {
      mismatches.push((error as Error).message);
    }

    try {
      assertEqualSnapshot(`${fixture} Python`, expectations.python, pyActual);
    } catch (error) {
      mismatches.push((error as Error).message);
    }
  }

  const docText = readFileSync(auditorDocPath, "utf-8");
  const passExample = extractJsonCodeBlock(docText, "PASS example (`fixtures/valid-bundle.json`):");
  const failExample = extractJsonCodeBlock(docText, "FAIL example (`fixtures/tampered-bundle.json`):");

  const validExpected = golden.fixtures["valid-bundle.json"].typescript;
  const tamperedExpected = golden.fixtures["tampered-bundle.json"].typescript;

  const docPassMatches =
    passExample.status === validExpected.status
    && passExample.verdict === validExpected.verdict
    && passExample.code === validExpected.code
    && passExample.location === validExpected.location;

  const docFailMatches =
    failExample.status === tamperedExpected.status
    && failExample.verdict === tamperedExpected.verdict
    && failExample.code === tamperedExpected.code
    && failExample.location === tamperedExpected.location;

  if (!docPassMatches) {
    mismatches.push(
      "Verifier contract doc PASS example drifted from golden outputs.",
    );
  }

  if (!docFailMatches) {
    mismatches.push(
      "Verifier contract doc FAIL example drifted from golden outputs.",
    );
  }

  if (mismatches.length > 0) {
    for (const mismatch of mismatches) {
      console.error(`GOLDEN_MISMATCH ${mismatch}`);
    }
    throw new Error(`Verifier golden contract check failed with ${mismatches.length} mismatch(es).`);
  }

  console.log(`Verifier golden contract PASS for ${Object.keys(golden.fixtures).length} fixtures.`);
}

main();
