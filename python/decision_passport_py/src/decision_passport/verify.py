from __future__ import annotations

import argparse
import json
from pathlib import Path

from .chain import verify_chain
from .explain_tamper import explain_tamper_chain
from .types import (
    BasicProofBundle,
    BasicVerificationCheck,
    BasicVerificationReasonCode,
    BasicVerifierResult,
)


def verify_basic_bundle(bundle: object) -> BasicVerifierResult:
    malformed = _validate_bundle_shape(bundle)
    if malformed is not None:
        return _fail_with(
            checks=[{"name": "bundle_structure", "passed": False, "message": malformed}],
            reason_codes=["MALFORMED_BUNDLE"],
            summary="Verification failed because bundle structure is malformed.",
            next_steps=[
                "Validate JSON parsing and required top-level fields.",
                "Ensure bundle_version, passport_records, and manifest are present.",
            ],
        )

    typed_bundle = bundle
    if typed_bundle["bundle_version"] != "1.4-basic":
        return _fail_with(
            checks=[
                {
                    "name": "bundle_version",
                    "passed": False,
                    "message": f"Unsupported bundle_version: {typed_bundle['bundle_version']}",
                }
            ],
            reason_codes=["UNSUPPORTED_BUNDLE_VERSION"],
            summary="Verification failed because bundle_version is not supported by verify_basic_bundle.",
            next_steps=[
                "Use bundle_version \"1.4-basic\" for verify_basic_bundle.",
                "Use a version-specific verifier for other bundle formats.",
            ],
        )

    records = typed_bundle["passport_records"]
    manifest = typed_bundle["manifest"]

    if len(records) == 0:
        return _fail_with(
            checks=[{"name": "records_present", "passed": False, "message": "Bundle has no records."}],
            reason_codes=["EMPTY_OR_MISSING_RECORDS"],
            summary="Verification failed because bundle has no records.",
            next_steps=[
                "Confirm export step included at least one material action record.",
                "Re-export bundle and re-run verification.",
            ],
        )

    checks: list[BasicVerificationCheck] = []
    reason_codes: set[BasicVerificationReasonCode] = set()

    chain_result = verify_chain(records)
    checks.append(
        {
            "name": "chain_integrity",
            "passed": bool(chain_result["valid"]),
            "message": chain_result.get("error"),
        }
    )
    if not bool(chain_result["valid"]):
        reason_codes.add("CHAIN_INTEGRITY_FAILED")

    manifest_match = manifest["chain_hash"] == records[-1]["record_hash"]
    checks.append(
        {
            "name": "manifest_chain_hash",
            "passed": manifest_match,
            "message": None if manifest_match else "Manifest chain_hash mismatch",
        }
    )
    if not manifest_match:
        reason_codes.add("MANIFEST_HASH_MISMATCH")

    if all(check["passed"] for check in checks):
        return {
            "status": "PASS",
            "summary": "Verification passed. Bundle integrity checks succeeded.",
            "checks": checks,
            "reasonCodes": [],
            "nextSteps": ["Preserve original bundle bytes and checksums for future review."],
        }

    explanation = explain_tamper_chain(records, manifest)
    for code in _map_finding_codes(explanation["findings"]):
        reason_codes.add(code)

    if len(reason_codes) == 0:
        reason_codes.add("UNKNOWN_VERIFICATION_ERROR")

    reason_code_list = sorted(reason_codes)
    return _fail_with(
        checks=checks,
        reason_codes=reason_code_list,
        summary=_build_fail_summary(reason_code_list),
        tamper_findings=explanation["findings"],
        next_steps=_build_next_steps(reason_code_list),
    )


def _fail_with(
    checks: list[BasicVerificationCheck],
    reason_codes: list[BasicVerificationReasonCode],
    summary: str,
    tamper_findings: list[dict] | None = None,
    next_steps: list[str] | None = None,
) -> BasicVerifierResult:
    result: BasicVerifierResult = {
        "status": "FAIL",
        "summary": summary,
        "checks": checks,
        "reasonCodes": reason_codes,
    }
    if tamper_findings is not None:
        result["tamperFindings"] = tamper_findings
    if next_steps is not None:
        result["nextSteps"] = next_steps
    return result


