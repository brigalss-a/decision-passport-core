import type { BasicProofBundle, PassportRecord, ChainManifest } from "./types.js";

export type DiffKind =
  | "record_added"
  | "record_removed"
  | "record_changed"
  | "manifest_changed"
  | "metadata_changed";

export interface BundleDiffFinding {
  kind: DiffKind;
  path: string;
  message: string;
  before?: unknown;
  after?: unknown;
}

export interface BundleDiffResult {
  identical: boolean;
  findings: BundleDiffFinding[];
  summary: string;
}

/**
 * Compare two BasicProofBundle objects and return a structured diff.
 * Reports manifest differences, added/removed records, and field-level changes.
 */
export function diffBundles(
  bundleA: BasicProofBundle,
  bundleB: BasicProofBundle,
): BundleDiffResult {
  const findings: BundleDiffFinding[] = [];

  // Compare top-level metadata
  if (bundleA.bundle_version !== bundleB.bundle_version) {
    findings.push({
      kind: "metadata_changed",
      path: "bundle_version",
      message: `bundle_version changed from "${bundleA.bundle_version}" to "${bundleB.bundle_version}"`,
      before: bundleA.bundle_version,
      after: bundleB.bundle_version,
    });
  }

  if (bundleA.exported_at_utc !== bundleB.exported_at_utc) {
    findings.push({
      kind: "metadata_changed",
      path: "exported_at_utc",
      message: `exported_at_utc changed`,
      before: bundleA.exported_at_utc,
      after: bundleB.exported_at_utc,
    });
  }

  // Compare manifests
  diffManifests(bundleA.manifest, bundleB.manifest, findings);

  // Compare records
  diffRecords(bundleA.passport_records, bundleB.passport_records, findings);

  const identical = findings.length === 0;
  const summary = identical
    ? "Bundles are identical."
    : buildSummary(findings);

  return { identical, findings, summary };
}

function diffManifests(
  a: ChainManifest,
  b: ChainManifest,
  findings: BundleDiffFinding[],
): void {
  const keys: (keyof ChainManifest)[] = [
    "chain_id",
    "record_count",
    "first_record_id",
    "last_record_id",
    "chain_hash",
  ];

  for (const key of keys) {
    if (a[key] !== b[key]) {
      findings.push({
        kind: "manifest_changed",
        path: `manifest.${key}`,
        message: `manifest.${key} differs`,
        before: a[key],
        after: b[key],
      });
    }
  }
}

function diffRecords(
  recordsA: PassportRecord[],
  recordsB: PassportRecord[],
  findings: BundleDiffFinding[],
): void {
  const mapA = new Map(recordsA.map((r) => [r.id, r]));
  const mapB = new Map(recordsB.map((r) => [r.id, r]));

  // Records in A but not in B
  for (const [id, record] of mapA) {
    if (!mapB.has(id)) {
      findings.push({
        kind: "record_removed",
        path: `records[${record.sequence}]`,
        message: `Record ${record.sequence} (${id}) present in bundle A but not in bundle B`,
        before: id,
      });
    }
  }

  // Records in B but not in A
  for (const [id, record] of mapB) {
    if (!mapA.has(id)) {
      findings.push({
        kind: "record_added",
        path: `records[${record.sequence}]`,
        message: `Record ${record.sequence} (${id}) present in bundle B but not in bundle A`,
        after: id,
      });
    }
  }

  // Records in both — compare fields
  for (const [id, recA] of mapA) {
    const recB = mapB.get(id);
    if (!recB) continue;

    const fields: (keyof PassportRecord)[] = [
      "chain_id",
      "sequence",
      "timestamp_utc",
      "actor_id",
      "actor_type",
      "action_type",
      "payload_hash",
      "prev_hash",
      "record_hash",
    ];

    for (const field of fields) {
      if (recA[field] !== recB[field]) {
        findings.push({
          kind: "record_changed",
          path: `records[id=${id}].${field}`,
          message: `Record ${recA.sequence} field "${field}" differs`,
          before: recA[field],
          after: recB[field],
        });
      }
    }

    // Deep-compare payload
    const payloadA = JSON.stringify(recA.payload);
    const payloadB = JSON.stringify(recB.payload);
    if (payloadA !== payloadB) {
      findings.push({
        kind: "record_changed",
        path: `records[id=${id}].payload`,
        message: `Record ${recA.sequence} payload differs`,
        before: recA.payload,
        after: recB.payload,
      });
    }

    // Deep-compare metadata if present
    const metaA = JSON.stringify(recA.metadata ?? null);
    const metaB = JSON.stringify(recB.metadata ?? null);
    if (metaA !== metaB) {
      findings.push({
        kind: "record_changed",
        path: `records[id=${id}].metadata`,
        message: `Record ${recA.sequence} metadata differs`,
        before: recA.metadata,
        after: recB.metadata,
      });
    }
  }
}

function buildSummary(findings: BundleDiffFinding[]): string {
  const kinds = [...new Set(findings.map((f) => f.kind))];
  const parts: string[] = [];
  const added = findings.filter((f) => f.kind === "record_added").length;
  const removed = findings.filter((f) => f.kind === "record_removed").length;
  const changed = findings.filter((f) => f.kind === "record_changed").length;

  if (added > 0) parts.push(`${added} record(s) added`);
  if (removed > 0) parts.push(`${removed} record(s) removed`);
  if (changed > 0) parts.push(`${changed} field change(s)`);
  if (kinds.includes("manifest_changed")) parts.push("manifest differs");
  if (kinds.includes("metadata_changed")) parts.push("bundle metadata differs");

  return `${findings.length} difference(s) found: ${parts.join("; ")}.`;
}
