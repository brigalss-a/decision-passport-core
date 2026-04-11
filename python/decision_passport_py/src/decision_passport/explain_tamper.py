from __future__ import annotations

from .chain import GENESIS_HASH
from .hashing import hash_canonical, hash_payload
from .types import ChainManifest, PassportRecord, TamperExplanation, TamperFinding


def explain_tamper_chain(
    records: list[PassportRecord],
    manifest: ChainManifest | None = None,
) -> TamperExplanation:
    findings: list[TamperFinding] = []

    for index, record in enumerate(records):
        if record["sequence"] != index:
            findings.append(
                {
                    "recordIndex": index,
                    "recordId": record["id"],
                    "kind": "sequence",
                    "expected": str(index),
                    "actual": str(record["sequence"]),
                    "message": f"Record {index} has sequence {record['sequence']}, expected {index}",
                }
            )

        expected_prev = GENESIS_HASH if index == 0 else records[index - 1]["record_hash"]
        if record["prev_hash"] != expected_prev:
            findings.append(
                {
                    "recordIndex": index,
                    "recordId": record["id"],
                    "kind": "prev_hash",
                    "expected": expected_prev,
                    "actual": record["prev_hash"],
                    "message": f"Record {index} prev_hash does not match record {index - 1} hash — chain link broken",
                }
            )

        recomputed_payload = hash_payload(record["payload"])
        if recomputed_payload != record["payload_hash"]:
            findings.append(
                {
                    "recordIndex": index,
                    "recordId": record["id"],
                    "kind": "payload_hash",
                    "expected": recomputed_payload,
                    "actual": record["payload_hash"],
                    "message": f"Record {index} payload was modified — payload hash mismatch",
                }
            )

        stored_record_hash = record["record_hash"]
        rest = {k: v for k, v in record.items() if k != "record_hash"}
        recomputed_record_hash = hash_canonical(rest)
        if recomputed_record_hash != stored_record_hash:
            findings.append(
                {
                    "recordIndex": index,
                    "recordId": record["id"],
                    "kind": "record_hash",
                    "expected": recomputed_record_hash,
                    "actual": stored_record_hash,
                    "message": f"Record {index} record_hash mismatch — record content was altered",
                }
            )

    if manifest is not None and len(records) > 0:
        last_hash = records[-1]["record_hash"]
        if manifest["chain_hash"] != last_hash:
            findings.append(
                {
                    "recordIndex": len(records) - 1,
                    "recordId": records[-1]["id"],
                    "kind": "manifest_chain_hash",
                    "expected": last_hash,
                    "actual": manifest["chain_hash"],
                    "message": "Manifest chain_hash does not match last record hash",
                }
            )

    tampered = len(findings) > 0
    if not tampered:
        summary = "No tampering detected. All records, hashes, and chain links are intact."
    else:
        kinds = {f["kind"] for f in findings}
        parts: list[str] = []
        if "payload_hash" in kinds:
            parts.append("payload content was modified")
        if "record_hash" in kinds:
            parts.append("record hashes are inconsistent")
        if "prev_hash" in kinds:
            parts.append("chain links are broken")
        if "sequence" in kinds:
            parts.append("record sequencing is wrong")
        if "manifest_chain_hash" in kinds:
            parts.append("manifest does not match chain")
        summary = f"Tampering detected in {len(findings)} check(s): {'; '.join(parts)}."

    return {
        "tampered": tampered,
        "findings": findings,
        "summary": summary,
    }
