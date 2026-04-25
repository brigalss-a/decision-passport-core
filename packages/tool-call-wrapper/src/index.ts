/**
 * @decision-passport/tool-call-wrapper
 *
 * Generic, stateless, provider-neutral SDK wrapper that turns any async
 * tool/function execution into an offline-verifiable Decision Passport receipt.
 *
 * @version 0.8.0
 */

// Main wrapper
export { withDecisionPassportToolCall } from "./with-decision-passport-tool-call.js";

// Verification helper
export { verifyToolCallReceipt } from "./verify-tool-call-receipt.js";

// Record builders (for advanced consumers that need to build partial trails)
export {
  createAuthorizedRecord,
  createDeniedRecord,
  createExecutionAbortedRecord,
  createExecutionFailedRecord,
  createExecutionStartedRecord,
  createExecutionSucceededRecord,
  createRequestedRecord,
} from "./records.js";

// Utilities
export { applyRedaction, redactObject } from "./redaction.js";
export { hashValue } from "./hash.js";
export { isAbortError, normalizeError, ReceiptGenerationError } from "./errors.js";

// Canonical aliases (spec-compatible names)
export { hashValue as deterministicHash } from "./hash.js";
export { applyRedaction as redactPayload } from "./redaction.js";
export { normalizeError as normalizeToolCallError } from "./errors.js";

// Types
export type {
  NormalizedToolCallError,
  RedactionConfig,
  ToolCallActor,
  ToolCallActorType,
  ToolCallAuthorization,
  ToolCallAuthorizationType,
  ToolCallExecutionContext,
  ToolCallPassportOptions,
  ToolCallPassportReceipt,
  ToolCallStatus,
  ToolCallTool,
  ToolCallVerification,
} from "./types.js";
