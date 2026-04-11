from __future__ import annotations

import unittest

from decision_passport import (
    create_manifest,
    create_record,
    diff_bundles,
    explain_tamper,
    load_fixture,
    validate_bundle_schema,
    verify_basic_bundle,
)


class PythonCoreSurfaceTests(unittest.TestCase):
    def test_create_record_and_manifest(self) -> None:
        r0 = create_record(
            chain_id="py-ref-chain",
            last_record=None,
            actor_id="agent-1",
            actor_type="ai_agent",
            action_type="AI_RECOMMENDATION",
            payload={"decision": "approve", "confidence": 0.92},
            record_id="record-0",
            timestamp_utc="2026-01-01T00:00:00.000Z",
        )
        r1 = create_record(
            chain_id="py-ref-chain",
            last_record=r0,
            actor_id="human-1",
            actor_type="human",
            action_type="HUMAN_APPROVAL_GRANTED",
            payload={"approved": True},
            record_id="record-1",
            timestamp_utc="2026-01-01T00:00:01.000Z",
        )

        manifest = create_manifest([r0, r1])
        self.assertEqual(manifest["record_count"], 2)
        self.assertEqual(manifest["chain_hash"], r1["record_hash"])

    def test_diff_and_explain(self) -> None:
        valid = load_fixture("valid-bundle")
        tampered = load_fixture("tampered-bundle")

        diff = diff_bundles(valid, tampered)
        self.assertFalse(diff["identical"])
        self.assertGreater(len(diff["findings"]), 0)

        explanation = explain_tamper(tampered["passport_records"], tampered["manifest"])
        self.assertTrue(explanation["tampered"])

    def test_schema_helper_and_verify(self) -> None:
        valid = load_fixture("valid-bundle")
        ok, error = validate_bundle_schema(valid)
        self.assertTrue(ok)
        self.assertIsNone(error)

        result = verify_basic_bundle(valid)
        self.assertEqual(result["status"], "PASS")


if __name__ == "__main__":
    unittest.main()
