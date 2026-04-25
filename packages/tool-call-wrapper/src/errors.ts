/**
 * Tool Call Passport Wrapper — safe error normalisation.
 *
 * Raw stack traces are never surfaced by default.
 * This file must have zero external dependencies.
 */

import type { NormalizedToolCallError } from "./types.js";

/**
 * Normalize any thrown value into a safe, stack-free error descriptor.
 * Only name, message, and an optional code property are preserved.
 */
export function normalizeError(thrown: unknown): NormalizedToolCallError {
  if (thrown instanceof Error) {
    const base: NormalizedToolCallError = {
      name: thrown.name || "Error",
      message: truncateMessage(thrown.message),
    };
    // Preserve error code if present (e.g. NodeJS errors, AbortError)
    const withCode = thrown as Error & { code?: unknown };
    if (typeof withCode.code === "string") {
      return { ...base, code: withCode.code };
    }
    return base;
  }

  if (typeof thrown === "string") {
    return { name: "Error", message: truncateMessage(thrown) };
  }

  if (thrown !== null && typeof thrown === "object") {
    const obj = thrown as Record<string, unknown>;
    return {
      name: typeof obj["name"] === "string" ? obj["name"] : "UnknownError",
      message:
        typeof obj["message"] === "string"
          ? truncateMessage(obj["message"])
          : "An unknown error occurred",
      ...(typeof obj["code"] === "string" ? { code: obj["code"] } : {}),
    };
  }

  return { name: "UnknownError", message: "An unknown error occurred" };
}

/** Truncate very long error messages to prevent receipt bloat. */
function truncateMessage(msg: string, maxLength = 512): string {
  if (msg.length <= maxLength) return msg;
  return msg.slice(0, maxLength) + " [truncated]";
}

/**
 * Detect whether a thrown value represents an abort (AbortError or DOMException).
 */
export function isAbortError(thrown: unknown): boolean {
  if (thrown instanceof Error) {
    if (thrown.name === "AbortError") return true;
    // DOMException with AbortError name
    if (typeof thrown.name === "string" && thrown.name === "AbortError") return true;
  }
  return false;
}

/**
 * A wrapper-internal error thrown when receipt generation fails after
 * execute() has already succeeded. This must never be swallowed silently.
 */
export class ReceiptGenerationError extends Error {
  constructor(
    message: string,
    public readonly executionSucceeded: boolean,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ReceiptGenerationError";
  }
}
