import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { verifyBasicBundle } from "../packages/verifier-basic/src/verify-bundle.js";

interface ConformanceFixture {
  file: string;
  expected_status: "PASS" | "FAIL";
  required_reason_codes: string[];
}

interface ConformanceManifest {
  schema_version: string;
  category_statement: string;
  corpus_version: string;
  supported_profiles: string[];
  fixtures: ConformanceFixture[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const fixturesDir = resolve(repoRoot, "fixtures");
const manifestPath = resolve(fixturesDir, "conformance-manifest.json");
const artifactDir = resolve(repoRoot, "artifacts");
const snapshotPath = resolve(artifactDir, "conformance-snapshot.json");

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function arrayEquals(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function loadPythonVersion(): string {
  const pyprojectPath = resolve(
    repoRoot,
    "python",
    "decision_passport_py",
    "pyproject.toml",
  );
  const text = readFileSync(pyprojectPath, "utf-8");
  const match = text.match(/version\s*=\s*"([^"]+)"/);
  if (!match) {
    throw new Error("Could not parse Python package version from pyproject.toml");
  }
  return match[1];
}

function runPythonVerifier(bundlePath: string): { status: string; reasonCodes: string[] } {
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
    throw new Error(`Python verifier produced no JSON output for ${bundlePath}. stderr: ${proc.stderr}`);
  }

  let parsed: { status: string; reasonCodes?: string[] };
  try {
    parsed = JSON.parse(proc.stdout) as { status: string; reasonCodes?: string[] };
  } catch (error) {
    throw new Error(
      `Python verifier output was not valid JSON for ${bundlePath}: ${(error as Error).message}`,
    );
  }

  return {
    status: parsed.status,
    reasonCodes: sortedUnique(parsed.reasonCodes ?? []),
  };
}

function main(): void {
  const manifest = loadJson<ConformanceManifest>(manifestPath);
  const rootPkg = loadJson<{ version: string }>(resolve(repoRoot, "package.json"));
  const tsVerifierPkg = loadJson<{ version: string }>(
    resolve(repoRoot, "packages", "verifier-basic", "package.json"),
  );
  const pythonVersion = loadPythonVersion();

  const mismatches: string[] = [];
  const results = manifest.fixtures.map((fixture) => {
    const fixturePath = resolve(fixturesDir, fixture.file);
    const bundle = loadJson<unknown>(fixturePath);
    const tsResult = verifyBasicBundle(bundle);
    const pyResult = runPythonVerifier(fixturePath);

    const expectedCodes = sortedUnique(fixture.required_reason_codes);
    const tsCodes = sortedUnique(tsResult.reasonCodes);
    const pyCodes = sortedUnique(pyResult.reasonCodes);

    const tsMatchesExpected =
      tsResult.status === fixture.expected_status && arrayEquals(tsCodes, expectedCodes);
    const pyMatchesExpected =
      pyResult.status === fixture.expected_status && arrayEquals(pyCodes, expectedCodes);
    const languageParity = tsResult.status === pyResult.status && arrayEquals(tsCodes, pyCodes);

    if (!tsMatchesExpected) {
      mismatches.push(
        `${fixture.file} TypeScript mismatch: expected ${fixture.expected_status} ${JSON.stringify(expectedCodes)} but got ${tsResult.status} ${JSON.stringify(tsCodes)}`,
      );
    }

    if (!pyMatchesExpected) {
      mismatches.push(
        `${fixture.file} Python mismatch: expected ${fixture.expected_status} ${JSON.stringify(expectedCodes)} but got ${pyResult.status} ${JSON.stringify(pyCodes)}`,
      );
    }

    if (!languageParity) {
      mismatches.push(
        `${fixture.file} parity mismatch between TypeScript and Python: TS ${tsResult.status} ${JSON.stringify(tsCodes)} vs PY ${pyResult.status} ${JSON.stringify(pyCodes)}`,
      );
    }

    return {
      fixture: fixture.file,
      expected: {
        status: fixture.expected_status,
        reasonCodes: expectedCodes,
      },
      typescript: {
        status: tsResult.status,
        reasonCodes: tsCodes,
      },
      python: {
        status: pyResult.status,
        reasonCodes: pyCodes,
      },
      parity: languageParity,
    };
  });

  const snapshot = {
    schema_version: "1",
    generated_at_utc: new Date().toISOString(),
    category_statement: manifest.category_statement,
    corpus_version: manifest.corpus_version,
    supported_profiles: manifest.supported_profiles,
    repository_version: rootPkg.version,
    verifier_versions: {
      typescript: tsVerifierPkg.version,
      python: pythonVersion,
    },
    summary: {
      fixture_count: manifest.fixtures.length,
      mismatch_count: mismatches.length,
      parity_status: mismatches.length === 0 ? "PASS" : "FAIL",
    },
    results,
  };

  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf-8");

  if (mismatches.length > 0) {
    for (const mismatch of mismatches) {
      console.error(`CONFORMANCE_MISMATCH ${mismatch}`);
    }
    throw new Error(`Conformance parity failed with ${mismatches.length} mismatches.`);
  }

  console.log(`Conformance parity PASS for ${manifest.fixtures.length} fixtures.`);
  console.log(`Snapshot written to ${snapshotPath}`);
}

main();
