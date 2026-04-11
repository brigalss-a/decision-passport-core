# Fixture Conformance Suite

This directory contains canonical protocol fixtures for offline, deterministic verification.

## Fixture Inventory

| Fixture | Expected result | Primary reason codes |
| --- | --- | --- |
| valid-bundle.json | PASS | none |
| tampered-bundle.json | FAIL | CHAIN_INTEGRITY_FAILED, PAYLOAD_HASH_MISMATCH |
| broken-prev-hash.json | FAIL | CHAIN_INTEGRITY_FAILED, PREV_HASH_MISMATCH |
| wrong-sequence.json | FAIL | CHAIN_INTEGRITY_FAILED, SEQUENCE_MISMATCH |
| wrong-chain-hash.json | FAIL | MANIFEST_HASH_MISMATCH |
| malformed-bundle.json | FAIL | MALFORMED_BUNDLE |
| unsupported-version.json | FAIL | UNSUPPORTED_BUNDLE_VERSION |
| compatible-optional-metadata.json | PASS | none |

## Notes

- All fixtures are offline and self-contained.
- Expected outcomes are defined against verifyBasicBundle (TypeScript) and verify_basic_bundle (Python).
- compatible-optional-metadata.json demonstrates that optional record metadata is protocol-compatible when hashes remain valid.
- chain-break-bundle.json and manifest-mismatch-bundle.json remain as legacy aliases for older test references.
