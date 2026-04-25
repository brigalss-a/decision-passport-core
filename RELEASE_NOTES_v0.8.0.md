# Release Notes — v0.8.0

**Release date:** 2026-04-25

## Summary

v0.8.0 ships **Tool Call Passport Wrapper**, a generic stateless SDK that turns any async tool/function execution into an offline-verifiable Decision Passport receipt.

This bridges the gap between Decision Passport's static proof-bundle model and real-world async tool execution: developers can now wrap any async function and receive a cryptographically verifiable record of what was authorized, what ran, and what the outcome was.

---

## New Package: `@decision-passport/tool-call-wrapper`

**Location:** `packages/tool-call-wrapper/`

### Core API

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
```

### Execution outcomes

| Status | Trigger |
|--------|---------|
| `SUCCESS` | `execute()` resolved |
| `FAILED` | `execute()` threw a non-abort error |
| `DENIED` | `authorization.approved !== true` — `execute()` never called |
| `ABORTED` | `AbortSignal` was aborted or `execute()` threw an `AbortError` |

### What every receipt includes

- `receiptId` — unique receipt identifier
- `inputHash` — SHA-256 of canonically serialised input
- `outputHash` — SHA-256 of output (SUCCESS only)
- `errorHash` — SHA-256 of normalised error (FAILED only)
- `bundle` — offline-verifiable `BasicProofBundle` (compatible with existing verifier)
- `records` — the individual `PassportRecord` chain
- `verification` — inline chain-integrity verification result

### Security properties

- Raw input/output/error are **never included by default**
- Sensitive fields (`password`, `token`, `apiKey`, `secret`, etc.) are automatically redacted when raw inclusion is enabled
- Stack traces are **never included**
- Hashes are always computed from original un-redacted values
- Every bundle passes the existing `@decision-passport/verifier-basic` offline verifier

### Record mapping to existing ActionType

No new `ActionType` values were introduced. The wrapper maps to existing types:

- `AI_RECOMMENDATION` — tool call requested
- `POLICY_APPROVAL_GRANTED` / `HUMAN_APPROVAL_GRANTED` — authorized
- `POLICY_EXCEPTION` / `HUMAN_APPROVAL_REJECTED` — denied
- `EXECUTION_PENDING` — execution started
- `EXECUTION_SUCCEEDED` / `EXECUTION_FAILED` / `EXECUTION_ABORTED` — outcome

Each record includes `tool_call_phase` in its payload to distinguish tool-call records from other uses of the same `ActionType`.

### Protocol boundary preserved

This package:
- Has **no** database, Redis, JWT, or session dependencies
- Has **no** MCP server or gateway logic
- Has **no** Anthropic/OpenAI-specific code
- Is **not** a runtime enforcement service
- Is fully compatible with the `@decision-passport/core` + `@decision-passport/verifier-basic` layer

---

## New Files

**Package:**
- `packages/tool-call-wrapper/package.json`
- `packages/tool-call-wrapper/tsconfig.json`
- `packages/tool-call-wrapper/src/index.ts`
- `packages/tool-call-wrapper/src/types.ts`
- `packages/tool-call-wrapper/src/with-decision-passport-tool-call.ts`
- `packages/tool-call-wrapper/src/records.ts`
- `packages/tool-call-wrapper/src/redaction.ts`
- `packages/tool-call-wrapper/src/errors.ts`
- `packages/tool-call-wrapper/src/hash.ts`
- `packages/tool-call-wrapper/src/verify-tool-call-receipt.ts`

**Tests:**
- `packages/tool-call-wrapper/tests/success.test.ts`
- `packages/tool-call-wrapper/tests/failure.test.ts`
- `packages/tool-call-wrapper/tests/denied.test.ts`
- `packages/tool-call-wrapper/tests/aborted.test.ts`
- `packages/tool-call-wrapper/tests/payload-tamper.test.ts`

**Examples:**
- `examples/reference-integrations/tool-call-wrapper/run-tool-call-wrapper-demo.ts`
- `examples/reference-integrations/tool-call-wrapper/README.md`

**Docs:**
- `docs/TOOL_CALL_WRAPPER.md`
- `RELEASE_NOTES_v0.8.0.md` (this file)

---

## Known Limitations

1. Abort-during-execution is best-effort (documented in `docs/TOOL_CALL_WRAPPER.md`)
2. No stateful replay protection (requires external persistence layer)
3. `authorization_status` shows `NOT_EVALUATED` in basic verifier — chain integrity is fully verified
4. TypeScript only — Python parity planned for v0.9.0

---

## Recommended Next PRs

1. **`decision-passport-mcp`** — MCP server adapter using this wrapper as the receipt engine
2. **Provider adapters** — thin wrappers for OpenAI tool calls and Anthropic tool use
3. **Python parity** — `python/tool_call_wrapper.py`
