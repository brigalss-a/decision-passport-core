from __future__ import annotations

import argparse
import json
from pathlib import Path

from .diff_bundles import diff_bundles
from .verify import verify_basic_bundle


def _load_json(path: str) -> object:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(prog="decision_passport")
    sub = parser.add_subparsers(dest="command", required=True)

    verify = sub.add_parser("verify", help="Verify a bundle")
    verify.add_argument("bundle", help="Path to bundle JSON")

    diff = sub.add_parser("diff", help="Diff two bundles")
    diff.add_argument("bundle_a", help="Path to first bundle JSON")
    diff.add_argument("bundle_b", help="Path to second bundle JSON")

    args = parser.parse_args()

    if args.command == "verify":
        result = verify_basic_bundle(_load_json(args.bundle))
        print(json.dumps(result, indent=2))
        return 0 if result["status"] == "PASS" else 1

    result = diff_bundles(_load_json(args.bundle_a), _load_json(args.bundle_b))
    print(json.dumps(result, indent=2))
    return 0 if result["identical"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
