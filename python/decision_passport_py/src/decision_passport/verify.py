from __future__ import annotations

import argparse
import json
from pathlib import Path

from .chain import verify_chain
from .explain_tamper import explain_tamper_chain
from .types import (
    AuditorFinding,
    BasicProofBundle,
    BasicVerificationCheck,
    BasicVerificationReasonCode,
    BasicVerifierResult,
    VerifierCode,
)


def verify_basic_bundle(bundle: object) -> BasicVerifierResult:
    schema_finding = _validate_bundle_shape(bundle)
    if schema_finding is not None:
        return _fail_with(
            checks=[{"name": "bundle_structure", "passed": False, "message": schema_finding["reason"]}],
            findings=[schema_finding],
            reason_codes=_map_legacy_reason_codes([schema_finding]),
            summary=f"Verification failed because {schema_finding['reason']}.",
            next_steps=[schema_finding["remediation_hint"]],
        )

    typed_bundle = bundle
    if typed_bundle["bundle_version"] != "1.4-basic":
        is_profile_unsupported = str(typed_bundle["bundle_version"]).startswith("1.4-")
        finding = _build_finding(
            "PROFILE_UNSUPPORTED" if is_profile_unsupported else "VERSION_UNSUPPORTED",
            "$.bundle_version",
            (
                f"Bundle profile {typed_bundle['bundle_version']} is not supported by verify_basic_bundle."
                if is_profile_unsupported
                else f"Bundle version {typed_bundle['bundle_version']} is not supported by verify_basic_bundle."
            ),
            (
                "Use the verifier that matches the requested 1.4 profile."
                if is_profile_unsupported
                else "Use bundle_version 1.4-basic for this verifier."
            ),
            "version",
        )
        return _fail_with(
            checks=[
                {
                    "name": "bundle_version",
                    "passed": False,
                    "message": finding["reason"],
                }
            ],
            findings=[finding],
            reason_codes=_map_legacy_reason_codes([finding]),
            summary=f"Verification failed because {finding['reason']}.",
            next_steps=[finding["remediation_hint"]],
        )

    records = typed_bundle["passport_records"]
    manifest = typed_bundle["manifest"]

    if len(records) == 0:
        finding = _build_finding(
            "SCHEMA_INVALID_FIELD",
            "$.passport_records",
            "Field passport_records must contain at least one record.",
            "Re-export bundle with at least one material action record.",
            "schema",
        )
        return _fail_with(
            checks=[{"name": "records_present", "passed": False, "message": finding["reason"]}],
            findings=[finding],
            reason_codes=_map_legacy_reason_codes([finding]),
            summary=f"Verification failed because {finding['reason']}.",
            next_steps=[finding["remediation_hint"]],
        )

    checks: list[BasicVerificationCheck] = []
    findings: list[AuditorFinding] = []

    chain_result = verify_chain(records)
    checks.append(
        {
            "name": "chain_integrity",
            "passed": bool(chain_result["valid"]),
            "message": chain_result.get("error"),
        }
    )
    if not bool(chain_result["valid"]):
        # Detailed integrity findings are mapped deterministically from explain_tamper_chain.
        pass

    manifest_match = manifest["chain_hash"] == records[-1]["record_hash"]
    checks.append(
        {
            "name": "manifest_chain_hash",
            "passed": manifest_match,
            "message": None if manifest_match else "Manifest chain_hash mismatch",
        }
    )
    if not manifest_match:
        findings.append(
            _build_finding(
                "HASH_MISMATCH",
                "$.manifest.chain_hash",
                "Manifest chain_hash does not match the terminal record_hash.",
                "Recompute manifest from immutable records and re-export bundle.",
                "integrity",
            )
        )

    semantic_findings = _semantic_checks(records)
    findings.extend(semantic_findings)

    if all(check["passed"] for check in checks) and len(semantic_findings) == 0:
        success_finding = _build_finding(
            "SUCCESS_VALID",
            "$.bundle",
            "Bundle passed schema, integrity, ordering, and semantic checks.",
            "Preserve original bundle bytes and checksums for future review.",
            "success",
            "VALID",
        )
        return {
            "status": "PASS",
            "summary": "Verification passed. Bundle integrity checks succeeded.",
            "verdict": success_finding["verdict"],
            "code": success_finding["code"],
            "location": success_finding["location"],
            "reason": success_finding["reason"],
            "remediation_hint": success_finding["remediation_hint"],
            "failure_class": success_finding["failure_class"],
            "auditor_findings": [success_finding],
            "checks": checks,
            "reasonCodes": [],
            "nextSteps": ["Preserve original bundle bytes and checksums for future review."],
        }

    explanation = explain_tamper_chain(records, manifest)
    findings.extend(_map_tamper_findings(explanation["findings"]))
    unique_findings = _dedupe_findings(findings)
    reason_code_list = _map_legacy_reason_codes(unique_findings)

    if len(unique_findings) == 0:
        unique_findings.append(
            _build_finding(
                "BUNDLE_MALFORMED",
                "$.bundle",
                "Verifier could not classify the bundle failure condition.",
                "Validate bundle structure and compare against a known-good fixture.",
                "schema",
            )
        )

    primary_finding = unique_findings[0]
    return _fail_with(
        checks=checks,
        findings=unique_findings,
        reason_codes=reason_code_list,
        summary=_build_fail_summary(unique_findings),
        tamper_findings=explanation["findings"],
        next_steps=_build_next_steps(unique_findings),
        primary_finding=primary_finding,
    )


