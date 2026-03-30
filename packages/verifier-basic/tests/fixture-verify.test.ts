import { describe, expect, it, beforeAll } from "vitest";
import { verifyBasicBundle } from "../src/verify-bundle.js";
import type { BasicProofBundle } from "@decision-passport/core";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "..", "..", "..", "fixtures");
const validPath = resolve(fixturesDir, "valid-bundle.json");
const tamperedPath = resolve(fixturesDir, "tampered-bundle.json");

const fixturesExist = existsSync(validPath) && existsSync(tamperedPath);

describe.skipIf(!fixturesExist)("fixture verification", () => {
  let validBundle: BasicProofBundle;
  let tamperedBundle: BasicProofBundle;

  beforeAll(() => {
    validBundle = JSON.parse(readFileSync(validPath, "utf-8"));
    tamperedBundle = JSON.parse(readFileSync(tamperedPath, "utf-8"));
  });

  it("valid-bundle.json passes verification", () => {
    const result = verifyBasicBundle(validBundle);
    expect(result.status).toBe("PASS");
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("tampered-bundle.json fails verification", () => {
    const result = verifyBasicBundle(tamperedBundle);
    expect(result.status).toBe("FAIL");
  });

  it("valid bundle has expected structure", () => {
    expect(validBundle.bundle_version).toBe("1.4-basic");
    expect(validBundle.passport_records.length).toBeGreaterThan(0);
    expect(validBundle.manifest.chain_id).toBeTruthy();
    expect(validBundle.manifest.chain_hash).toBeTruthy();
  });
});
