/**
 * Tool Call Passport Wrapper — main entry point.
 *
 * withDecisionPassportToolCall wraps any async tool/function execution and
 * emits an offline-verifiable Decision Passport receipt regardless of outcome.
 *
 * Design constraints:
 * - Stateless: no DB, cache, or network calls
 * - Provider-neutral: no dependency on any AI provider SDK
 * - Protocol-safe: uses only existing core hash-chain and bundle primitives
 * - Secure: raw payloads are never included by default; hashes are always computed
 */

import { randomUUID } from "node:crypto";
import { createManifest } from "@decision-passport/core";
import type { BasicProofBundle, PassportRecord } from "@decision-passport/core";
import { isAbortError, normalizeError, ReceiptGenerationError } from "./errors.js";
import { hashValue } from "./hash.js";
import { applyRedaction } from "./redaction.js";
import {
  createAuthorizedRecord,
  createDeniedRecord,
  createExecutionAbortedRecord,
  createExecutionFailedRecord,
  createExecutionStartedRecord,
  createExecutionSucceededRecord,
  createRequestedRecord,
} from "./records.js";
import type {
  NormalizedToolCallError,
  ToolCallPassportOptions,
  ToolCallPassportReceipt,
} from "./types.js";
import { verifyToolCallReceipt } from "./verify-tool-call-receipt.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Wrap any async tool/function execution and produce an offline-verifiable
 * Decision Passport receipt.
 *
 * Execution guarantees:
 * - execute() is NEVER called if authorization.approved !== true
 * - execute() is NEVER called if abortSignal is already aborted
 * - A verifiable receipt is always emitted regardless of outcome
 * - Raw stack traces are never included unless explicitly enabled
 * - Sensitive fields are always redacted before optional raw inclusion
 */
