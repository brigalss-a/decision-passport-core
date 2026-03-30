import { describe, expect, it } from "vitest";
import { canonicalSerialize } from "../src/canonical.js";

describe("canonicalSerialize", () => {
  it("sorts object keys deterministically", () => {
    expect(canonicalSerialize({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it("handles deeply nested objects with sorted keys", () => {
    const input = { z: { b: 2, a: 1 }, a: 1 };
    expect(canonicalSerialize(input)).toBe('{"a":1,"z":{"a":1,"b":2}}');
  });

  it("produces identical output regardless of key insertion order", () => {
    const a = { name: "test", action: "run", id: 1 };
    const b = { id: 1, action: "run", name: "test" };
    expect(canonicalSerialize(a)).toBe(canonicalSerialize(b));
  });

  it("serializes strings with JSON escaping", () => {
    expect(canonicalSerialize("hello")).toBe('"hello"');
    expect(canonicalSerialize('say "hi"')).toBe('"say \\"hi\\""');
  });

  it("serializes booleans", () => {
    expect(canonicalSerialize(true)).toBe("true");
    expect(canonicalSerialize(false)).toBe("false");
  });

  it("serializes null and undefined as null", () => {
    expect(canonicalSerialize(null)).toBe("null");
    expect(canonicalSerialize(undefined)).toBe("null");
  });

  it("serializes integers without decimal", () => {
    expect(canonicalSerialize(42)).toBe("42");
    expect(canonicalSerialize(0)).toBe("0");
    expect(canonicalSerialize(-7)).toBe("-7");
  });

  it("serializes negative zero as zero", () => {
    expect(canonicalSerialize(-0)).toBe("0");
  });

  it("serializes floats", () => {
    expect(canonicalSerialize(3.14)).toBe("3.14");
  });

  it("throws on non-finite numbers", () => {
    expect(() => canonicalSerialize(Infinity)).toThrow("Non-finite number");
    expect(() => canonicalSerialize(-Infinity)).toThrow("Non-finite number");
    expect(() => canonicalSerialize(NaN)).toThrow("Non-finite number");
  });

  it("serializes arrays", () => {
    expect(canonicalSerialize([1, "a", true])).toBe('[1,"a",true]');
  });

  it("serializes empty objects and arrays", () => {
    expect(canonicalSerialize({})).toBe("{}");
    expect(canonicalSerialize([])).toBe("[]");
  });

  it("throws on unsupported types", () => {
    expect(() => canonicalSerialize(Symbol("x"))).toThrow("Unsupported type");
  });
});
