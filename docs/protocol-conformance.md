# Protocol Conformance

offline-verifiable authorization and execution receipts for AI and high-consequence software actions

This document defines the normative conformance checks for Decision Passport Core release-track bundles.

## Normative checks for 1.4-basic

A verifier for 1.4-basic MUST check:

1. Bundle shape: object with bundle_version, exported_at_utc, passport_records, manifest, and manifest.chain_hash.
2. bundle_version equals 1.4-basic.
3. passport_records is non-empty.
4. Record sequence is 0..N-1 with no gaps.
5. prev_hash of record i equals record_hash of i-1, and record 0 uses GENESIS hash.
6. record_hash equals SHA-256(canonical_json(record_without_record_hash)).
7. manifest.chain_hash equals record_hash of the final record.

## Informative checks

Implementations MAY provide:

- Human-readable tamper explanations.
- Structured diff reports between two bundles.
- HTML verification reports.

These features improve diagnostics but are not required for baseline conformance.

## Auditor output contract

Verifier outputs expose deterministic auditor fields:

- verdict
- code
- location
- reason
- remediation_hint

The canonical taxonomy and field rules are defined in `docs/verifier-auditor-output.md`.

## Fixture-driven conformance

The fixture suite in fixtures/ is canonical conformance input for this repo.
The machine-readable verdict contract is defined in fixtures/conformance-manifest.json.

Expected baseline outcomes:

- valid-bundle.json: PASS
- tampered-bundle.json: FAIL
- broken-prev-hash.json: FAIL
- wrong-sequence.json: FAIL
- wrong-chain-hash.json: FAIL
- malformed-bundle.json: FAIL
- unsupported-version.json: FAIL
- compatible-optional-metadata.json: PASS

## Scope boundary

Conformance in this document verifies integrity and format consistency only.

It does not prove:

- Runtime policy enforcement.
- Actor identity authenticity.
- Replay resistance.
- Signed provenance.

v0.7.0 conformance truth:

1. implemented conformance: bundle integrity, DecisionTrail linkage semantics, RuntimeClaim semantic checks, OutcomeBinding linkage semantics
2. partially implemented: DecisionGuard runtime semantics are modeled and verifier-visible without shipping a hosted executor
3. spec-only/future: runtime enforcement infrastructure, expanded signing profiles, and richer execution graph telemetry

## DecisionTrail minimal conformance (v0.7.0)

DecisionTrail is a separate structured artifact that links to, but does not replace, Decision Passport.

A DecisionTrail artifact MUST include:

1. trail_version
2. trail_id
3. initiating_request
4. context_references
5. alternatives_considered
6. rejected_options
7. escalation_events
8. approval_checkpoint
9. final_approved_payload
10. linked_passport_id

DecisionTrail conformance does not imply action authorization. Authorization proof remains in Decision Passport verification semantics.

## RuntimeClaim and Guard conformance semantics (v0.7.0)

When `runtime_claim` is present in a bundle surface, implementations SHOULD validate the RuntimeClaim schema and apply fail-closed guard semantics.

Minimal RuntimeClaim fields:

1. claim_id
2. passport_id
3. nonce
4. issued_at_utc
5. expires_at_utc
6. payload_hash
7. authority_ref
8. claim_status
9. single_use
10. guard_version

Required fail-closed deny taxonomy:

1. AUTHORITY_MISSING
2. CLAIM_EXPIRED
3. CLAIM_REVOKED
4. NONCE_REUSED
5. PAYLOAD_HASH_MISMATCH
6. PASSPORT_NOT_AUTHORIZED
7. CLAIM_MALFORMED

## OutcomeBinding minimal conformance semantics (v0.7.0)

When `outcome_binding` is present in a bundle surface, implementations SHOULD validate the OutcomeBinding schema and preserve the finite status model.

Minimal OutcomeBinding fields:

1. outcome_status
2. executor_id
3. executed_at_utc
4. reason_code
5. linked_runtime_claim_id

Optional fields:

1. output_reference_hashes
2. outcome_hash

Required finite status set:

1. SUCCESS
2. DENIED
3. FAILED
4. ABORTED
5. PENDING
6. EXPIRED

OutcomeBinding conformance does not imply a full runtime executor implementation. It defines a compact execution-result surface only.
