from __future__ import annotations

import hashlib
from typing import Any

from .canonical import canonical_serialize


def sha256_hex(input_value: str) -> str:
    return hashlib.sha256(input_value.encode("utf-8")).hexdigest()


def hash_canonical(input_value: Any) -> str:
    return sha256_hex(canonical_serialize(input_value))


def hash_payload(payload: dict[str, Any]) -> str:
    return hash_canonical(payload)
