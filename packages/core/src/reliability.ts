/**
 * Derived reliability profiles computed from verified BasicProofBundle archives.
 *
 * This module is strictly additive and read-only with respect to existing core types.
 * It derives cross-session behavioral trend data from already-verified bundle inputs.
 *
 * Design constraints (per issue #1):
 * - Pure / deterministic — same inputs produce same outputs; no runtime timestamps
 * - Zero external dependencies — stdlib only
 * - Strictly derived from existing verified bundle inputs
 * - Explicit about provenance: all results include source chain_ids and chain_hashes
 * - Does NOT produce attestations; produces "derived reliability profiles"
 *
 * Actor / chain semantics:
 * - A "session" corresponds to one BasicProofBundle (one chain_id).
 * - An actor participates in a session if ≥ 1 of its passport_records has a
 *   matching actor_id.  Bundles where the actor has zero records are excluded
 *   by default (see `includeInactiveSessions` option) to avoid distorting trends
 *   with synthetic zero-rate data points.
 * - Provenance for each session is anchored to the source bundle's manifest
 *   chain_hash and chain_id — both are surfaced in every summary so consumers
 *   can independently re-verify any session.
 */

import type { BasicProofBundle, PassportRecord } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Outcome classification for a single PassportRecord action. */
export type ActionOutcome = "success" | "failure" | "approval_granted" | "approval_rejected" | "override" | "other";

/**
 * Per-session reliability summary derived from a single BasicProofBundle.
 *
 * Provenance is anchored to both the bundle's manifest `chain_id` (human-readable
 * identifier) and its `chain_hash` (cryptographic integrity anchor).
 */
export interface SessionReliabilitySummary {
  /** The chain_id from the source bundle manifest (human-readable session key). */
  readonly chain_id: string;
  /** The chain_hash from the source bundle manifest (cryptographic integrity anchor). */
  readonly source_chain_hash: string;
  /** Exported timestamp from the source bundle manifest (ISO 8601 UTC). */
  readonly exported_at_utc: string;
  /** Total records attributed to this actor in the bundle. */
  readonly record_count: number;
  /** Counts per ActionType for this actor's records. */
  readonly action_type_counts: Readonly<Record<string, number>>;
  /** Fraction of records with outcome "failure" or "approval_rejected". */
  readonly adverse_rate: number;
  /** Fraction of records with outcome "override". */
  readonly override_rate: number;
  /** Fraction of execution-attempt records with outcome "EXECUTION_SUCCEEDED". */
  readonly execution_success_rate: number;
}

/** Direction of a linear trend over ordered sessions. */
export type TrendDirection = "improving" | "worsening" | "stable";

/**
 * Behavioral trend computed across an ordered sequence of SessionReliabilitySummary records.
 *
 * Adverse-direction semantics:
 * - adverse_rate:             higher is worse → slope > 0 = "worsening"
 * - override_rate:            higher is worse → slope > 0 = "worsening"
 * - execution_success_rate:   higher is better → slope < 0 = "worsening"
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
   * True when abs(slope) >= SIGNIFICANCE_THRESHOLD (0.01 per session by default).
   */
  readonly significant: boolean;
}

/**
 * Options for `computeActorReliabilityProfile`.
 */
export interface ActorReliabilityOptions {
  /**
   * When false (default), bundles where the target actor has zero matching
   * records are excluded from the session window.  This prevents distorting
   * trends with synthetic zero-rate data points for periods when the actor
   * was simply absent from those chains.
   *
   * Set to `true` to include inactive sessions explicitly (zero rates are
   * then treated as genuine observation of zero activity).
   */
  readonly includeInactiveSessions?: boolean;
}

/**
 * Aggregated cross-session reliability profile for a single actor.
 *
 * Provenance: `source_chain_ids` and `source_chain_hashes` list the chain_id
 * and chain_hash respectively for every bundle included in this profile, in
 * session order.  Consumers can independently re-verify any session by
 * recomputing the profile from the source bundle whose chain_hash matches.
 *
 * NOTE: Profiles MUST NOT be passed back into verifyChain() or treated as
 * canonical records.  They are derived analytics, not verified chain data.
 */
