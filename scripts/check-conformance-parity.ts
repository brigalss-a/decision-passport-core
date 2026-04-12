import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { verifyBasicBundle } from "../packages/verifier-basic/src/verify-bundle.js";

interface ConformanceFixture {
  fixture: string;
  profile: string;
  version: string;
  failure_class: string;
  expected_verdict: "VALID" | "INVALID";
  expected_code: string;
  expected_location: string;
  expected_status: "PASS" | "FAIL";
  notes?: string;
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

interface VerifierSnapshot {
  status: string;
  verdict: string;
  code: string;
  location: string;
  failure_class: string;
}

function runPythonVerifier(bundlePath: string): VerifierSnapshot {
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

  let parsed: VerifierSnapshot;
  try {
    parsed = JSON.parse(proc.stdout) as VerifierSnapshot;
  } catch (error) {
    throw new Error(
      `Python verifier output was not valid JSON for ${bundlePath}: ${(error as Error).message}`,
    );
  }

  return {
    status: parsed.status,
    verdict: parsed.verdict,
    code: parsed.code,
    location: parsed.location,
    failure_class: parsed.failure_class,
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
    const fixturePath = resolve(fixturesDir, fixture.fixture);
    const bundle = loadJson<unknown>(fixturePath);
    const tsResult = verifyBasicBundle(bundle);
    const pyResult = runPythonVerifier(fixturePath);

    const tsMatchesExpected =
      tsResult.status === fixture.expected_status
      && tsResult.verdict === fixture.expected_verdict
      && tsResult.code === fixture.expected_code
      && tsResult.location === fixture.expected_location
      && tsResult.failure_class === fixture.failure_class;

    const pyMatchesExpected =
      pyResult.status === fixture.expected_status
      && pyResult.verdict === fixture.expected_verdict
      && pyResult.code === fixture.expected_code
      && pyResult.location === fixture.expected_location
      && pyResult.failure_class === fixture.failure_class;

    const languageParity =
      tsResult.status === pyResult.status
      && tsResult.verdict === pyResult.verdict
      && tsResult.code === pyResult.code
      && tsResult.location === pyResult.location
      && tsResult.failure_class === pyResult.failure_class;

    if (!tsMatchesExpected) {
      mismatches.push(
        `${fixture.fixture} TypeScript mismatch: expected ${fixture.expected_status}/${fixture.expected_verdict}/${fixture.expected_code}/${fixture.expected_location}/${fixture.failure_class} but got ${tsResult.status}/${tsResult.verdict}/${tsResult.code}/${tsResult.location}/${tsResult.failure_class}`,
      );
    }

    if (!pyMatchesExpected) {
      mismatches.push(
        `${fixture.fixture} Python mismatch: expected ${fixture.expected_status}/${fixture.expected_verdict}/${fixture.expected_code}/${fixture.expected_location}/${fixture.failure_class} but got ${pyResult.status}/${pyResult.verdict}/${pyResult.code}/${pyResult.location}/${pyResult.failure_class}`,
      );
    }

    if (!languageParity) {
      mismatches.push(
        `${fixture.fixture} parity mismatch between TypeScript and Python: TS ${tsResult.status}/${tsResult.verdict}/${tsResult.code}/${tsResult.location}/${tsResult.failure_class} vs PY ${pyResult.status}/${pyResult.verdict}/${pyResult.code}/${pyResult.location}/${pyResult.failure_class}`,
      );
    }

    return {
      fixture: fixture.fixture,
      profile: fixture.profile,
      version: fixture.version,
      expected: {
        status: fixture.expected_status,
        verdict: fixture.expected_verdict,
        code: fixture.expected_code,
        location: fixture.expected_location,
        failure_class: fixture.failure_class,
      },
      typescript: {
        status: tsResult.status,
        verdict: tsResult.verdict,
        code: tsResult.code,
        location: tsResult.location,
        failure_class: tsResult.failure_class,
      },
      python: {
        status: pyResult.status,
        verdict: pyResult.verdict,
        code: pyResult.code,
        location: pyResult.location,
        failure_class: pyResult.failure_class,
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
