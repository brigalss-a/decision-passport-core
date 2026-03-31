# Release Notes: v0.1.0

## Highlights

- Offline verifier with zero external dependencies
- Tamper explainer that identifies exactly what changed and why verification failed
- Browser verifier: drag-and-drop client-side verification, nothing uploaded
- HTML verification report export
- Deterministic valid + tampered test fixtures
- 56 tests, all passing
- Green GitHub Actions CI
- Fresh-clone validated on Windows and GitHub Actions (Ubuntu)

## Included

- Core hash-chain engine (`createRecord`, `verifyChain`, `assertValidChain`)
- SHA-256 canonical hashing with deterministic JSON serialisation
- `explainTamper()`: structured tamper analysis
- `renderVerificationReport()`: self-contained HTML report
- Offline bundle verifier + CLI verifier
- Browser verifier (`apps/verifier-web/`)
- Runnable demo (`pnpm demo`) and verify-demo (`pnpm verify-demo`)
- Deterministic fixtures (`fixtures/valid-bundle.json`, `fixtures/tampered-bundle.json`)
- CI workflow (install, build, test, verify-demo)

## Quickstart

```bash
git clone https://github.com/brigalss-a/decision-passport-core.git
cd decision-passport-core
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm verify-demo
```

## Known limits

- Public preview. API surface may change before 1.0
- No hosted verifier in this repo
- No enterprise control plane (claims, guard, outcomes). Those live in the private repo.
- No signed bundle path yet
- No npm publish yet
