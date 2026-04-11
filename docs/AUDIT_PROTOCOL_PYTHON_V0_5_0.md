# Decision Passport Core Audit for Protocol + Python Reference (v0.5.0 direction)

## Implemented and verified

- TypeScript core protocol library with canonical serialization, SHA-256 payload and record hashing, append-only chain verification, tamper explanation, and bundle diff.
- TypeScript verifier for 1.4-basic bundles with stable reason codes.
- Browser verifier for 1.4-basic in apps/verifier-web.
- Deterministic fixture suite now includes valid, tampered, broken prev-hash, wrong sequence, wrong chain hash, malformed structure, unsupported version, and compatible optional metadata.
- Python reference implementation in python/decision_passport_py with offline create, manifest, verify, tamper explain, diff, fixture loader, and module CLI.
- Python tests for fixture conformance and API surface.

## Implemented but under-documented (before this update)

- Existing extra fixtures beyond valid/tampered were present but not described as a canonical conformance suite.
- Python package modules existed but tests were missing.

## Documented but not implemented

- None found in this update scope for protocol-core and offline verifier claims.

## Implemented but not tested enough (remaining)

- No automated cross-language byte-for-byte parity harness yet (TS vs Python in one command).
- Browser verifier does not currently run fixture matrix in CI as an automated check.

## Release and documentation drift observed

- README still referenced two-fixture framing while more fixture variants existed.
- Python README command paths were incorrect for package-local invocation.
- Public docs did not include a normative protocol conformance page.

## Highest-value next changes

1. Add a single parity runner script that executes TS and Python against all fixtures and compares status and reason-code sets.
2. Add CI job for python/decision_passport_py tests in GitHub workflows.
3. Add signed release artifact verification as a separate layer without changing core protocol scope.
