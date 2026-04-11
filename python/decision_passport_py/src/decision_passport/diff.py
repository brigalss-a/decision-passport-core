from __future__ import annotations

import argparse
import json
from pathlib import Path

from .diff_bundles import diff_bundles


def _load_json(path: str) -> object:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Diff two Decision Passport bundles")
    parser.add_argument("bundle_a", help="Path to first bundle JSON")
    parser.add_argument("bundle_b", help="Path to second bundle JSON")
    args = parser.parse_args()

    result = diff_bundles(_load_json(args.bundle_a), _load_json(args.bundle_b))
    print(json.dumps(result, indent=2))
    return 0 if result["identical"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
