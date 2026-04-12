from __future__ import annotations

import json
from pathlib import Path
import unittest

from decision_passport import load_fixture, verify_basic_bundle


class FixtureConformanceTests(unittest.TestCase):
    def test_manifest_contract_matches_all_fixtures(self) -> None:
        repo_root = Path(__file__).resolve().parents[3]
        manifest_path = repo_root / "fixtures" / "conformance-manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

        for entry in manifest["fixtures"]:
            fixture_name = entry["fixture"].replace(".json", "")
            bundle = load_fixture(fixture_name)
            result = verify_basic_bundle(bundle)

            self.assertEqual(result["status"], entry["expected_status"], fixture_name)
            self.assertEqual(result["verdict"], entry["expected_verdict"], fixture_name)
            self.assertEqual(result["code"], entry["expected_code"], fixture_name)
            self.assertEqual(result["location"], entry["expected_location"], fixture_name)
            self.assertGreater(len(result["auditor_findings"]), 0, fixture_name)


if __name__ == "__main__":
    unittest.main()
