import type { BasicProofBundle } from "@decision-passport/core";
import type { BasicVerifierResult } from "@decision-passport/verifier-basic";

// ---------------------------------------------------------------------------
// Actor / Tool / Authorization
// ---------------------------------------------------------------------------

export type ToolCallActorType = "human" | "ai_agent" | "service" | "system";

export interface ToolCallActor {
  readonly id: string;
  readonly type: ToolCallActorType;
  readonly displayName?: string;
}

export interface ToolCallTool {
  readonly name: string;
  readonly version?: string;
  readonly provider?: string;
  readonly description?: string;
}

export type ToolCallAuthorizationType = "policy" | "human" | "system" | "none";

export interface ToolCallAuthorization {
  readonly type: ToolCallAuthorizationType;
  readonly approved: boolean;
  readonly policyVersion?: string;
  readonly approvedBy?: string;
  readonly reason?: string;
  readonly decisionId?: string;
}

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

export interface RedactionConfig {
  /**
   * Additional field names (beyond the built-in sensitive list) to redact
   * before raw payload inclusion. Matching is case-insensitive.
   */
  readonly additionalFields?: readonly string[];
  /** When true, suppress even the built-in sensitive-field list. */
  readonly disableBuiltinList?: boolean;
}

// ---------------------------------------------------------------------------
// Execution context passed to execute()
// ---------------------------------------------------------------------------

export interface ToolCallExecutionContext<TInput> {
  readonly input: TInput;
  readonly receiptId: string;
  readonly correlationId?: string;
  readonly abortSignal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ToolCallPassportOptions<TInput, TOutput> {
  readonly actor: ToolCallActor;
  readonly tool: ToolCallTool;
  readonly authorization: ToolCallAuthorization;
  readonly input: TInput;
  readonly execute: (context: ToolCallExecutionContext<TInput>) => Promise<TOutput>;
  readonly options?: {
    readonly receiptId?: string;
    readonly correlationId?: string;
    /** Include the raw (post-redaction) input in the receipt. Default: false. */
    readonly includeRawInput?: boolean;
    /** Include the raw (post-redaction) output in the receipt. Default: false. */
    readonly includeRawOutput?: boolean;
    /** Include the normalized (non-stack) error info in the receipt. Default: false. */
    readonly includeRawError?: boolean;
    readonly redact?: RedactionConfig;
    /** Injectable clock for deterministic testing. Default: () => new Date() */
    readonly now?: () => Date;
    readonly abortSignal?: AbortSignal;
  };
}

// ---------------------------------------------------------------------------
// Receipt
// ---------------------------------------------------------------------------

export type ToolCallStatus = "SUCCESS" | "FAILED" | "ABORTED" | "DENIED";

export interface ToolCallPassportReceipt<TOutput> {
  readonly receiptId: string;
  readonly status: ToolCallStatus;
  readonly inputHash: string;
  readonly outputHash?: string;
  readonly errorHash?: string;
  readonly output?: TOutput;
  readonly bundle: BasicProofBundle;
  readonly records: readonly unknown[];
  readonly verification: ToolCallVerification;
}

export interface ToolCallVerification {
  readonly ok: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly verifierResult: BasicVerifierResult;
}

// ---------------------------------------------------------------------------
// Normalized error (safe — no stack traces by default)
// ---------------------------------------------------------------------------

export interface NormalizedToolCallError {
  readonly name: string;
  readonly message: string;
  readonly code?: string;
}
