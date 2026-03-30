import { describe, expect, it } from "vitest";
import { sha256Hex, hashCanonical, hashPayload } from "../src/hashing.js";

describe("sha256Hex", () => {
  it("produces a 64-character hex string", () => {
    const hash = sha256Hex("hello");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(sha256Hex("test")).toBe(sha256Hex("test"));
  });

  it("produces different hashes for different inputs", () => {
    expect(sha256Hex("a")).not.toBe(sha256Hex("b"));
  });
});

describe("hashCanonical", () => {
  it("hashes objects deterministically regardless of key order", () => {
    const a = hashCanonical({ b: 2, a: 1 });
    const b = hashCanonical({ a: 1, b: 2 });
    expect(a).toBe(b);
  });

  it("returns a 64-char hex string", () => {
    const hash = hashCanonical({ key: "value" });
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("hashPayload", () => {
  it("matches hashCanonical for the same object", () => {
    const obj = { action: "test", value: 42 };
    expect(hashPayload(obj)).toBe(hashCanonical(obj));
  });
});
