# Verifier Compatibility Promise (12 Months)

offline-verifiable authorization and execution receipts for AI and high-consequence software actions

## Scope

This policy defines support behavior for bundle profiles and verifier compatibility on the public release track.

## Support classes

- supported: Fully accepted by verifier, tested in CI parity gates, and covered by canonical fixtures.
- deprecated: Still accepted, but scheduled for removal. Emits explicit deprecation warnings in release notes.
- unsupported: Rejected fail-closed with `UNSUPPORTED_BUNDLE_VERSION`.

## Current profile policy

- `1.4-basic`: supported
- all other bundle profiles: unsupported

## 12-month promise

- A profile marked as supported will not be moved to unsupported in less than 12 months from its support announcement.
- A profile must spend at least one full release cycle in deprecated before being moved to unsupported.
- Any compatibility-state transition is recorded in CHANGELOG and release notes.

## Verifier behavior requirements

- unsupported profile: FAIL with `UNSUPPORTED_BUNDLE_VERSION`
- malformed bundle: FAIL with `MALFORMED_BUNDLE`
- semantic or integrity mismatch: FAIL with deterministic reason codes

## Integrator guarantee

Integrators can rely on fail-closed behavior and explicit reason codes for unsupported and malformed inputs.
