/**
 * Derived reliability profiles computed from verified BasicProofBundle archives.
 *
 * This module is strictly additive and read-only with respect to existing core types.
 * It derives cross-session behavioral trend data from already-verified bundle inputs.
 *
 * Design constraints (per issue #1):
 * - Pure / deterministic — same inputs produce same outputs
 * - Zero external dependencies — stdlib only
 * - Strictly derived from existing verified bundle inputs
 * - Explicit about provenance: all results include source chain_ids and manifest hashes
 * - Does NOT produce attestations; produces "derived reliability profiles"
 */

import type { BasicProofBundle, PassportRecord } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Outcome classification for a single PassportRecord action. */
export type ActionOutcome = "success" | "failure" | "approval_granted" | "approval_rejected" | "override" | "other";

/**
 * Per-session reliability summary derived from a single BasicProofBundle.
 * Provenance is anchored to the bundle's manifest chain_hash.
 */
export interface SessionReliabilitySummary {
  /** The chain_id from the source bundle manifest. */
  readonly chain_id: string;
  /** Exported timestamp from the source bundle (ISO 8601 UTC). */
  readonly exported_at_utc: string;
  /** chain_hash from the source manifest — provenance anchor. */
  readonly source_chain_hash: string;
  /** Total records in the bundle. */
  readonly record_count: number;
  /** Counts per ActionType. */
  readonly action_type_counts: Readonly<Record<string, number>>;
  /** Fraction of records with outcome "failure" or "approval_rejected". */
  readonly adverse_rate: number;
  /** Fraction of records with outcome "override". */
  readonly override_rate: number;
  /** Fraction of records with action "EXECUTION_SUCCEEDED" over all execution attempts. */
  readonly execution_success_rate: number;
}

/** Direction of a linear trend over ordered sessions. */
export type TrendDirection = "improving" | "worsening" | "stable";

/**
 * Behavioral trend computed across an ordered sequence of SessionReliabilitySummary records.
 *
 * Adverse-direction semantics:
 * - adverse_rate:         higher is worse → slope > 0 = "worsening"
 * - override_rate:        higher is worse → slope > 0 = "worsening"
 * - execution_success_rate: higher is better → slope < 0 = "worsening"
 */
export interface BehavioralTrend {
  /** Name of the metric being trended. */
  readonly metric: "adverse_rate" | "override_rate" | "execution_success_rate";
  /**
   * Linear regression slope over the ordered session values.
   * Units: metric-units per session.
   */
  readonly slope: number;
  /** Human-readable direction label given adverse-direction semantics. */
  readonly direction: TrendDirection;
  /** Number of sessions included in the trend window. */
  readonly window_size: number;
  /**
   * Whether the trend is statistically meaningful.
   * True when abs(slope) > SIGNIFICANCE_THRESHOLD (0.01 per session by default).
   */
  readonly significant: boolean;
}

/**
 * Aggregated cross-session reliability profile for a single actor.
 *
 * Provenance: source_chain_ids lists every chain_hash from which this profile is derived.
 * Profiles MUST NOT be passed back into verifyChain() or treated as canonical records.
 */
