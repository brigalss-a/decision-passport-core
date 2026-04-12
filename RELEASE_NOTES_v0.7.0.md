# Release Notes v0.7.0

offline-verifiable authorization and execution receipts for AI and high-consequence software actions

## Summary

v0.7.0 is a protocol-grade semantics release for Decision Passport Core.

This release adds structured pre-action, runtime-boundary, and execution-result semantics while keeping release scope intentionally tight.

## What changed

### DecisionTrail

- Added DecisionTrail schema and model surfaces for pre-action structure.
- Added canonical DecisionTrail fixtures for valid and invalid linkage paths.
- Added verifier-visible trail linkage semantics.

### RuntimeClaim and Guard semantics

- Added RuntimeClaim schema and model surfaces for runtime-boundary claims.
- Added fail-closed deny taxonomy semantics:
  - AUTHORITY_MISSING
  - CLAIM_EXPIRED
  - CLAIM_REVOKED
  - NONCE_REUSED
  - PAYLOAD_HASH_MISMATCH
  - PASSPORT_NOT_AUTHORIZED
  - CLAIM_MALFORMED
- Added verifier-visible runtime claim state signaling.

### OutcomeBinding

- Added OutcomeBinding schema and model surfaces.
- Added finite outcome states:
  - SUCCESS
  - DENIED
  - FAILED
  - ABORTED
  - PENDING
  - EXPIRED
- Added verifier-visible outcome linkage semantics.

### Verifier semantic upgrade

- Added additive semantic status fields for:
  - authorization
  - payload binding
  - runtime claim
  - outcome linkage
  - revocation
  - supersession
  - trail linkage
- Preserved stable cross-language auditor contract fields:
  - verdict
  - code
  - location
  - reason
  - remediation_hint

### Negative semantic corpus additions

- Added canonical negative fixtures:
  - fixtures/passport-revoked.json
  - fixtures/passport-superseded.json
  - fixtures/trail-link-mismatch.json
  - fixtures/outcome-link-mismatch.json
- Added per-fixture parity scope in conformance manifest for additive semantic fields (`typescript_only` where applicable) to keep Python parity claims honest.

## Implemented vs partial vs spec-only

Implemented in v0.7.0:

1. DecisionPassport core integrity verification (TS and Python).
2. DecisionTrail model/schema surfaces and verifier-visible linkage status.
3. RuntimeClaim and OutcomeBinding model/schema surfaces.
4. Verifier semantic status visibility for the v0.7.0 taxonomy.

Partially implemented in v0.7.0:

1. DecisionGuard runtime semantics are modeled and verifier-visible.
2. A full hosted/runtime guard executor is not part of this release.

Spec-defined but not fully implemented in v0.7.0:

1. broader runtime enforcement orchestration and replay-state infrastructure.
2. expanded signing and identity-attestation profiles.

## Not included in v0.7.0

- hosted guard runtime implementation
- enterprise control plane surfaces
- broader signing/profile expansion without complete fixture and verifier coverage
- richer outcome graph/telemetry systems
- scope expansion into 0.8.x concepts

## Validation gates for this release

- pnpm install --frozen-lockfile
- pnpm workflow:discipline
- pnpm verifier:golden
- pnpm build
- pnpm typecheck
- pnpm lint
- pnpm test
- pnpm conformance
- pnpm verify-demo
- pnpm example:smoke
- python -m decision_passport.verify examples/reference-integrations/webhook-approval-receipt.bundle.json
- python -m decision_passport.verify examples/reference-integrations/agent-tool-execution-receipt.bundle.json
