# Release Notes v0.5.0 (Draft)

## Summary

This release hardens Decision Passport Core as a protocol-first repository and adds a fixture-driven, offline Python reference implementation inside the same repo.

## Highlights

- Added Python reference package at python/decision_passport_py.
- Added Python public APIs for create_record, create_manifest, verify_basic_bundle, explain_tamper, diff_bundles, and load_fixture.
- Added Python module CLIs:
  - python -m decision_passport.verify <bundle.json>
  - python -m decision_passport.diff <a.json> <b.json>
- Expanded fixture conformance suite with deterministic FAIL and PASS cases.
- Added fixtures/README.md and docs/protocol-conformance.md.
- Updated README and compatibility matrix with Python and conformance framing.

## Scope boundary reaffirmed

This release remains protocol-core and offline verification only.

Not included in core:

- Hosted API wrappers
- Runtime enforcement
- Replay locks
- Signed bundles
- Policy engines

## Verification snapshot

- TypeScript verifier-basic tests: PASS
- Python unit tests (fixture + API surface): PASS
- Fixture matrix status aligned between TypeScript and Python
