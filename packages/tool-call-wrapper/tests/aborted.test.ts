import { describe, expect, it, vi } from "vitest";
import { withDecisionPassportToolCall } from "../src/with-decision-passport-tool-call.js";

describe("withDecisionPassportToolCall — ABORTED path", () => {
  it("returns ABORTED when AbortSignal is already aborted before execution", async () => {
    const controller = new AbortController();
    controller.abort();

    const executeFn = vi.fn(async () => ({ result: "should-not-run" }));

    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: executeFn,
      options: { abortSignal: controller.signal },
    });

    expect(receipt.status).toBe("ABORTED");
  });

  it("execute() is NOT called when AbortSignal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const executeFn = vi.fn(async () => ({ result: "nope" }));

    await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: executeFn,
      options: { abortSignal: controller.signal },
    });

    expect(executeFn).not.toHaveBeenCalled();
  });

  it("bundle passes offline verification for pre-aborted receipt", async () => {
    const controller = new AbortController();
    controller.abort();

    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => ({}),
      options: { abortSignal: controller.signal },
    });

    expect(receipt.verification.ok).toBe(true);
  });

  it("includes inputHash but no outputHash on ABORTED", async () => {
    const controller = new AbortController();
    controller.abort();

    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: { key: "value" },
      execute: async () => ({}),
      options: { abortSignal: controller.signal },
    });

    expect(receipt.inputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.outputHash).toBeUndefined();
    expect(receipt.errorHash).toBeUndefined();
  });

  it("returns ABORTED when execute() throws an AbortError", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => {
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        throw err;
      },
    });

    expect(receipt.status).toBe("ABORTED");
  });

  it("bundle passes offline verification for abort-during-execution", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      },
    });

    expect(receipt.verification.ok).toBe(true);
  });

  it("ABORTED before start has 3 records: REQUESTED, AUTHORIZED, ABORTED", async () => {
    // Pre-abort: authorization was granted but execution never started
    const controller = new AbortController();
    controller.abort();

    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => ({}),
      options: { abortSignal: controller.signal },
    });

    // 3 records: REQUESTED + AUTHORIZED + ABORTED (authorization was approved but execution aborted)
    expect(receipt.records).toHaveLength(3);
  });
});
