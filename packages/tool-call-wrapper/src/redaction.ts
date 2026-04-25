/**
 * Tool Call Passport Wrapper — redaction utilities.
 *
 * Sensitive fields are redacted before any raw payload is included in a
 * receipt. Redaction applies recursively to nested objects.
 *
 * IMPORTANT: Redaction only affects *raw* payload inclusion
 * (includeRawInput / includeRawOutput). Hashes are always computed from the
 * original, un-redacted values.
 */

import type { RedactionConfig } from "./types.js";

/**
 * Built-in list of field names that are always redacted unless
 * `disableBuiltinList` is set in RedactionConfig.
 *
 * Matching is case-insensitive.
 */
const BUILTIN_SENSITIVE_FIELDS: readonly string[] = [
  "password",
  "secret",
  "token",
  "apikey",
  "authorization",
  "cookie",
  "privatekey",
  "accesstoken",
  "refreshtoken",
];

const REDACTED_PLACEHOLDER = "[REDACTED]";

function buildSensitiveSet(config?: RedactionConfig): Set<string> {
  const names: string[] = [];
  if (!config?.disableBuiltinList) {
    names.push(...BUILTIN_SENSITIVE_FIELDS);
  }
  if (config?.additionalFields) {
    names.push(...config.additionalFields.map((f) => f.toLowerCase()));
  }
  return new Set(names.map((n) => n.toLowerCase()));
}

/**
 * Recursively redact sensitive fields from an object.
 * Arrays of objects are also processed.
 * Returns a new object — the original is never mutated.
 */
export function redactObject(
  value: unknown,
  sensitiveSet: Set<string>,
): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => redactObject(item, sensitiveSet));
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      if (sensitiveSet.has(key.toLowerCase())) {
        result[key] = REDACTED_PLACEHOLDER;
      } else {
        result[key] = redactObject(obj[key], sensitiveSet);
      }
    }
    return result;
  }

  return value;
}

/**
 * Apply redaction to a payload using the provided config.
 * Non-objects (primitives, arrays at top level) are returned as-is after
 * recursive processing.
 */
export function applyRedaction(
  value: unknown,
  config?: RedactionConfig,
): unknown {
  const sensitiveSet = buildSensitiveSet(config);
  return redactObject(value, sensitiveSet);
}
