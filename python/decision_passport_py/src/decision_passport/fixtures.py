from __future__ import annotations

import json
from pathlib import Path
from typing import Final

_VALID_NAMES: Final[set[str]] = {
    "valid-bundle",
    "tampered-bundle",
    "broken-prev-hash",
    "wrong-sequence",
    "wrong-chain-hash",
    "malformed-bundle",
    "malformed-structure",
    "unsupported-version",
    "unsupported-profile",
    "missing-manifest-chain-hash",
    "invalid-exported-at-type",
    "auth-exec-mismatch",
    "semantic-inconsistent",
    "compatible-optional-metadata",
}

_NAME_TO_FILE: Final[dict[str, str]] = {
    "valid-bundle": "valid-bundle.json",
    "tampered-bundle": "tampered-bundle.json",
    "broken-prev-hash": "broken-prev-hash.json",
    "wrong-sequence": "wrong-sequence.json",
    "wrong-chain-hash": "wrong-chain-hash.json",
    "malformed-bundle": "malformed-bundle.json",
    "malformed-structure": "malformed-bundle.json",
    "unsupported-version": "unsupported-version.json",
    "unsupported-profile": "unsupported-profile.json",
    "missing-manifest-chain-hash": "missing-manifest-chain-hash.json",
    "invalid-exported-at-type": "invalid-exported-at-type.json",
    "auth-exec-mismatch": "auth-exec-mismatch.json",
    "semantic-inconsistent": "semantic-inconsistent.json",
    "compatible-optional-metadata": "compatible-optional-metadata.json",
}


def _fixtures_dir() -> Path:
    # python/decision_passport_py/src/decision_passport/fixtures.py -> repo_root/fixtures
    return Path(__file__).resolve().parents[4] / "fixtures"


def load_fixture(name: str) -> object:
    if name not in _VALID_NAMES:
        supported = ", ".join(sorted(_VALID_NAMES))
        raise ValueError(f"Unknown fixture '{name}'. Supported fixtures: {supported}")

    fixture_path = _fixtures_dir() / _NAME_TO_FILE[name]
    return json.loads(fixture_path.read_text(encoding="utf-8"))
