import { describe, expect, it, vi } from "vitest";
import { withDecisionPassportToolCall } from "../src/with-decision-passport-tool-call.js";

describe("withDecisionPassportToolCall — FAILED path", () => {
  it("returns status FAILED when execute() throws", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "flaky_tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => {
        throw new Error("Database connection timed out");
      },
    });

    expect(receipt.status).toBe("FAILED");
  });

  it("includes errorHash when execute() throws", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => {
        throw new Error("oops");
      },
    });

    expect(receipt.errorHash).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.outputHash).toBeUndefined();
  });

  it("does NOT include raw stack trace in the bundle records", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => {
        throw new Error("some error with a long stack");
      },
    });

    const bundleStr = JSON.stringify(receipt.bundle);
    // Stack traces contain "at " lines — make sure none appear
    expect(bundleStr).not.toMatch(/\bat\s+\w/);
  });

  it("bundle passes offline verification after failure", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => {
        throw new TypeError("Unexpected token");
      },
    });

    expect(receipt.verification.ok).toBe(true);
  });

  it("execute() is still called exactly once when it throws", async () => {
    const executeFn = vi.fn(async () => {
      throw new Error("fail");
    });

    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: executeFn,
    });

    expect(executeFn).toHaveBeenCalledTimes(1);
    expect(receipt.status).toBe("FAILED");
  });

  it("bundle has 4 records: REQUESTED, AUTHORIZED, EXECUTION_STARTED, EXECUTION_FAILED", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => {
        throw new Error("fail");
      },
    });

    expect(receipt.records).toHaveLength(4);
  });

  it("normalizes non-Error thrown values", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "raw string error";
      },
    });

    expect(receipt.status).toBe("FAILED");
    expect(receipt.errorHash).toBeDefined();
  });
});
