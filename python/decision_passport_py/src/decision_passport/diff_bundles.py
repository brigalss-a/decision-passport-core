from __future__ import annotations

import json

from .types import BasicProofBundle, ChainManifest, PassportRecord


def diff_bundles(bundle_a: BasicProofBundle, bundle_b: BasicProofBundle) -> dict:
    findings: list[dict] = []

    if bundle_a["bundle_version"] != bundle_b["bundle_version"]:
        findings.append(
            {
                "kind": "metadata_changed",
                "path": "bundle_version",
                "message": f'bundle_version changed from "{bundle_a["bundle_version"]}" to "{bundle_b["bundle_version"]}"',
                "before": bundle_a["bundle_version"],
                "after": bundle_b["bundle_version"],
            }
        )

    if bundle_a["exported_at_utc"] != bundle_b["exported_at_utc"]:
        findings.append(
            {
                "kind": "metadata_changed",
                "path": "exported_at_utc",
                "message": "exported_at_utc changed",
                "before": bundle_a["exported_at_utc"],
                "after": bundle_b["exported_at_utc"],
            }
        )

    _diff_manifests(bundle_a["manifest"], bundle_b["manifest"], findings)
    _diff_records(bundle_a["passport_records"], bundle_b["passport_records"], findings)

    identical = len(findings) == 0
    summary = "Bundles are identical." if identical else _build_summary(findings)
    return {"identical": identical, "findings": findings, "summary": summary}


def _diff_manifests(a: ChainManifest, b: ChainManifest, findings: list[dict]) -> None:
    for key in ["chain_id", "record_count", "first_record_id", "last_record_id", "chain_hash"]:
        if a[key] != b[key]:
            findings.append(
                {
                    "kind": "manifest_changed",
                    "path": f"manifest.{key}",
                    "message": f"manifest.{key} differs",
                    "before": a[key],
                    "after": b[key],
                }
            )


def _diff_records(records_a: list[PassportRecord], records_b: list[PassportRecord], findings: list[dict]) -> None:
    map_a = {record["id"]: record for record in records_a}
    map_b = {record["id"]: record for record in records_b}

    for record_id, record in map_a.items():
        if record_id not in map_b:
            findings.append(
                {
                    "kind": "record_removed",
                    "path": f"records[{record['sequence']}]",
                    "message": f"Record {record['sequence']} ({record_id}) present in bundle A but not in bundle B",
                    "before": record_id,
                }
            )

    for record_id, record in map_b.items():
        if record_id not in map_a:
            findings.append(
                {
                    "kind": "record_added",
                    "path": f"records[{record['sequence']}]",
                    "message": f"Record {record['sequence']} ({record_id}) present in bundle B but not in bundle A",
                    "after": record_id,
                }
            )

    fields = [
        "chain_id",
        "sequence",
        "timestamp_utc",
        "actor_id",
        "actor_type",
        "action_type",
        "payload_hash",
        "prev_hash",
        "record_hash",
    ]

    for record_id, rec_a in map_a.items():
        rec_b = map_b.get(record_id)
        if rec_b is None:
            continue

        for field in fields:
            if rec_a[field] != rec_b[field]:
                findings.append(
                    {
                        "kind": "record_changed",
                        "path": f"records[id={record_id}].{field}",
                        "message": f"Record {rec_a['sequence']} field \"{field}\" differs",
                        "before": rec_a[field],
                        "after": rec_b[field],
                    }
                )

        if json.dumps(rec_a["payload"], separators=(",", ":"), sort_keys=False) != json.dumps(
            rec_b["payload"], separators=(",", ":"), sort_keys=False
        ):
            findings.append(
                {
                    "kind": "record_changed",
                    "path": f"records[id={record_id}].payload",
                    "message": f"Record {rec_a['sequence']} payload differs",
                    "before": rec_a["payload"],
                    "after": rec_b["payload"],
                }
            )

        if json.dumps(rec_a.get("metadata"), separators=(",", ":"), sort_keys=False) != json.dumps(
            rec_b.get("metadata"), separators=(",", ":"), sort_keys=False
        ):
            findings.append(
                {
                    "kind": "record_changed",
                    "path": f"records[id={record_id}].metadata",
                    "message": f"Record {rec_a['sequence']} metadata differs",
                    "before": rec_a.get("metadata"),
                    "after": rec_b.get("metadata"),
                }
            )


def _build_summary(findings: list[dict]) -> str:
    kinds = {finding["kind"] for finding in findings}
    parts: list[str] = []

    added = len([f for f in findings if f["kind"] == "record_added"])
    removed = len([f for f in findings if f["kind"] == "record_removed"])
    changed = len([f for f in findings if f["kind"] == "record_changed"])

    if added > 0:
        parts.append(f"{added} record(s) added")
    if removed > 0:
        parts.append(f"{removed} record(s) removed")
    if changed > 0:
        parts.append(f"{changed} field change(s)")
    if "manifest_changed" in kinds:
        parts.append("manifest differs")
    if "metadata_changed" in kinds:
        parts.append("bundle metadata differs")

    return f"{len(findings)} difference(s) found: {'; '.join(parts)}."
