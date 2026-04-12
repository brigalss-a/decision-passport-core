# Release Notes v0.6.0

offline-verifiable authorization and execution receipts for AI and high-consequence software actions

## Summary

v0.6.0 is a feature release that hardens verifier semantics, cross-language parity enforcement, and reference integration reproducibility.

## What changed

### Verifier and conformance hardening

- Added canonical machine-readable conformance contract at fixtures/conformance-manifest.json.
- Added strict cross-language parity gate with snapshot evidence:
  - pnpm conformance
  - artifacts/conformance-snapshot.json
- Added verifier compatibility policy document at docs/verifier-compatibility-promise.md.
- Added auditor-mode verifier outputs with explicit findings metadata:
  - code
  - location
  - reason
  - remediation_hint

### Provenance and reference integration story

- Added public provenance verification guidance in docs/release-provenance.md.
- Added two minimal reference integrations in examples/reference-integrations/:
  - webhook-approval-receipt
  - agent-tool-execution-receipt
- Added deterministic smoke gate for those examples:
  - pnpm example:smoke

### Release and CI discipline

- CI and release workflows install Python and run fail-closed parity checks.
- CI includes deterministic example smoke and Python verification over reference bundles.
- Release artifact collection includes:
  - canonical fixture corpus
  - conformance-manifest.json
  - conformance-snapshot.json
  - verification-summary.json
  - checksums.txt

## Scope

No hosted control plane components.
No runtime enforcement layer.
No signing infrastructure.
No policy token or replay lock implementation.

## Verification gates for this release line

- pnpm install --frozen-lockfile
- pnpm build
- pnpm typecheck
- pnpm lint
- pnpm test
- pnpm conformance
- pnpm verify-demo
- pnpm example:smoke
- python -m decision_passport.verify examples/reference-integrations/webhook-approval-receipt.bundle.json
- python -m decision_passport.verify examples/reference-integrations/agent-tool-execution-receipt.bundle.json