export interface ActorReliabilityProfile {
  /** The actor_id this profile is computed for. */
  readonly actor_id: string;
  /**
   * Ordered per-session summaries (oldest → newest by exported_at_utc).
   * Must contain at least 1 entry; trend fields require ≥ 2.
   */
  readonly sessions: readonly SessionReliabilitySummary[];
  /**
   * Provenance anchors: one chain_hash per source bundle, in session order.
   * Consumers can independently re-verify any session by re-computing the profile
   * from the source bundle with the matching chain_hash.
   */
  readonly source_chain_hashes: readonly string[];
  /**
   * Cross-session behavioral trends. Undefined when sessions.length < 2.
   */
  readonly trends?: readonly BehavioralTrend[];
  /** ISO 8601 UTC timestamp when this profile was computed. */
  readonly computed_at_utc: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Minimum absolute slope treated as "significant" trend.
 * Below this threshold a trend is labelled "stable".
 */
export const SIGNIFICANCE_THRESHOLD = 0.01;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function classifyOutcome(record: PassportRecord): ActionOutcome {
  switch (record.action_type) {
    case "EXECUTION_SUCCEEDED":
      return "success";
    case "EXECUTION_FAILED":
    case "EXECUTION_ABORTED":
      return "failure";
    case "HUMAN_APPROVAL_GRANTED":
    case "POLICY_APPROVAL_GRANTED":
      return "approval_granted";
    case "HUMAN_APPROVAL_REJECTED":
    case "POLICY_EXCEPTION":
      return "approval_rejected";
    case "HUMAN_OVERRIDE":
      return "override";
    default:
      return "other";
  }
}

/**
 * Ordinary least-squares slope over a sequence of (x=0..n-1, y=values) pairs.
 * Returns 0 for single-element or empty sequences.
 */
function leastSquaresSlope(values: readonly number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function trendDirection(
  slope: number,
  metric: BehavioralTrend["metric"],
): TrendDirection {
  if (Math.abs(slope) < SIGNIFICANCE_THRESHOLD) return "stable";
  // adverse_rate and override_rate: higher = worse
  if (metric === "adverse_rate" || metric === "override_rate") {
    return slope > 0 ? "worsening" : "improving";
  }
  // execution_success_rate: higher = better
  return slope > 0 ? "improving" : "worsening";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive a SessionReliabilitySummary from a verified BasicProofBundle.
 *
 * The summary is keyed to the bundle's manifest chain_hash for provenance.
 * Bundles with zero records return rates of 0.
 */
export function summarizeBundle(bundle: BasicProofBundle): SessionReliabilitySummary {
  const records = bundle.passport_records;
  const n = records.length;

  const actionTypeCounts: Record<string, number> = {};
  let adverseCount = 0;
  let overrideCount = 0;
  let executionAttempts = 0;
  let executionSuccesses = 0;

  for (const record of records) {
    const at = record.action_type;
    actionTypeCounts[at] = (actionTypeCounts[at] ?? 0) + 1;

    const outcome = classifyOutcome(record);
    if (outcome === "failure" || outcome === "approval_rejected") adverseCount++;
    if (outcome === "override") overrideCount++;
    if (
      at === "EXECUTION_SUCCEEDED" ||
      at === "EXECUTION_FAILED" ||
      at === "EXECUTION_ABORTED"
    ) {
      executionAttempts++;
      if (at === "EXECUTION_SUCCEEDED") executionSuccesses++;
    }
  }

  return {
    chain_id: bundle.manifest.chain_id,
    exported_at_utc: bundle.exported_at_utc,
    source_chain_hash: bundle.manifest.chain_hash,
    record_count: n,
    action_type_counts: Object.freeze(actionTypeCounts),
    adverse_rate: n === 0 ? 0 : adverseCount / n,
    override_rate: n === 0 ? 0 : overrideCount / n,
    execution_success_rate: executionAttempts === 0 ? 0 : executionSuccesses / executionAttempts,
  };
}

/**
 * Compute an ActorReliabilityProfile for a single actor from an ordered sequence
 * of verified bundles (oldest → newest).
 *
 * All bundles MUST originate from the same actor_id. Bundles where no record
 * matches actor_id are included in the session window but contribute zero
 * adverse/override rates — this preserves time-ordering without silently skipping
 * sessions where the actor was inactive.
 *
 * Edge cases:
 * - Empty bundles array → throws RangeError (no sessions to profile)
 * - Bundles not sorted by exported_at_utc → results are defined but caller is
 *   responsible for ordering; unsorted inputs are explicitly not validated here
 *   because sorting order is a caller concern (different actors may share chains)
 * - Duplicate chain_ids → allowed; source_chain_hashes preserves all provenance
 * - Single bundle → profile includes one session; trends are undefined
 */
export function computeActorReliabilityProfile(
  actorId: string,
  bundles: readonly BasicProofBundle[],
): ActorReliabilityProfile {
  if (bundles.length === 0) {
    throw new RangeError(
      `computeActorReliabilityProfile: no bundles provided for actor "${actorId}"`,
    );
  }

  // Filter each bundle to only this actor's records, then summarize
  const sessions: SessionReliabilitySummary[] = bundles.map((bundle) => {
    const actorRecords = bundle.passport_records.filter(
      (r) => r.actor_id === actorId,
    );
    // Build a minimal synthetic bundle view for this actor within the session.
    // Provenance is still anchored to the original bundle manifest chain_hash.
    const actorBundle: BasicProofBundle = {
      bundle_version: bundle.bundle_version,
      exported_at_utc: bundle.exported_at_utc,
      passport_records: actorRecords,
      manifest: bundle.manifest, // original manifest — preserves chain provenance
    };
    return summarizeBundle(actorBundle);
  });

  const sourceChainHashes = sessions.map((s) => s.source_chain_hash);

  let trends: BehavioralTrend[] | undefined;
  if (sessions.length >= 2) {
    const metrics: Array<BehavioralTrend["metric"]> = [
      "adverse_rate",
      "override_rate",
      "execution_success_rate",
    ];
    trends = metrics.map((metric) => {
      const values = sessions.map((s) => s[metric]);
      const slope = leastSquaresSlope(values);
      const direction = trendDirection(slope, metric);
      return {
        metric,
        slope,
        direction,
        window_size: sessions.length,
        significant: Math.abs(slope) >= SIGNIFICANCE_THRESHOLD,
      } satisfies BehavioralTrend;
    });
  }

  return {
    actor_id: actorId,
    sessions,
    source_chain_hashes: Object.freeze(sourceChainHashes),
    ...(trends !== undefined ? { trends: Object.freeze(trends) } : {}),
    computed_at_utc: new Date().toISOString(),
  };
}