def _fail_with(
    checks: list[BasicVerificationCheck],
    findings: list[AuditorFinding],
    reason_codes: list[BasicVerificationReasonCode],
    summary: str,
    tamper_findings: list[dict] | None = None,
    next_steps: list[str] | None = None,
    primary_finding: AuditorFinding | None = None,
) -> BasicVerifierResult:
    resolved_primary = primary_finding or (findings[0] if len(findings) > 0 else _build_finding(
        "BUNDLE_MALFORMED",
        "$.bundle",
        "Verifier failed without a classified finding.",
        "Validate bundle shape and run verification again.",
        "schema",
    ))

    result: BasicVerifierResult = {
        "status": "FAIL",
        "summary": summary,
        "verdict": resolved_primary["verdict"],
        "code": resolved_primary["code"],
        "location": resolved_primary["location"],
        "reason": resolved_primary["reason"],
        "remediation_hint": resolved_primary["remediation_hint"],
        "failure_class": resolved_primary["failure_class"],
        "auditor_findings": findings,
        "checks": checks,
        "reasonCodes": reason_codes,
    }
    if tamper_findings is not None:
        result["tamperFindings"] = tamper_findings
    if next_steps is not None:
        result["nextSteps"] = next_steps
    return result


def _validate_bundle_shape(bundle: object) -> AuditorFinding | None:
    if not isinstance(bundle, dict):
        return _build_finding(
            "BUNDLE_MALFORMED",
            "$",
            "Bundle must be a JSON object.",
            "Provide a JSON object with bundle_version, exported_at_utc, passport_records, and manifest.",
            "schema",
        )

    if "bundle_version" not in bundle:
        return _build_finding(
            "SCHEMA_MISSING_FIELD",
            "$.bundle_version",
            "Required field bundle_version is missing.",
            "Add bundle_version and set it to 1.4-basic for this verifier.",
            "schema",
        )

    if "exported_at_utc" not in bundle:
        return _build_finding(
            "SCHEMA_MISSING_FIELD",
            "$.exported_at_utc",
            "Required field exported_at_utc is missing.",
            "Add exported_at_utc in ISO-8601 string format.",
            "schema",
        )

    if "passport_records" not in bundle:
        return _build_finding(
            "SCHEMA_MISSING_FIELD",
            "$.passport_records",
            "Required field passport_records is missing.",
            "Add passport_records as a non-empty array of records.",
            "schema",
        )

    if "manifest" not in bundle:
        return _build_finding(
            "SCHEMA_MISSING_FIELD",
            "$.manifest",
            "Required field manifest is missing.",
            "Add manifest with chain_id, record_count, first_record_id, last_record_id, and chain_hash.",
            "schema",
        )

    if not isinstance(bundle.get("bundle_version"), str):
        return _build_finding(
            "SCHEMA_INVALID_FIELD",
            "$.bundle_version",
            "Field bundle_version must be a string.",
            "Set bundle_version to a supported string value, such as 1.4-basic.",
            "schema",
        )

    if not isinstance(bundle.get("exported_at_utc"), str):
        return _build_finding(
            "SCHEMA_INVALID_FIELD",
            "$.exported_at_utc",
            "Field exported_at_utc must be a string.",
            "Set exported_at_utc to an ISO-8601 UTC timestamp string.",
            "schema",
        )

    if not isinstance(bundle.get("passport_records"), list):
        return _build_finding(
            "SCHEMA_INVALID_FIELD",
            "$.passport_records",
            "Field passport_records must be an array.",
            "Set passport_records to an array of passport record objects.",
            "schema",
        )

    if not isinstance(bundle.get("manifest"), dict):
        return _build_finding(
            "SCHEMA_INVALID_FIELD",
            "$.manifest",
            "Field manifest must be an object.",
            "Set manifest to an object containing chain metadata fields.",
            "schema",
        )

    manifest = bundle.get("manifest")
    if "chain_hash" not in manifest:
        return _build_finding(
            "SCHEMA_MISSING_FIELD",
            "$.manifest.chain_hash",
            "Required field manifest.chain_hash is missing.",
            "Add manifest.chain_hash with the terminal record_hash value.",
            "schema",
        )

    if not isinstance(manifest.get("chain_hash"), str):
        return _build_finding(
            "SCHEMA_INVALID_FIELD",
            "$.manifest.chain_hash",
            "Field manifest.chain_hash must be a string.",
            "Set manifest.chain_hash to a SHA-256 hex string.",
            "schema",
        )

    return None