export interface ActorReliabilityProfile {
  /** The actor_id this profile is computed for. */
  readonly actor_id: string;
  /**
   * Ordered per-session summaries (oldest → newest by exported_at_utc).
   * Contains only sessions where the actor has ≥ 1 record (by default).
   * Always contains at least 1 entry.
   */
  readonly sessions: readonly SessionReliabilitySummary[];
  /**
   * chain_id values for each source bundle, in session order (human-readable).
   * Parallel array to `source_chain_hashes`.
   */
  readonly source_chain_ids: readonly string[];
  /**
   * chain_hash values for each source bundle, in session order (cryptographic).
   * Parallel array to `source_chain_ids`.
   */
  readonly source_chain_hashes: readonly string[];
  /**
   * Cross-session behavioral trends. Undefined when sessions.length < 2.
   */
  readonly trends?: readonly BehavioralTrend[];
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

/**
 * Compare two ISO 8601 UTC strings lexicographically for sorting.
 * Valid ISO timestamps sort correctly as strings.
 */
function compareExportedAt(a: BasicProofBundle, b: BasicProofBundle): number {
  if (a.exported_at_utc < b.exported_at_utc) return -1;
  if (a.exported_at_utc > b.exported_at_utc) return 1;
  // Tiebreak on chain_id for full determinism
  if (a.manifest.chain_id < b.manifest.chain_id) return -1;
  if (a.manifest.chain_id > b.manifest.chain_id) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive a SessionReliabilitySummary from an actor's records within a bundle.
 *
 * The `actorRecords` parameter must already be filtered to the target actor.
 * The `bundle` parameter is used solely for provenance anchoring (chain_id,
 * chain_hash, exported_at_utc from the manifest).
 *
 * Edge cases:
 * - Zero actorRecords → all rates return 0; record_count = 0.
 * - No execution-attempt records → execution_success_rate = 0.
 */
export function summarizeBundleForActor(
  bundle: BasicProofBundle,
  actorRecords: readonly PassportRecord[],
): SessionReliabilitySummary {
  const n = actorRecords.length;

  const actionTypeCounts: Record<string, number> = {};
  let adverseCount = 0;
  let overrideCount = 0;
  let executionAttempts = 0;
  let executionSuccesses = 0;

  for (const record of actorRecords) {
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
    source_chain_hash: bundle.manifest.chain_hash,
    exported_at_utc: bundle.exported_at_utc,
    record_count: n,
    action_type_counts: Object.freeze(actionTypeCounts),
    adverse_rate: n === 0 ? 0 : adverseCount / n,
    override_rate: n === 0 ? 0 : overrideCount / n,
    execution_success_rate: executionAttempts === 0 ? 0 : executionSuccesses / executionAttempts,
  };
}

/**
 * Compute an ActorReliabilityProfile for a single actor from a collection of
 * verified bundles.
 *
 * Bundles are sorted internally by `exported_at_utc` (then `chain_id` for tiebreaks)
 * so callers do not need to pre-sort — the output order is always deterministic
 * given the same input set.
 *
 * By default, bundles where the target actor has zero matching records are excluded
 * from the session window (see `options.includeInactiveSessions`).
 *
 * Edge cases:
 * - Empty bundles array → throws RangeError
 * - All bundles filtered out (actor absent from all) → throws RangeError
 * - Single active session → profile includes one session; trends are undefined
 * - Duplicate chain_ids → allowed; provenance arrays preserve all entries in order
 */
export function computeActorReliabilityProfile(
  actorId: string,
  bundles: readonly BasicProofBundle[],
  options: ActorReliabilityOptions = {},
): ActorReliabilityProfile {
  if (bundles.length === 0) {
    throw new RangeError(
      `computeActorReliabilityProfile: no bundles provided for actor "${actorId}"`,
    );
  }

  const { includeInactiveSessions = false } = options;

  // Sort deterministically: oldest exported_at_utc first, chain_id as tiebreak
  const sorted = [...bundles].sort(compareExportedAt);

  // Derive per-session summaries, filtering inactive sessions unless opted in
  const sessions: SessionReliabilitySummary[] = [];
  for (const bundle of sorted) {
    const actorRecords = bundle.passport_records.filter(
      (r) => r.actor_id === actorId,
    );
    if (!includeInactiveSessions && actorRecords.length === 0) {
      // Actor was absent from this chain; exclude to avoid distorting trend baseline
      continue;
    }
    sessions.push(summarizeBundleForActor(bundle, actorRecords));
  }

  if (sessions.length === 0) {
    throw new RangeError(
      `computeActorReliabilityProfile: actor "${actorId}" has no records in any of the ` +
      `${bundles.length} provided bundle(s). Pass includeInactiveSessions: true to include ` +
      `bundles where the actor is absent.`,
    );
  }

  const sourceChainIds = sessions.map((s) => s.chain_id);
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
    sessions: Object.freeze(sessions),
    source_chain_ids: Object.freeze(sourceChainIds),
    source_chain_hashes: Object.freeze(sourceChainHashes),
    ...(trends !== undefined ? { trends: Object.freeze(trends) } : {}),
  };
}
