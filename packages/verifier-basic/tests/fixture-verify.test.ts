import { describe, expect, it, beforeAll } from "vitest";
import { verifyBasicBundle } from "../src/verify-bundle.js";
import type { BasicProofBundle } from "@decision-passport/core";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "..", "..", "..", "fixtures");
const manifestPath = resolve(fixturesDir, "conformance-manifest.json");

interface ConformanceFixture {
  fixture: string;
  expected_status: "PASS" | "FAIL";
  expected_verdict: "VALID" | "INVALID";
  expected_code: string;
  expected_location: string;
}

interface ConformanceManifest {
  fixtures: ConformanceFixture[];
}

describe("fixture verification", () => {
  let manifest: ConformanceManifest;

  beforeAll(() => {
    if (!existsSync(manifestPath)) {
      throw new Error(`Missing canonical conformance manifest: ${manifestPath}`);
    }

    manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    if (!Array.isArray(manifest.fixtures) || manifest.fixtures.length === 0) {
      throw new Error("Canonical conformance manifest has no fixtures; cannot validate verifier surface");
    }
  });

  it("all canonical fixtures match manifest expectations", () => {
    for (const entry of manifest.fixtures) {
      const fixturePath = resolve(fixturesDir, entry.fixture);
      if (!existsSync(fixturePath)) {
        throw new Error(`Missing canonical fixture referenced by conformance manifest: ${entry.fixture}`);
      }
      const bundle = JSON.parse(readFileSync(fixturePath, "utf-8")) as BasicProofBundle;
      const result = verifyBasicBundle(bundle);

      expect(result.status, `${entry.fixture} status`).toBe(entry.expected_status);
      expect(result.verdict, `${entry.fixture} verdict`).toBe(entry.expected_verdict);
      expect(result.code, `${entry.fixture} code`).toBe(entry.expected_code);
      expect(result.location, `${entry.fixture} location`).toBe(entry.expected_location);
      expect(result.auditor_findings.length, `${entry.fixture} findings`).toBeGreaterThan(0);
    }
  });
});
