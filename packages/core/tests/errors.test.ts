import { describe, expect, it } from "vitest";
import { CanonicalSerializationError, ChainValidationError } from "../src/errors.js";

describe("CanonicalSerializationError", () => {
  it("has the correct name", () => {
    const err = new CanonicalSerializationError("test");
    expect(err.name).toBe("CanonicalSerializationError");
    expect(err.message).toBe("test");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("ChainValidationError", () => {
  it("has the correct name", () => {
    const err = new ChainValidationError("bad chain");
    expect(err.name).toBe("ChainValidationError");
    expect(err.message).toBe("bad chain");
    expect(err).toBeInstanceOf(Error);
  });
});