def _validate_bundle_shape(bundle: object) -> str | None:
    if not isinstance(bundle, dict):
        return "Bundle must be an object."

    if not isinstance(bundle.get("passport_records"), list):
        return "Field passport_records must be an array."

    if not isinstance(bundle.get("manifest"), dict):
        return "Field manifest must be an object."

    if not isinstance(bundle.get("bundle_version"), str):
        return "Field bundle_version must be a string."

    if not isinstance(bundle.get("exported_at_utc"), str):
        return "Field exported_at_utc must be a string."

    manifest = bundle.get("manifest")
    if not isinstance(manifest.get("chain_hash"), str):
        return "Field manifest.chain_hash must be a string."

    return None


def _map_finding_codes(findings: list[dict]) -> list[BasicVerificationReasonCode]:
    codes: set[BasicVerificationReasonCode] = set()
    for finding in findings:
        kind = finding.get("kind")
        if kind == "payload_hash":
            codes.add("PAYLOAD_HASH_MISMATCH")
        elif kind == "prev_hash":
            codes.add("PREV_HASH_MISMATCH")
        elif kind == "sequence":
            codes.add("SEQUENCE_MISMATCH")
        elif kind == "manifest_chain_hash":
            codes.add("MANIFEST_HASH_MISMATCH")
    return sorted(codes)


def _build_fail_summary(reason_codes: list[BasicVerificationReasonCode]) -> str:
    parts: list[str] = []
    if "UNSUPPORTED_BUNDLE_VERSION" in reason_codes:
        parts.append("bundle version is unsupported by this verifier")
    if "MALFORMED_BUNDLE" in reason_codes:
        parts.append("bundle structure is malformed")
    if "EMPTY_OR_MISSING_RECORDS" in reason_codes:
        parts.append("bundle has no records")
    if "CHAIN_INTEGRITY_FAILED" in reason_codes:
        parts.append("record hash chain integrity failed")
    if "MANIFEST_HASH_MISMATCH" in reason_codes:
        parts.append("manifest chain hash does not match terminal record")
    if "PAYLOAD_HASH_MISMATCH" in reason_codes:
        parts.append("payload hash mismatch detected")
    if "PREV_HASH_MISMATCH" in reason_codes:
        parts.append("prev_hash linkage mismatch detected")
    if "SEQUENCE_MISMATCH" in reason_codes:
        parts.append("record sequence mismatch detected")

    if len(parts) == 0:
        return "Verification failed due to an unknown integrity or structure error."

    return f"Verification failed because {'; '.join(parts)}."


def _build_next_steps(reason_codes: list[BasicVerificationReasonCode]) -> list[str]:
    steps: list[str] = []

    if "UNSUPPORTED_BUNDLE_VERSION" in reason_codes:
        steps.append("Use the verifier that matches your bundle_version.")

    if "MALFORMED_BUNDLE" in reason_codes:
        steps.append("Validate required top-level fields and JSON shape before verification.")
    if "EMPTY_OR_MISSING_RECORDS" in reason_codes:
        steps.append("Confirm export pipeline included material action records.")
    if "CHAIN_INTEGRITY_FAILED" in reason_codes:
        steps.append("Inspect chain_integrity check details and failing record index.")
    if "PREV_HASH_MISMATCH" in reason_codes or "SEQUENCE_MISMATCH" in reason_codes:
        steps.append("Inspect record ordering and prev_hash linkage across adjacent records.")
    if "PAYLOAD_HASH_MISMATCH" in reason_codes:
        steps.append("Inspect payload mutation after record creation.")
    if "MANIFEST_HASH_MISMATCH" in reason_codes:
        steps.append("Confirm manifest chain_hash matches final record_hash.")

    steps.append("Compare with a known-good bundle artifact if available.")
    return steps


def validate_bundle_schema(bundle: object) -> tuple[bool, str | None]:
    error = _validate_bundle_shape(bundle)
    return (error is None, error)


def _load_json(path: str) -> object:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify a Decision Passport bundle (1.4-basic)")
    parser.add_argument("bundle", help="Path to bundle JSON")
    args = parser.parse_args()

    result = verify_basic_bundle(_load_json(args.bundle))
    print(json.dumps(result, indent=2))
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
