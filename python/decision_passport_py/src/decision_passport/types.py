from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict

ActorType = Literal["human", "ai_agent", "system", "policy"]
ActionType = Literal[
    "AI_RECOMMENDATION",
    "HUMAN_APPROVAL_GRANTED",
    "HUMAN_APPROVAL_REJECTED",
    "POLICY_APPROVAL_GRANTED",
    "EXECUTION_PENDING",
    "EXECUTION_SUCCEEDED",
    "EXECUTION_FAILED",
    "EXECUTION_ABORTED",
    "HUMAN_OVERRIDE",
    "POLICY_EXCEPTION",
]


class PassportRecord(TypedDict):
    id: str
    chain_id: str
    sequence: int
    timestamp_utc: str
    actor_id: str
    actor_type: ActorType
    action_type: ActionType
    payload: dict[str, Any]
    payload_hash: str
    prev_hash: str
    record_hash: str
    metadata: NotRequired[dict[str, Any]]


class ChainManifest(TypedDict):
    chain_id: str
    record_count: int
    first_record_id: str
    last_record_id: str
    chain_hash: str


class BasicProofBundle(TypedDict):
    bundle_version: str
    exported_at_utc: str
    passport_records: list[PassportRecord]
    manifest: ChainManifest


class TamperFinding(TypedDict):
    recordIndex: int
    recordId: str
    kind: Literal["payload_hash", "record_hash", "prev_hash", "sequence", "manifest_chain_hash"]
    expected: str
    actual: str
    message: str


class TamperExplanation(TypedDict):
    tampered: bool
    findings: list[TamperFinding]
    summary: str


BasicVerifierStatus = Literal["PASS", "FAIL"]
BasicVerificationReasonCode = Literal[
    "UNSUPPORTED_BUNDLE_VERSION",
    "CHAIN_INTEGRITY_FAILED",
    "MANIFEST_HASH_MISMATCH",
    "PAYLOAD_HASH_MISMATCH",
    "PREV_HASH_MISMATCH",
    "SEQUENCE_MISMATCH",
    "MALFORMED_BUNDLE",
    "EMPTY_OR_MISSING_RECORDS",
    "UNKNOWN_VERIFICATION_ERROR",
]


class BasicVerificationCheck(TypedDict):
    name: str
    passed: bool
    message: NotRequired[str]


class BasicVerifierResult(TypedDict):
    status: BasicVerifierStatus
    summary: str
    checks: list[BasicVerificationCheck]
    reasonCodes: list[BasicVerificationReasonCode]
    tamperFindings: NotRequired[list[TamperFinding]]
    nextSteps: NotRequired[list[str]]
