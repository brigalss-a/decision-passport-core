from __future__ import annotations

import json
import math
from typing import Any

from .exceptions import CanonicalSerializationError


def _serialize_number(value: int | float) -> str:
    if not math.isfinite(value):
        raise CanonicalSerializationError(f"Non-finite number: {value}")
    if isinstance(value, float):
        if value == 0.0:
            return "0"
        if value.is_integer():
            return str(int(value))
        return json.dumps(value, separators=(",", ":"), ensure_ascii=True)
    return str(value)


def _serialize_value(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return _serialize_number(value)
    if isinstance(value, str):
        return json.dumps(value, separators=(",", ":"), ensure_ascii=True)
    if isinstance(value, list):
        return "[" + ",".join(_serialize_value(v) for v in value) + "]"
    if isinstance(value, dict):
        keys = sorted(value.keys())
        parts = []
        for key in keys:
            if not isinstance(key, str):
                raise CanonicalSerializationError("Object keys must be strings")
            parts.append(f"{json.dumps(key, ensure_ascii=True)}:{_serialize_value(value[key])}")
        return "{" + ",".join(parts) + "}"
    raise CanonicalSerializationError(f"Unsupported type: {type(value).__name__}")


def canonical_serialize(input_value: Any) -> str:
    return _serialize_value(input_value)
