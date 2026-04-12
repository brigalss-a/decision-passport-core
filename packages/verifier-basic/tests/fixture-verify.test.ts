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
  expected_authorization_status?: string;
  expected_payload_binding_status?: string;
  expected_runtime_claim_status?: string;
  expected_outcome_linkage_status?: string;
  expected_revocation_status?: string;
  expected_supersession_status?: string;
  expected_trail_linkage_status?: string;
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
      if (entry.expected_authorization_status) {
        expect(result.authorization_status, `${entry.fixture} authorization_status`).toBe(entry.expected_authorization_status);
      }
      if (entry.expected_payload_binding_status) {
        expect(result.payload_binding_status, `${entry.fixture} payload_binding_status`).toBe(entry.expected_payload_binding_status);
      }
      if (entry.expected_runtime_claim_status) {
        expect(result.runtime_claim_status, `${entry.fixture} runtime_claim_status`).toBe(entry.expected_runtime_claim_status);
      }
      if (entry.expected_outcome_linkage_status) {
        expect(result.outcome_linkage_status, `${entry.fixture} outcome_linkage_status`).toBe(entry.expected_outcome_linkage_status);
      }
      if (entry.expected_revocation_status) {
        expect(result.revocation_status, `${entry.fixture} revocation_status`).toBe(entry.expected_revocation_status);
      }
      if (entry.expected_supersession_status) {
        expect(result.supersession_status, `${entry.fixture} supersession_status`).toBe(entry.expected_supersession_status);
      }
      if (entry.expected_trail_linkage_status) {
        expect(result.trail_linkage_status, `${entry.fixture} trail_linkage_status`).toBe(entry.expected_trail_linkage_status);
      }
      expect(result.auditor_findings.length, `${entry.fixture} findings`).toBeGreaterThan(0);
    }
  });
});
