# Tool Call Passport Wrapper v0.8.0

`@decision-passport/tool-call-wrapper` is a **generic, stateless, provider-neutral** SDK wrapper that turns any async tool/function execution into an **offline-verifiable** Decision Passport receipt.

---

## What it IS

- Generic wrapper for any async function/tool call
- Stateless — no database, no cache, no network calls
- Provider-neutral — no dependency on any AI provider SDK (no Anthropic, OpenAI, etc.)
- Offline-verifiable — every receipt can be cryptographically verified without external services
- A reference SDK for producing tamper-evident execution receipts

## What it is NOT

- Not a hosted gateway or runtime enforcement service
- Not a replay-lock or nonce-deduplication system
- Not an identity provider or SSO system
- Not an MCP server or Anthropic/OpenAI-specific adapter
- Not a database persistence layer
- Not an enterprise control plane

---

## Installation

```bash
pnpm add @decision-passport/tool-call-wrapper
```

---

## Quick Start

```typescript
import { withDecisionPassportToolCall } from "@decision-passport/tool-call-wrapper";

const receipt = await withDecisionPassportToolCall({
  actor: { id: "agent-01", type: "ai_agent" },
  tool: { name: "send_email", version: "1.0.0" },
  authorization: {
    type: "policy",
    approved: true,
    policyVersion: "policy-v1",
    reason: "Allowed",
  },
  input: { to: "user@example.com", subject: "Hello" },
  execute: async () => ({ messageId: "msg_123" }),
});

console.log(receipt.status);          // "SUCCESS"
console.log(receipt.inputHash);       // sha256 of input
console.log(receipt.outputHash);      // sha256 of output
console.log(receipt.verification.ok); // true
```

---

## Execution Flows

### SUCCESS

`execute()` ran and resolved.

```typescript
const receipt = await withDecisionPassportToolCall({
  // ...
  authorization: { type: "policy", approved: true },
  execute: async () => ({ messageId: "msg_123" }),
});
// receipt.status === "SUCCESS"
// receipt.outputHash === sha256(output)
// receipt.bundle → 4-record chain: REQUESTED → AUTHORIZED → EXECUTION_PENDING → EXECUTION_SUCCEEDED
```

### FAILED

`execute()` ran but threw an error.

```typescript
const receipt = await withDecisionPassportToolCall({
  // ...
  execute: async () => { throw new Error("DB timeout"); },
});
// receipt.status === "FAILED"
// receipt.errorHash === sha256(normalizedError)
// raw stack trace is NOT included in the receipt
// receipt.bundle → 4-record chain: REQUESTED → AUTHORIZED → EXECUTION_PENDING → EXECUTION_FAILED
```

### DENIED

`authorization.approved !== true` — `execute()` is **never called**.

```typescript
const receipt = await withDecisionPassportToolCall({
  // ...
  authorization: { type: "policy", approved: false, reason: "Outside policy boundary" },
  execute: async () => { /* never runs */ },
});
// receipt.status === "DENIED"
// execute() was NOT called
// receipt.bundle → 2-record chain: REQUESTED → DENIED
```

### ABORTED

`AbortSignal` was already aborted before execution — `execute()` is **never called**.

```typescript
const controller = new AbortController();
controller.abort();

const receipt = await withDecisionPassportToolCall({
  // ...
  options: { abortSignal: controller.signal },
  execute: async () => { /* never runs */ },
});
// receipt.status === "ABORTED"
// execute() was NOT called
// receipt.bundle → 2-record chain: REQUESTED → ABORTED
```

If `execute()` throws an `AbortError` during execution, the status is also `ABORTED` with a 4-record chain:
`REQUESTED → AUTHORIZED → EXECUTION_PENDING → ABORTED`

---

## Security

### Payload hashing

All payloads (input, output, error) are hashed using SHA-256 over a deterministic canonical serialisation (sorted keys). The same semantic object always produces the same hash regardless of property insertion order.

### Default behaviour (safe by default)

| Option | Default | Effect |
|--------|---------|--------|
| `includeRawInput` | false | Raw input not included in receipt |
| `includeRawOutput` | false | Raw output not included in receipt |
| `includeRawError` | false | Normalized error not included in receipt |

Hashes are **always** computed from the original, un-redacted values.

### Redaction

When `includeRawOutput: true` (or `includeRawInput: true`), the following fields are automatically redacted before inclusion:

`password`, `secret`, `token`, `apiKey`, `authorization`, `cookie`, `privateKey`, `accessToken`, `refreshToken`

Matching is case-insensitive and applied recursively to nested objects.

Custom fields can be added:

```typescript
options: {
  includeRawOutput: true,
  redact: { additionalFields: ["ssn", "creditCard"] },
}
```

### What is never included

- Raw stack traces (stripped in all cases)
- Raw input payload (unless explicitly opted in with redaction)
- Raw output payload (unless explicitly opted in with redaction)

---

## Verification

Every receipt includes a `verification` result:

```typescript
{
  ok: true,             // Chain integrity passed
  errors: [],           // Array of error strings if FAIL
  warnings: [],         // Advisory warnings (non-fatal)
  verifierResult: { ... } // Full BasicVerifierResult from @decision-passport/verifier-basic
}
```

