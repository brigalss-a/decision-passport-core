import { CanonicalSerializationError } from "./errors.js";

function serializeNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new CanonicalSerializationError(`Non-finite number: ${value}`);
  }
  if (Object.is(value, -0)) return "0";
  if (Number.isInteger(value)) return String(value);
  return JSON.stringify(value);
}

function serializeValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return serializeNumber(value);

  if (Array.isArray(value)) {
    return `[${value.map(serializeValue).join(",")}]`;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${serializeValue(obj[k])}`).join(",")}}`;
  }

  throw new CanonicalSerializationError(`Unsupported type: ${typeof value}`);
}

export function canonicalSerialize(input: unknown): string {
  return serializeValue(input);
}
