from __future__ import annotations

from .types import ChainManifest, PassportRecord


def create_manifest(records: list[PassportRecord]) -> ChainManifest:
    if len(records) == 0:
        return {
            "chain_id": "empty-chain",
            "record_count": 0,
            "first_record_id": "",
            "last_record_id": "",
            "chain_hash": "",
        }
    first = records[0]
    last = records[-1]
    return {
        "chain_id": first["chain_id"],
        "record_count": len(records),
        "first_record_id": first["id"],
        "last_record_id": last["id"],
        "chain_hash": last["record_hash"],
    }
