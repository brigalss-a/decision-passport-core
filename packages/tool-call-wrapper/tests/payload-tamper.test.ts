import { describe, expect, it } from "vitest";
import { verifyBasicBundle } from "@decision-passport/verifier-basic";
import { withDecisionPassportToolCall } from "../src/with-decision-passport-tool-call.js";
import type { BasicProofBundle } from "@decision-passport/core";
import type { PassportRecord } from "@decision-passport/core";

async function buildSuccessReceipt() {
  return withDecisionPassportToolCall({
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
}

describe("Payload tamper tests", () => {
  it("valid bundle verifies cleanly", async () => {
    const receipt = await buildSuccessReceipt();
    const result = verifyBasicBundle(receipt.bundle);
    expect(result.status).toBe("PASS");
  });

  it("mutated record_hash causes verification failure", async () => {
    const receipt = await buildSuccessReceipt();

    // Deep clone the bundle and tamper with the last record's record_hash
    const tampered: BasicProofBundle = JSON.parse(JSON.stringify(receipt.bundle)) as BasicProofBundle;
    const records = tampered.passport_records as PassportRecord[];
    const last = records[records.length - 1]!;

    // Flip one hex character in record_hash
    const tamperedHash =
      last.record_hash.slice(0, -1) + (last.record_hash.endsWith("a") ? "b" : "a");

    (records[records.length - 1] as Record<string, unknown>)["record_hash"] = tamperedHash;

    const result = verifyBasicBundle(tampered);
    expect(result.status).toBe("FAIL");
  });

  it("mutated payload causes verification failure", async () => {
    const receipt = await buildSuccessReceipt();

    const tampered: BasicProofBundle = JSON.parse(JSON.stringify(receipt.bundle)) as BasicProofBundle;
    const records = tampered.passport_records as PassportRecord[];

    // Mutate the first record's payload
    (records[0] as Record<string, unknown>)["payload"] = {
      ...(records[0]!.payload as Record<string, unknown>),
      tool_name: "TAMPERED_TOOL",
    };

    const result = verifyBasicBundle(tampered);
    expect(result.status).toBe("FAIL");
  });

  it("mutated prev_hash breaks chain integrity", async () => {
    const receipt = await buildSuccessReceipt();

    const tampered: BasicProofBundle = JSON.parse(JSON.stringify(receipt.bundle)) as BasicProofBundle;
    const records = tampered.passport_records as PassportRecord[];

    // Mutate prev_hash of the second record to break the chain
    if (records.length > 1) {
      (records[1] as Record<string, unknown>)["prev_hash"] =
        "0000000000000000000000000000000000000000000000000000000000000000";
    }

    const result = verifyBasicBundle(tampered);
    expect(result.status).toBe("FAIL");
  });

  it("manifest chain_hash mismatch causes verification failure", async () => {
    const receipt = await buildSuccessReceipt();

    const tampered: BasicProofBundle = JSON.parse(JSON.stringify(receipt.bundle)) as BasicProofBundle;

    // Tamper with manifest chain_hash
    (tampered as Record<string, unknown>)["manifest"] = {
      ...(tampered.manifest as Record<string, unknown>),
      chain_hash: "aaaa" + "0".repeat(60),
    };

    const result = verifyBasicBundle(tampered);
    expect(result.status).toBe("FAIL");
  });
});

describe("Redaction tests", () => {
  it("sensitive fields are redacted when includeRawOutput is true", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "auth_check" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => ({
        userId: "user-123",
        token: "secret-jwt-token",
        password: "hunter2",
        apiKey: "sk-very-secret",
        displayName: "John",
      }),
      options: { includeRawOutput: true },
    });

    const output = receipt.output as Record<string, unknown>;
    expect(output["token"]).toBe("[REDACTED]");
    expect(output["password"]).toBe("[REDACTED]");
    expect(output["apiKey"]).toBe("[REDACTED]");
    // Non-sensitive fields are preserved
    expect(output["userId"]).toBe("user-123");
    expect(output["displayName"]).toBe("John");
  });

  it("sensitive field redaction is case-insensitive", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => ({
        PASSWORD: "should-be-redacted",
        ApiKey: "also-redacted",
        normalField: "keep-me",
      }),
      options: { includeRawOutput: true },
    });

    const output = receipt.output as Record<string, unknown>;
    expect(output["PASSWORD"]).toBe("[REDACTED]");
    expect(output["ApiKey"]).toBe("[REDACTED]");
    expect(output["normalField"]).toBe("keep-me");
  });

  it("custom additional fields are redacted", async () => {
    const receipt = await withDecisionPassportToolCall({
      actor: { id: "agent-01", type: "ai_agent" },
      tool: { name: "tool" },
      authorization: { type: "policy", approved: true },
      input: {},
      execute: async () => ({
        ssn: "123-45-6789",
        publicInfo: "visible",
      }),
      options: {
        includeRawOutput: true,
        redact: { additionalFields: ["ssn"] },
      },
    });

    const output = receipt.output as Record<string, unknown>;
    expect(output["ssn"]).toBe("[REDACTED]");
    expect(output["publicInfo"]).toBe("visible");
  });
});