def _map_tamper_findings(findings: list[dict]) -> list[AuditorFinding]:
    mapped: list[AuditorFinding] = []
    for finding in findings:
        kind = finding.get("kind")
        record_index = int(finding.get("recordIndex", -1))

        if kind == "payload_hash" or kind == "record_hash":
            mapped.append(
                _build_finding(
                    "HASH_MISMATCH",
                    f"$.passport_records[{record_index}].payload_hash",
                    "Record payload hash does not match deterministic recomputation.",
                    "Rebuild payload and recompute payload_hash and record_hash from canonical record bytes.",
                    "integrity",
                )
            )
        elif kind == "prev_hash":
            mapped.append(
                _build_finding(
                    "CHAIN_BROKEN",
                    f"$.passport_records[{record_index}].prev_hash",
                    "Record prev_hash does not match the previous record_hash.",
                    "Repair record ordering and prev_hash linkage, then regenerate downstream records.",
                    "integrity",
                )
            )
        elif kind == "sequence":
            mapped.append(
                _build_finding(
                    "ORDER_INVALID",
                    f"$.passport_records[{record_index}].sequence",
                    "Record sequence is not strictly gapless from 0..N-1.",
                    "Re-index sequence values and regenerate dependent record hashes.",
                    "order",
                )
            )
        elif kind == "manifest_chain_hash":
            mapped.append(
                _build_finding(
                    "HASH_MISMATCH",
                    "$.manifest.chain_hash",
                    "Manifest chain_hash does not match the final record_hash.",
                    "Regenerate manifest from the finalized record chain.",
                    "integrity",
                )
            )
    return mapped


def _build_fail_summary(findings: list[AuditorFinding]) -> str:
    parts: list[str] = []
    for finding in findings:
        parts.append(f"{finding['code']} at {finding['location']}")

    if len(parts) == 0:
        return "Verification failed due to an unknown integrity or structure error."

    return f"Verification failed because {'; '.join(parts)}."


def _build_next_steps(findings: list[AuditorFinding]) -> list[str]:
    steps: list[str] = []
    for finding in findings:
        if finding["remediation_hint"] not in steps:
            steps.append(finding["remediation_hint"])

    steps.append("Compare with a known-good bundle artifact if available.")
    return steps


def _dedupe_findings(findings: list[AuditorFinding]) -> list[AuditorFinding]:
    deduped: dict[tuple[str, str], AuditorFinding] = {}
    for finding in findings:
        deduped[(finding["code"], finding["location"])] = finding

    priority = {
        "SUCCESS_VALID": 0,
        "BUNDLE_MALFORMED": 1,
        "SCHEMA_MISSING_FIELD": 2,
        "SCHEMA_INVALID_FIELD": 3,
        "VERSION_UNSUPPORTED": 4,
        "PROFILE_UNSUPPORTED": 5,
        "ORDER_INVALID": 6,
        "CHAIN_BROKEN": 7,
        "HASH_MISMATCH": 8,
        "AUTHORIZATION_EXECUTION_MISMATCH": 9,
        "SEMANTIC_INCONSISTENCY": 10,
    }

    return sorted(deduped.values(), key=lambda x: (priority[x["code"]], x["location"]))


