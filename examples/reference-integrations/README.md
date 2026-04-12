# Reference Integrations

offline-verifiable authorization and execution receipts for AI and high-consequence software actions

These are minimal reference integrations. They are local examples, not production connectors.

## Integration 1: Webhook approval receipt

### Webhook: What this example shows

A webhook-like material action that is approved by a human and then executed, exported as a Decision Passport bundle.

### Webhook: Event sequence

1. Recommendation to dispatch a webhook event.
2. Human approval granted for that dispatch.
3. Execution succeeded for the approved dispatch.

### Webhook: Files involved

1. `examples/reference-integrations/webhook-approval-receipt.ts`
2. `examples/reference-integrations/webhook-approval-receipt.bundle.json`

### Webhook: Run it

```bash
pnpm example:webhook-receipt
```

### Webhook: Verify it

```bash
python -m decision_passport.verify examples/reference-integrations/webhook-approval-receipt.bundle.json
```

### Webhook: Expected result

1. Script prints `VALID_STATUS PASS SUCCESS_VALID` and a tampered `FAIL` status.
2. Python verifier returns `"status": "PASS"` for the checked-in bundle.

### Webhook: Limits of the example

This example does not connect to a real webhook provider and does not run a network listener.

---

## Integration 2: Agent or tool execution receipt

### Agent/tool: What this example shows

An agent/tool action that is policy-authorized and then executed, exported as a Decision Passport bundle.

### Agent/tool: Event sequence

1. Agent recommendation for a tool execution.
2. Policy approval granted.
3. Execution succeeded.

### Agent/tool: Files involved

1. `examples/reference-integrations/agent-tool-execution-receipt.ts`
2. `examples/reference-integrations/agent-tool-execution-receipt.bundle.json`

### Agent/tool: Run it

```bash
pnpm example:agent-receipt
```

### Agent/tool: Verify it

```bash
python -m decision_passport.verify examples/reference-integrations/agent-tool-execution-receipt.bundle.json
```

### Agent/tool: Expected result

1. Script prints `VALID_STATUS PASS SUCCESS_VALID` and a tampered `FAIL` status.
2. Python verifier returns `"status": "PASS"` for the checked-in bundle.

### Agent/tool: Limits of the example

This example does not call external tools or APIs. It models the receipt pattern only.
