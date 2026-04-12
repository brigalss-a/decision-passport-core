# Release Checklist

Use this checklist before publishing a Decision Passport Core release.

## Non-negotiable release gates

- semantic truth alignment
- cross-language deterministic parity
- adversarial verification coverage

Release is blocked if any gate is red.

## v0.7.0 scope lock gates

- Confirm v0.7.0 primary scope remains: DecisionTrail, RuntimeClaim, OutcomeBinding, upgraded verifier semantics.
- Confirm decision-passport-core remains canonical source for model semantics, verifier semantics, fixtures/golden outputs, and protocol/spec docs.
- Confirm out-of-scope items are not represented as implemented release features.
- Confirm every new semantic is classified in docs as implemented, partially implemented, spec-only, or future work.
- Confirm no broad signing/profile expansion is shipped unless complete verifier and fixture support is included.

## Protocol and fixtures

- Confirm verifyBasicBundle only accepts bundle_version 1.4-basic.
- Run fixture conformance checks and confirm expected PASS/FAIL outcomes.
- Confirm docs/json-schema files reflect current bundle fields.

## TypeScript validation

- Run pnpm install --frozen-lockfile.
- Run pnpm build.
- Run pnpm typecheck.
- Run pnpm lint.
- Run pnpm test.
- Run pnpm verifier:golden.
- Run pnpm example:smoke.
- Run pnpm conformance.
- Run pnpm verify-demo.
- Run pnpm workflow:discipline.

## Python reference validation

- In python/decision_passport_py run pip install -e .
- Run python -m unittest discover -s tests -v.
- Run python -m decision_passport.verify ../../fixtures/valid-bundle.json.
- Run python -m decision_passport.diff ../../fixtures/valid-bundle.json ../../fixtures/tampered-bundle.json.
- Run python -m decision_passport.verify ../../examples/reference-integrations/webhook-approval-receipt.bundle.json.
- Run python -m decision_passport.verify ../../examples/reference-integrations/agent-tool-execution-receipt.bundle.json.

## Docs and release notes

- Update CHANGELOG.md Unreleased section.
- Update or add release notes file.
- Verify release notes file name matches tag exactly: RELEASE_NOTES_vX.Y.Z.md.
- Verify README examples and paths.
- Verify protocol conformance and compatibility docs are current.
- Verify `docs/release-provenance.md` matches actual release workflow outputs.
- Verify category statement is exactly: "offline-verifiable authorization and execution receipts for AI and high-consequence software actions".
- Verify `docs/verifier-compatibility-promise.md` reflects supported/deprecated/unsupported status.

## Artifacts

- Run pnpm checksums.
- Verify release artifact checksums match generated output.
- Verify `fixtures/conformance-manifest.json` and `artifacts/conformance-snapshot.json` are present and aligned.
- Verify GitHub artifact attestation for at least `checksums.txt` and `conformance-snapshot.json` from the tagged release.
