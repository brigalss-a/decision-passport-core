from __future__ import annotations

import unittest

from decision_passport import load_fixture, verify_basic_bundle


class FixtureConformanceTests(unittest.TestCase):
    def test_valid_bundle_passes(self) -> None:
        bundle = load_fixture("valid-bundle")
        result = verify_basic_bundle(bundle)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["reasonCodes"], [])

    def test_tampered_bundle_fails_with_payload_reason(self) -> None:
        bundle = load_fixture("tampered-bundle")
        result = verify_basic_bundle(bundle)
        self.assertEqual(result["status"], "FAIL")
        self.assertIn("CHAIN_INTEGRITY_FAILED", result["reasonCodes"])
        self.assertIn("PAYLOAD_HASH_MISMATCH", result["reasonCodes"])

    def test_broken_prev_hash_fails(self) -> None:
        bundle = load_fixture("broken-prev-hash")
        result = verify_basic_bundle(bundle)
        self.assertEqual(result["status"], "FAIL")
        self.assertIn("PREV_HASH_MISMATCH", result["reasonCodes"])

    def test_wrong_sequence_fails(self) -> None:
        bundle = load_fixture("wrong-sequence")
        result = verify_basic_bundle(bundle)
        self.assertEqual(result["status"], "FAIL")
        self.assertIn("SEQUENCE_MISMATCH", result["reasonCodes"])

    def test_wrong_chain_hash_fails(self) -> None:
        bundle = load_fixture("wrong-chain-hash")
        result = verify_basic_bundle(bundle)
        self.assertEqual(result["status"], "FAIL")
        self.assertIn("MANIFEST_HASH_MISMATCH", result["reasonCodes"])

    def test_malformed_structure_fails(self) -> None:
        bundle = load_fixture("malformed-structure")
        result = verify_basic_bundle(bundle)
        self.assertEqual(result["status"], "FAIL")
        self.assertIn("MALFORMED_BUNDLE", result["reasonCodes"])

    def test_unsupported_version_fails(self) -> None:
        bundle = load_fixture("unsupported-version")
        result = verify_basic_bundle(bundle)
        self.assertEqual(result["status"], "FAIL")
        self.assertIn("UNSUPPORTED_BUNDLE_VERSION", result["reasonCodes"])

    def test_optional_metadata_fixture_passes(self) -> None:
        bundle = load_fixture("compatible-optional-metadata")
        result = verify_basic_bundle(bundle)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["reasonCodes"], [])


if __name__ == "__main__":
    unittest.main()
