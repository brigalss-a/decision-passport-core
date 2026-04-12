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
