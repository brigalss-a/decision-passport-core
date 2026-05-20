import { describe, expect, it } from "vitest";
import {
  normalizeReliabilitySignals,
  summarizeReliabilitySignalWindow,
} from "../src/reliability.js";

describe("normalizeReliabilitySignals", () => {
  it("returns an empty array for missing signals", () => {
    expect(normalizeReliabilitySignals(undefined)).toEqual([]);
  });

  it("defaults weights and sorts by observation time then session id", () => {
    expect(
      normalizeReliabilitySignals([
        { session_id: "session-b", observed_at: "2026-05-12T22:41:00Z", weight: 0.5 },
        { session_id: "session-a", observed_at: "2026-05-12T22:40:00Z" },
      ]),
    ).toEqual([
      { session_id: "session-a", observed_at: "2026-05-12T22:40:00Z", weight: 1 },
      { session_id: "session-b", observed_at: "2026-05-12T22:41:00Z", weight: 0.5 },
    ]);
  });

  it("rejects invalid weights", () => {
    for (const weight of [
      0,
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(() =>
        normalizeReliabilitySignals([
          { session_id: "session-a", observed_at: "2026-05-12T22:40:00Z", weight },
        ]),
      ).toThrow("weight");
    }
  });

  it("rejects invalid metric values", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() =>
        normalizeReliabilitySignals([
          {
            session_id: "session-a",
            observed_at: "2026-05-12T22:40:00Z",
            metrics: { pdr: value },
          },
        ]),
      ).toThrow("metric");
    }
  });

  it("rejects invalid timestamp and session id values", () => {
    expect(() =>
      normalizeReliabilitySignals([
        { session_id: "", observed_at: "2026-05-12T22:40:00Z" },
      ]),
    ).toThrow("session_id");

    expect(() =>
      normalizeReliabilitySignals([
        { session_id: "session-a", observed_at: "not-a-date" },
      ]),
    ).toThrow("observed_at");

    expect(() =>
      normalizeReliabilitySignals([
        { session_id: "session-a", observed_at: "2026-02-31T00:00:00Z" },
      ]),
    ).toThrow("observed_at");
  });
});

describe("summarizeReliabilitySignalWindow", () => {
  it("returns undefined for an empty window", () => {
    expect(summarizeReliabilitySignalWindow([])).toBeUndefined();
  });

  it("summarizes cross-session metric averages with weights", () => {
    const summary = summarizeReliabilitySignalWindow([
      {
        session_id: "session-1",
        observed_at: "2026-05-12T22:40:00Z",
        weight: 2,
        metrics: { pdr: 0.9, calibration: 0.8 },
      },
      {
        session_id: "session-2",
        observed_at: "2026-05-12T22:45:00Z",
        weight: 1,
        metrics: { pdr: 0.6, calibration: 0.5 },
      },
    ]);

    expect(summary?.session_count).toBe(2);
    expect(summary?.first_observed_at).toBe("2026-05-12T22:40:00Z");
    expect(summary?.last_observed_at).toBe("2026-05-12T22:45:00Z");
    expect(summary?.total_weight).toBe(3);
    expect(summary?.average_metrics.pdr).toBeCloseTo(0.8);
    expect(summary?.average_metrics.calibration).toBeCloseTo(0.7);
  });

  it("uses only signals with a metric in that metric's weighted average denominator", () => {
    const summary = summarizeReliabilitySignalWindow([
      {
        session_id: "session-1",
        observed_at: "2026-05-12T22:40:00Z",
        weight: 2,
        metrics: { calibration: 0.8, pdr: 0.9 },
      },
      {
        session_id: "session-2",
        observed_at: "2026-05-12T22:45:00Z",
        weight: 1,
        metrics: { pdr: 0.6 },
      },
    ]);

    expect(summary?.total_weight).toBe(3);
    expect(summary?.average_metrics.pdr).toBeCloseTo(0.8);
    expect(summary?.average_metrics.calibration).toBeCloseTo(0.8);
  });

  it("returns deterministic ordering for sorted window fields and metric keys", () => {
    const summary = summarizeReliabilitySignalWindow([
      {
        session_id: "session-b",
        observed_at: "2026-05-12T22:41:00Z",
        metrics: { pdr: 0.6, calibration: 0.5 },
      },
      {
        session_id: "session-a",
        observed_at: "2026-05-12T22:40:00Z",
        metrics: { robustness: 0.7, adaptation: 0.9 },
      },
    ]);

    expect(summary?.first_observed_at).toBe("2026-05-12T22:40:00Z");
    expect(summary?.last_observed_at).toBe("2026-05-12T22:41:00Z");
    expect(Object.keys(summary?.average_metrics ?? {})).toEqual([
      "adaptation",
      "calibration",
      "pdr",
      "robustness",
    ]);
  });
});
