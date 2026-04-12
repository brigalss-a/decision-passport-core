# Fixture Conformance Suite

This directory contains canonical protocol fixtures for offline, deterministic verification.

Machine-readable expected outcomes are defined in `conformance-manifest.json`.

## Fixture Inventory

| Fixture | Expected result | Primary auditor code |
| --- | --- | --- |
| valid-bundle.json | PASS | SUCCESS_VALID |
| compatible-optional-metadata.json | PASS | SUCCESS_VALID |
| tampered-bundle.json | FAIL | HASH_MISMATCH |
| broken-prev-hash.json | FAIL | CHAIN_BROKEN |
| wrong-chain-hash.json | FAIL | HASH_MISMATCH |
| missing-manifest-chain-hash.json | FAIL | SCHEMA_MISSING_FIELD |
| invalid-exported-at-type.json | FAIL | SCHEMA_INVALID_FIELD |
| unsupported-version.json | FAIL | VERSION_UNSUPPORTED |
| unsupported-profile.json | FAIL | PROFILE_UNSUPPORTED |
| wrong-sequence.json | FAIL | ORDER_INVALID |
| auth-exec-mismatch.json | FAIL | AUTHORIZATION_EXECUTION_MISMATCH |
| semantic-inconsistent.json | FAIL | SEMANTIC_INCONSISTENCY |
| malformed-bundle.json | FAIL | SCHEMA_MISSING_FIELD |

## Notes

- All fixtures are offline and self-contained.
- Expected outcomes are defined against verifyBasicBundle (TypeScript) and verify_basic_bundle (Python).
- The canonical expected verdict/code/location contract is `conformance-manifest.json`.
- chain-break-bundle.json, manifest-mismatch-bundle.json, and missing-record-bundle.json are retained as legacy aliases for older references and are intentionally excluded from the canonical manifest.
