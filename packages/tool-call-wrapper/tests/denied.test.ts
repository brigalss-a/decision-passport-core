import { describe, expect, it, vi } from "vitest";
import { withDecisionPassportToolCall } from "../src/with-decision-passport-tool-call.js";

describe("withDecisionPassportToolCall — DENIED path", () => {
  it("returns status DENIED when authorization.approved is false", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "send_email" },
      authorization: {
        type: "policy",
        approved: false,
        reason: "Outside policy boundary",
      },
      input: { to: "user@example.com" },
      execute: async () => ({ messageId: "should-not-appear" }),
    });

    expect(receipt.status).toBe("DENIED");
  });

  it("execute() is NEVER called when authorization.approved is false", async () => {
    const executeFn = vi.fn(async () => ({ result: "should-not-be-called" }));

    await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: false, reason: "Denied" },
      input: {},
      execute: executeFn,
    });

    expect(executeFn).not.toHaveBeenCalled();
  });

  it("bundle passes offline verification for denied receipt", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: false, reason: "No policy found" },
      input: {},
      execute: async () => ({}),
    });

    expect(receipt.verification.ok).toBe(true);
  });

  it("includes inputHash but not outputHash on DENIED", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: false },
      input: { sensitive_data: "value" },
      execute: async () => ({}),
    });

    expect(receipt.inputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.outputHash).toBeUndefined();
    expect(receipt.errorHash).toBeUndefined();
  });

  it("bundle has 2 records: REQUESTED, DENIED", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: false },
      input: {},
      execute: async () => ({}),
    });

    expect(receipt.records).toHaveLength(2);
  });

  it("works for human-denied authorization type", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "delete_records" },
      authorization: {
        type: "human",
        approved: false,
        approvedBy: "reviewer-jane",
        reason: "Not safe to delete production data",
      },
      input: { table: "users" },
      execute: async () => ({}),
    });

    expect(receipt.status).toBe("DENIED");
    expect(receipt.verification.ok).toBe(true);
  });

  it("denied receipt does not leak raw input payload in records", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: false },
      input: { secret_password: "hunter2", to: "user@example.com" },
      execute: async () => ({}),
    });

    const bundleStr = JSON.stringify(receipt.bundle);
    expect(bundleStr).not.toContain("hunter2");
    expect(bundleStr).not.toContain("secret_password");
  });
});