Verify the bundle offline at any time:

```typescript
import { verifyToolCallReceipt } from "@decision-passport/tool-call-wrapper";

const verification = verifyToolCallReceipt(receipt.bundle);
console.log(verification.ok); // true
```

### Tamper detection

Any mutation to the bundle (payload, record hash, manifest) will cause verification to fail:

```typescript
bundle.passport_records[0].payload.tool_name = "INJECTED";
const result = verifyBasicBundle(bundle);
// result.status === "FAIL"
```

---

## Record Mapping

The wrapper maps tool-call lifecycle into existing Decision Passport `ActionType` semantics:

| Phase | ActionType used | Condition |
|-------|----------------|-----------|
| REQUESTED | `AI_RECOMMENDATION` | Always (first record, sequence 0) |
| AUTHORIZED | `POLICY_APPROVAL_GRANTED` | `authorization.type !== "human"` |
| AUTHORIZED | `HUMAN_APPROVAL_GRANTED` | `authorization.type === "human"` |
| DENIED | `POLICY_EXCEPTION` | `authorization.type !== "human"` and `approved: false` |
| DENIED | `HUMAN_APPROVAL_REJECTED` | `authorization.type === "human"` and `approved: false` |
| EXECUTION_STARTED | `EXECUTION_PENDING` | After authorization succeeds |
| SUCCESS | `EXECUTION_SUCCEEDED` | `execute()` resolved |
| FAILED | `EXECUTION_FAILED` | `execute()` threw (non-abort) |
| ABORTED | `EXECUTION_ABORTED` | Pre-aborted or AbortError thrown |

Each record carries `tool_call_phase` in its payload to distinguish the tool-call context from other uses of the same ActionType.

---

## API Reference

### `withDecisionPassportToolCall(options)`

```typescript
async function withDecisionPassportToolCall<TInput, TOutput>(
  options: ToolCallPassportOptions<TInput, TOutput>
): Promise<ToolCallPassportReceipt<TOutput>>
```

#### Options shape

```typescript
{
  actor: {
    id: string;
    type: "human" | "ai_agent" | "service" | "system";
    displayName?: string;
  };
  tool: {
    name: string;
    version?: string;
    provider?: string;
    description?: string;
  };
  authorization: {
    type: "policy" | "human" | "system" | "none";
    approved: boolean;
    policyVersion?: string;
    approvedBy?: string;
    reason?: string;
    decisionId?: string;
  };
  input: TInput;
  execute: (context: ToolCallExecutionContext<TInput>) => Promise<TOutput>;
  options?: {
    receiptId?: string;           // Custom receipt ID (default: randomUUID())
    correlationId?: string;       // Correlation ID for cross-system tracing
    includeRawInput?: boolean;    // Default: false
    includeRawOutput?: boolean;   // Default: false
    includeRawError?: boolean;    // Default: false
    redact?: RedactionConfig;
    now?: () => Date;             // Injectable clock for testing
    abortSignal?: AbortSignal;
  };
}
```

#### Receipt shape

```typescript
{
  receiptId: string;
  status: "SUCCESS" | "FAILED" | "ABORTED" | "DENIED";
  inputHash: string;    // SHA-256 of canonically serialised input
  outputHash?: string;  // SHA-256 of output (SUCCESS only)
  errorHash?: string;   // SHA-256 of normalised error (FAILED only)
  output?: TOutput;     // Only if includeRawOutput: true
  bundle: BasicProofBundle;  // Offline-verifiable proof bundle
  records: PassportRecord[]; // The individual hash-chain records
  verification: {
    ok: boolean;
    errors: string[];
    warnings: string[];
    verifierResult: BasicVerifierResult;
  };
}
```

### `verifyToolCallReceipt(bundle)`

Verifies a tool-call proof bundle offline using the core verifier.

```typescript
function verifyToolCallReceipt(bundle: BasicProofBundle): ToolCallVerification
```

---

## Known Limitations

1. **Abort-during-execution is best-effort.** If the `AbortSignal` fires after `execute()` has already started but before it throws, the receipt status depends on whether the tool itself throws an `AbortError`. The wrapper cannot forcibly interrupt a running async function.

2. **No stateful replay protection.** The wrapper does not track `receiptId` across calls. Duplicate execution receipts for the same `receiptId` are not prevented. Replay detection requires an external persistence layer (see the `decision-passport-control-plane` repository).

3. **`authorization_status` shows `NOT_EVALUATED`** in the basic verifier result. The basic verifier evaluates standard `POLICY_APPROVAL_GRANTED`/`EXECUTION_SUCCEEDED` pairs but does not yet have tool-call-specific semantic checks. Chain integrity (the core security property) is fully verified.

4. **TypeScript only.** A Python reference implementation is planned for a future release.

---

## Recommended Next PRs

1. **`decision-passport-mcp`** — MCP server adapter using this wrapper as the underlying receipt engine
2. **Provider adapters** — thin wrappers around this SDK for OpenAI tool calls, Anthropic tool use, etc.
3. **Python parity** — `python/tool_call_wrapper.py` implementing the same receipt schema
