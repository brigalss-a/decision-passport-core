import { createHash } from "crypto";
import { canonicalSerialize } from "./canonical.js";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashCanonical(input: unknown): string {
  return sha256Hex(canonicalSerialize(input));
}

export function hashPayload(payload: Record<string, unknown>): string {
  return hashCanonical(payload);
}
