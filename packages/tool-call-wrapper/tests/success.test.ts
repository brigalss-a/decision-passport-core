import { describe, expect, it, vi } from "vitest";
import { withDecisionPassportToolCall } from "../src/with-decision-passport-tool-call.js";

describe("withDecisionPassportToolCall — SUCCESS path", () => {
  it("returns status SUCCESS when execute() resolves", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "send_email", version: "1.0.0" },
      authorization: {
        type: "policy",
        approved: true,
        policyVersion: "policy-v1",
        reason: "Allowed by policy",
      },
      input: { to: "user@example.com", subject: "Hello" },
      execute: async () => ({ messageId: "msg_123" }),
    });

    expect(receipt.status).toBe("SUCCESS");
  });

  it("calls execute() exactly once", async () => {
    const executeFn = vi.fn(async () => ({ result: "ok" }));

    await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "test_tool" },
      authorization: { type: "policy", approved: true },
      input: { x: 1 },
      execute: executeFn,
    });

    expect(executeFn).toHaveBeenCalledTimes(1);
  });

  it("includes inputHash and outputHash", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "classifier" },
      authorization: { type: "policy", approved: true },
      input: { document_id: "doc-99" },
      execute: async () => ({ category: "finance" }),
    });

    expect(receipt.inputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.outputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.errorHash).toBeUndefined();
  });

  it("output is undefined by default (includeRawOutput not set)", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => ({ secret: "should-not-appear" }),
    });

    expect(receipt.output).toBeUndefined();
  });

  it("includes output when includeRawOutput is true", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => ({ value: 42 }),
      options: { includeRawOutput: true },
    });

    expect(receipt.output).toEqual({ value: 42 });
  });

  it("bundle passes offline verification", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "send_email", version: "1.0.0" },
      authorization: { type: "policy", approved: true },
      input: { to: "user@example.com" },
      execute: async () => ({ messageId: "msg_123" }),
    });

    expect(receipt.verification.ok).toBe(true);
    expect(receipt.verification.errors).toHaveLength(0);
  });

  it("bundle has 4 records: REQUESTED, AUTHORIZED, EXECUTION_STARTED, EXECUTION_SUCCEEDED", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => ({}),
    });

    expect(receipt.records).toHaveLength(4);
  });

  it("execution context is passed to execute() with correct receiptId", async () => {
    let capturedContext: unknown;
    const myReceiptId = "receipt-static-test";

    await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: { key: "value" },
      execute: async (ctx) => {
        capturedContext = ctx;
        return {};
      },
      options: { receiptId: myReceiptId },
    });

    expect((capturedContext as { receiptId: string }).receiptId).toBe(myReceiptId);
  });

  it("deterministic: same input produces same inputHash", async () => {
    const input = { to: "user@example.com", subject: "Test" };

    const r1 = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input,
      execute: async () => ({}),
    });

    const r2 = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input,
      execute: async () => ({}),
    });

    expect(r1.inputHash).toBe(r2.inputHash);
  });

  it("object key order does not affect inputHash", async () => {
    const r1 = await withDecisionPassportToolCall({
      actor: { id: "a", type: "ai_agent" },
      tool: { name: "t" },
      authorization: { type: "policy", approved: true },
      input: { a: 1, b: 2 },
      execute: async () => ({}),
    });

    const r2 = await withDecisionPassportToolCall({
      actor: { id: "a", type: "ai_agent" },
      tool: { name: "t" },
      authorization: { type: "policy", approved: true },
      input: { b: 2, a: 1 }, // reversed key order
      execute: async () => ({}),
    });

    expect(r1.inputHash).toBe(r2.inputHash);
  });
});