export async function withDecisionPassportToolCall<TInput, TOutput>(
  opts: ToolCallPassportOptions<TInput, TOutput>,
): Promise<ToolCallPassportReceipt<TOutput>> {
  const now = opts.options?.now ?? (() => new Date());
  const receiptId = opts.options?.receiptId ?? randomUUID();
  const correlationId = opts.options?.correlationId;
  const chainId = receiptId;
  const abortSignal = opts.options?.abortSignal;

  // --- Compute input hash (always from original, un-redacted input) ----------
  const inputHash = hashValue(opts.input);

  // --- Record 0: REQUESTED --------------------------------------------------
  const requestedRecord = createRequestedRecord({
    chainId,
    actor: opts.actor,
    tool: opts.tool,
    inputHash,
    correlationId,
    now,
  });

  // --- DENIED: authorization not approved -----------------------------------
  if (!opts.authorization.approved) {
    return buildDeniedReceipt({
      receiptId,
      inputHash,
      chainId,
      requestedRecord,
      opts,
      now,
    });
  }

  // --- Record 1: AUTHORIZED -------------------------------------------------
  // Authorization is granted — record it before any abort/execution checks.
  const authorizedRecord = createAuthorizedRecord({
    chainId,
    prevRecord: requestedRecord,
    authorization: opts.authorization,
    receiptId,
    now,
  });

  // --- ABORTED: signal already aborted before execution ---------------------
  // Authorization was granted but the AbortSignal fired before execution started.
  if (abortSignal?.aborted) {
    return buildAbortedReceipt({
      receiptId,
      inputHash,
      chainId,
      requestedRecord,
      opts,
      abortReason: "AbortSignal was already aborted before execution started",
      durationMs: 0,
      now,
      extraRecords: [authorizedRecord],
    });
  }

  // --- Record 2: EXECUTION_PENDING ------------------------------------------
  const executionStartedRecord = createExecutionStartedRecord({
    chainId,
    prevRecord: authorizedRecord,
    tool: opts.tool,
    inputHash,
    receiptId,
    now,
  });

  // --- Execute ---------------------------------------------------------------
  const startTime = now();
  let output: TOutput | undefined;
  let thrownError: unknown;
  let executionSucceeded = false;
  let wasAborted = false;

  try {
    output = await opts.execute({
      input: opts.input,
      receiptId,
      correlationId,
      abortSignal,
    });
    executionSucceeded = true;
  } catch (err) {
    thrownError = err;
    if (isAbortError(err) || abortSignal?.aborted) {
      wasAborted = true;
    }
  }

  const endTime = now();
  const durationMs = endTime.getTime() - startTime.getTime();

  // --- Build final records and bundle ---------------------------------------
  // Wrap in a try/catch: if receipt generation fails after a successful
  // execute(), throw ReceiptGenerationError so the caller knows execution
  // happened but the receipt was not produced.
  try {
    if (wasAborted) {
      const normalized = normalizeError(thrownError);
      return buildAbortedReceipt({
        receiptId,
        inputHash,
        chainId,
        requestedRecord,
        opts,
        abortReason: normalized.message,
        durationMs,
        now,
        // For aborted-during-execution we already have the authorized + started records
        extraRecords: [authorizedRecord, executionStartedRecord],
      });
    }

    if (!executionSucceeded) {
      const normalized = normalizeError(thrownError);
      const errorHash = hashValue(normalized);

      const executionFailedRecord = createExecutionFailedRecord({
        chainId,
        prevRecord: executionStartedRecord,
        errorHash,
        normalizedErrorName: normalized.name,
        normalizedErrorMessage: normalized.message,
        durationMs,
        receiptId,
        now,
      });

      const records: PassportRecord[] = [
        requestedRecord,
        authorizedRecord,
        executionStartedRecord,
        executionFailedRecord,
      ];
      const bundle = buildBundle(records, now);
      const verification = verifyToolCallReceipt(bundle);

      const receipt: ToolCallPassportReceipt<TOutput> = {
        receiptId,
        status: "FAILED",
        inputHash,
        errorHash,
        bundle,
        records,
        verification,
      };

      if (opts.options?.includeRawError) {
        return { ...receipt, output: undefined };
      }

      return receipt;
    }

    // SUCCESS path
    const outputHash = hashValue(output);

    const executionSucceededRecord = createExecutionSucceededRecord({
      chainId,
      prevRecord: executionStartedRecord,
      outputHash,
      durationMs,
      receiptId,
      now,
    });

    const records: PassportRecord[] = [
      requestedRecord,
      authorizedRecord,
      executionStartedRecord,
      executionSucceededRecord,
    ];
    const bundle = buildBundle(records, now);
    const verification = verifyToolCallReceipt(bundle);

    const receipt: ToolCallPassportReceipt<TOutput> = {
      receiptId,
      status: "SUCCESS",
      inputHash,
      outputHash,
      bundle,
      records,
      verification,
    };

    if (opts.options?.includeRawOutput) {
      const redactedOutput = applyRedaction(output, opts.options.redact);
      return { ...receipt, output: redactedOutput as TOutput };
    }

    return receipt;
  } catch (receiptErr) {
    throw new ReceiptGenerationError(
      `Tool call ${executionSucceeded ? "succeeded" : "failed"} but receipt generation threw an error: ${String(receiptErr)}`,
      executionSucceeded,
      receiptErr,
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface DeniedReceiptParams<TInput, TOutput> {
  receiptId: string;
  inputHash: string;
  chainId: string;
  requestedRecord: PassportRecord;
  opts: ToolCallPassportOptions<TInput, TOutput>;
  now: () => Date;
}

function buildDeniedReceipt<TInput, TOutput>(
  p: DeniedReceiptParams<TInput, TOutput>,
): ToolCallPassportReceipt<TOutput> {
  const deniedRecord = createDeniedRecord({
    chainId: p.chainId,
    prevRecord: p.requestedRecord,
    authorization: p.opts.authorization,
    receiptId: p.receiptId,
    now: p.now,
  });

  const records: PassportRecord[] = [p.requestedRecord, deniedRecord];
  const bundle = buildBundle(records, p.now);
  const verification = verifyToolCallReceipt(bundle);

  return {
    receiptId: p.receiptId,
    status: "DENIED",
    inputHash: p.inputHash,
    bundle,
    records,
    verification,
  };
}

interface AbortedReceiptParams<TInput, TOutput> {
  receiptId: string;
  inputHash: string;
  chainId: string;
  requestedRecord: PassportRecord;
  opts: ToolCallPassportOptions<TInput, TOutput>;
  abortReason: string;
  durationMs: number;
  now: () => Date;
  /** Records to insert between requestedRecord and the aborted record. */
  extraRecords?: PassportRecord[];
}

function buildAbortedReceipt<TInput, TOutput>(
  p: AbortedReceiptParams<TInput, TOutput>,
): ToolCallPassportReceipt<TOutput> {
  const precedingRecords = p.extraRecords ?? [];
  const prevRecord =
    precedingRecords.length > 0
      ? precedingRecords[precedingRecords.length - 1]!
      : p.requestedRecord;

  // For abort-before-execution we skip the authorized record entirely (authorization
  // was never completed). For abort-during-execution the extraRecords carry them.
  const abortedRecord = createExecutionAbortedRecord({
    chainId: p.chainId,
    prevRecord,
    reason: p.abortReason,
    durationMs: p.durationMs,
    receiptId: p.receiptId,
    now: p.now,
  });

  const records: PassportRecord[] = [p.requestedRecord, ...precedingRecords, abortedRecord];
  const bundle = buildBundle(records, p.now);
  const verification = verifyToolCallReceipt(bundle);

  return {
    receiptId: p.receiptId,
    status: "ABORTED",
    inputHash: p.inputHash,
    bundle,
    records,
    verification,
  };
}

function buildBundle(records: PassportRecord[], _now: () => Date): BasicProofBundle {
  const manifest = createManifest(records);
  return {
    bundle_version: "1.4-basic",
    exported_at_utc: _now().toISOString(),
    passport_records: records,
    manifest,
  };
}
