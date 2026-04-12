# Release Checklist

Use this checklist before publishing a Decision Passport Core release.

## Non-negotiable release gates

- semantic truth alignment
- cross-language deterministic parity
- adversarial verification coverage

Release is blocked if any gate is red.

## Protocol and fixtures

- Confirm verifyBasicBundle only accepts bundle_version 1.4-basic.
- Run fixture conformance checks and confirm expected PASS/FAIL outcomes.
- Confirm docs/json-schema files reflect current bundle fields.

## TypeScript validation

- Run pnpm install --frozen-lockfile.
- Run pnpm build.
- Run pnpm test.
- Run pnpm conformance.
- Run pnpm verify-demo.

## Python reference validation

- In python/decision_passport_py run pip install -e .
- Run python -m unittest discover -s tests -v.
- Run python -m decision_passport.verify ../../fixtures/valid-bundle.json.
- Run python -m decision_passport.diff ../../fixtures/valid-bundle.json ../../fixtures/tampered-bundle.json.

## Docs and release notes

- Update CHANGELOG.md Unreleased section.
- Update or add release notes file.
- Verify README examples and paths.
- Verify protocol conformance and compatibility docs are current.
- Verify category statement is exactly: "offline-verifiable authorization and execution receipts for AI and high-consequence software actions".
- Verify `docs/verifier-compatibility-promise.md` reflects supported/deprecated/unsupported status.

## Artifacts

- Run pnpm checksums.
- Verify release artifact checksums match generated output.
- Verify `fixtures/conformance-manifest.json` and `artifacts/conformance-snapshot.json` are present and aligned.
