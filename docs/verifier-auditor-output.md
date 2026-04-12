# Verifier Auditor Output Contract

offline-verifiable authorization and execution receipts for AI and high-consequence software actions

## Stable contract fields

Each verifier result exposes the following auditor-grade fields:

- verdict
- code
- location
- reason
- remediation_hint

These fields are deterministic and machine-readable in both TypeScript and Python verifier implementations.

## Verdict enum

- VALID
- INVALID

## Code taxonomy

- SUCCESS_VALID
- SCHEMA_MISSING_FIELD
- SCHEMA_INVALID_FIELD
- VERSION_UNSUPPORTED
- PROFILE_UNSUPPORTED
- HASH_MISMATCH
- CHAIN_BROKEN
- ORDER_INVALID
- AUTHORIZATION_EXECUTION_MISMATCH
- SEMANTIC_INCONSISTENCY
- BUNDLE_MALFORMED

## Location format

Locations use stable JSON-path-like pointers, for example:

- $.bundle
- $.bundle_version
- $.manifest.chain_hash
- $.passport_records[1].payload_hash
- $.passport_records[*].action_type

## Determinism rules

- Equivalent failure conditions must emit equivalent `code` and `location` in TypeScript and Python.
- Unsupported profile/version handling is fail-closed.
- Missing field and invalid field failures are not conflated.
- Success results use the same contract with `verdict=VALID` and `code=SUCCESS_VALID`.