def _map_legacy_reason_codes(findings: list[AuditorFinding]) -> list[BasicVerificationReasonCode]:
    codes: set[BasicVerificationReasonCode] = set()

    for finding in findings:
        code = finding["code"]
        location = finding["location"]

        if code in {"VERSION_UNSUPPORTED", "PROFILE_UNSUPPORTED"}:
            codes.add("UNSUPPORTED_BUNDLE_VERSION")
        elif code == "BUNDLE_MALFORMED":
            codes.add("MALFORMED_BUNDLE")
        elif code in {"SCHEMA_MISSING_FIELD", "SCHEMA_INVALID_FIELD"}:
            if location == "$.passport_records":
                codes.add("EMPTY_OR_MISSING_RECORDS")
            else:
                codes.add("MALFORMED_BUNDLE")
        elif code == "CHAIN_BROKEN":
            codes.add("CHAIN_INTEGRITY_FAILED")
            codes.add("PREV_HASH_MISMATCH")
        elif code == "ORDER_INVALID":
            codes.add("CHAIN_INTEGRITY_FAILED")
            codes.add("SEQUENCE_MISMATCH")
        elif code == "HASH_MISMATCH":
            if location == "$.manifest.chain_hash":
                codes.add("MANIFEST_HASH_MISMATCH")
            else:
                codes.add("CHAIN_INTEGRITY_FAILED")
                codes.add("PAYLOAD_HASH_MISMATCH")
        elif code in {"AUTHORIZATION_EXECUTION_MISMATCH", "SEMANTIC_INCONSISTENCY"}:
            codes.add("UNKNOWN_VERIFICATION_ERROR")

    if len(codes) == 0:
        codes.add("UNKNOWN_VERIFICATION_ERROR")

    return sorted(codes)


def _semantic_checks(records: list[dict]) -> list[AuditorFinding]:
    findings: list[AuditorFinding] = []

    approval_actions = {"HUMAN_APPROVAL_GRANTED", "POLICY_APPROVAL_GRANTED"}
    execution_actions = {
        "EXECUTION_PENDING",
        "EXECUTION_SUCCEEDED",
        "EXECUTION_FAILED",
        "EXECUTION_ABORTED",
    }

    seen_approval = False
    for index, record in enumerate(records):
        action = str(record.get("action_type"))
        if action in approval_actions:
            seen_approval = True

        if action in execution_actions and not seen_approval:
            findings.append(
                _build_finding(
                    "AUTHORIZATION_EXECUTION_MISMATCH",
                    f"$.passport_records[{index}].action_type",
                    "Execution action appears before any authorization grant action.",
                    "Insert a HUMAN_APPROVAL_GRANTED or POLICY_APPROVAL_GRANTED action before execution.",
                    "authorization",
                )
            )
            break

    actions = {str(r.get("action_type")) for r in records}
    if "HUMAN_APPROVAL_GRANTED" in actions and "HUMAN_APPROVAL_REJECTED" in actions:
        findings.append(
            _build_finding(
                "SEMANTIC_INCONSISTENCY",
                "$.passport_records[*].action_type",
                "Chain contains both HUMAN_APPROVAL_GRANTED and HUMAN_APPROVAL_REJECTED actions.",
                "Split contradictory approval outcomes into separate chains or preserve only one terminal approval decision.",
                "semantic",
            )
        )

    if "EXECUTION_SUCCEEDED" in actions and "EXECUTION_FAILED" in actions:
        findings.append(
            _build_finding(
                "SEMANTIC_INCONSISTENCY",
                "$.passport_records[*].action_type",
                "Chain contains both EXECUTION_SUCCEEDED and EXECUTION_FAILED actions.",
                "Split conflicting execution outcomes into separate chains or keep one terminal execution outcome.",
                "semantic",
            )
        )

    return findings


def _build_finding(
    code: VerifierCode,
    location: str,
    reason: str,
    remediation_hint: str,
    failure_class: AuditorFinding["failure_class"],
    verdict: AuditorFinding["verdict"] = "INVALID",
) -> AuditorFinding:
    return {
        "verdict": verdict,
        "code": code,
        "location": location,
        "reason": reason,
        "remediation_hint": remediation_hint,
        "failure_class": failure_class,
    }


def validate_bundle_schema(bundle: object) -> tuple[bool, AuditorFinding | None]:
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
