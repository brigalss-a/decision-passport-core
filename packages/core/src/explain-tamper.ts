import { hashCanonical, hashPayload } from "./hashing.js";
import { GENESIS_HASH } from "./chain.js";
import type { PassportRecord, ChainManifest } from "./types.js";

export interface TamperFinding {
  recordIndex: number;
  recordId: string;
  kind: "payload_hash" | "record_hash" | "prev_hash" | "sequence" | "manifest_chain_hash";
  expected: string;
  actual: string;
  message: string;
}

export interface TamperExplanation {
  tampered: boolean;
  findings: TamperFinding[];
  summary: string;
}

export function explainTamper(
  records: PassportRecord[],
  manifest?: ChainManifest,
): TamperExplanation {
  const findings: TamperFinding[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Check sequence
    if (record.sequence !== i) {
      findings.push({
        recordIndex: i,
        recordId: record.id,
        kind: "sequence",
        expected: String(i),
        actual: String(record.sequence),
        message: `Record ${i} has sequence ${record.sequence}, expected ${i}`,
      });
    }

    // Check prev_hash linkage
    const expectedPrev = i === 0 ? GENESIS_HASH : records[i - 1].record_hash;
    if (record.prev_hash !== expectedPrev) {
      findings.push({
        recordIndex: i,
        recordId: record.id,
        kind: "prev_hash",
        expected: expectedPrev,
        actual: record.prev_hash,
        message: `Record ${i} prev_hash does not match record ${i - 1} hash — chain link broken`,
      });
    }

    // Check payload_hash
    const recomputedPayloadHash = hashPayload(record.payload);
    if (recomputedPayloadHash !== record.payload_hash) {
      findings.push({
        recordIndex: i,
        recordId: record.id,
        kind: "payload_hash",
        expected: recomputedPayloadHash,
        actual: record.payload_hash,
        message: `Record ${i} payload was modified — payload hash mismatch`,
      });
    }

    // Check record_hash
    const { record_hash, ...rest } = record;
    const recomputedRecordHash = hashCanonical(rest);
    if (recomputedRecordHash !== record_hash) {
      findings.push({
        recordIndex: i,
        recordId: record.id,
        kind: "record_hash",
        expected: recomputedRecordHash,
        actual: record_hash,
        message: `Record ${i} record_hash mismatch — record content was altered`,
      });
    }
  }

  // Check manifest chain_hash if provided
  if (manifest && records.length > 0) {
    const lastHash = records[records.length - 1].record_hash;
    if (manifest.chain_hash !== lastHash) {
      findings.push({
        recordIndex: records.length - 1,
        recordId: records[records.length - 1].id,
        kind: "manifest_chain_hash",
        expected: lastHash,
        actual: manifest.chain_hash,
        message: `Manifest chain_hash does not match last record hash`,
      });
    }
  }

  const tampered = findings.length > 0;
  let summary: string;

  if (!tampered) {
    summary = "No tampering detected. All records, hashes, and chain links are intact.";
  } else {
    const kinds = [...new Set(findings.map((f) => f.kind))];
    const parts: string[] = [];
    if (kinds.includes("payload_hash")) parts.push("payload content was modified");
    if (kinds.includes("record_hash")) parts.push("record hashes are inconsistent");
    if (kinds.includes("prev_hash")) parts.push("chain links are broken");
    if (kinds.includes("sequence")) parts.push("record sequencing is wrong");
    if (kinds.includes("manifest_chain_hash")) parts.push("manifest does not match chain");
    summary = `Tampering detected in ${findings.length} check(s): ${parts.join("; ")}.`;
  }

  return { tampered, findings, summary };
}
