from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from .exceptions import ChainValidationError
from .hashing import hash_canonical, hash_payload
from .types import ActionType, ActorType, PassportRecord

GENESIS_HASH = "GENESIS_0000000000000000000000000000000000000000000000000000000000000000"


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def create_record(*,
    chain_id: str,
    last_record: PassportRecord | None,
    actor_id: str,
    actor_type: ActorType,
    action_type: ActionType,
    payload: dict,
    metadata: dict | None = None,
    record_id: str | None = None,
    timestamp_utc: str | None = None,
) -> PassportRecord:
    sequence = (last_record["sequence"] + 1) if last_record else 0
    prev_hash = last_record["record_hash"] if last_record else GENESIS_HASH
    payload_hash = hash_payload(payload)

    record_without_hash: dict = {
        "id": record_id or str(uuid4()),
        "chain_id": chain_id,
        "sequence": sequence,
        "timestamp_utc": timestamp_utc or _now_utc_iso(),
        "actor_id": actor_id,
        "actor_type": actor_type,
        "action_type": action_type,
        "payload": payload,
        "payload_hash": payload_hash,
        "prev_hash": prev_hash,
    }
    if metadata is not None:
        record_without_hash["metadata"] = metadata

    record_hash = hash_canonical(record_without_hash)
    return {**record_without_hash, "record_hash": record_hash}


def verify_chain(records: list[PassportRecord]) -> dict[str, str | bool]:
    for index, record in enumerate(records):
        expected_sequence = index
        expected_prev = GENESIS_HASH if index == 0 else records[index - 1]["record_hash"]

        if record["sequence"] != expected_sequence:
            return {"valid": False, "error": f"Sequence mismatch at index {index}"}

        if record["prev_hash"] != expected_prev:
            return {"valid": False, "error": f"prev_hash mismatch at index {index}"}

        record_hash = record["record_hash"]
        rest = {k: v for k, v in record.items() if k != "record_hash"}
        recomputed = hash_canonical(rest)
        if recomputed != record_hash:
            return {"valid": False, "error": f"record_hash mismatch at index {index}"}

    return {"valid": True}


def assert_valid_chain(records: list[PassportRecord]) -> None:
    result = verify_chain(records)
    if not bool(result["valid"]):
        raise ChainValidationError(str(result.get("error", "Invalid chain")))
