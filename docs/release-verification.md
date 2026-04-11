# Release Verification

## What a release includes

Each tagged release (`v*`) produces:

| Artifact | Description |
| --- | --- |
| `valid-bundle.json` | Deterministic fixture that verifies as PASS |
| `tampered-bundle.json` | Deterministic fixture that verifies as FAIL |
| Conformance fixtures (`broken-prev-hash`, `wrong-sequence`, `wrong-chain-hash`, `unsupported-version`, `malformed-bundle`) | Deterministic fixtures that verify as FAIL |
| `compatible-optional-metadata.json` | Deterministic fixture that verifies as PASS |
| `checksums.txt` | SHA-256 checksums for fixture files |
| `verification-summary.json` | Output of `pnpm verify-demo` (if generated) |

---

## How to verify a release locally

### 1. Clone and build

```bash
git clone https://github.com/brigalss-a/decision-passport-core.git
cd decision-passport-core
git checkout v0.1.0   # or any release tag
pnpm install --frozen-lockfile
pnpm build
```

### 2. Run the test suite

```bash
pnpm test
```

All tests must pass.

### 3. Run the verification demo

```bash
pnpm verify-demo
```

This builds a fresh chain, verifies it, rejects a tampered bundle, and generates artifacts.

### 4. Verify fixture checksums

```bash
pnpm checksums
```

Compare the output with the `checksums.txt` file from the GitHub Release. The SHA-256 hashes should match exactly.

### 5. Run the bundle diff

```bash
pnpm diff-bundles fixtures/valid-bundle.json fixtures/tampered-bundle.json
```

This should report exactly one difference (the tampered payload).

### 6. Verify with Python reference implementation

```bash
cd python/decision_passport_py
pip install -e .
python -m unittest discover -s tests -v
python -m decision_passport.verify ../../fixtures/valid-bundle.json
python -m decision_passport.diff ../../fixtures/valid-bundle.json ../../fixtures/tampered-bundle.json
```

The diff command exits with a non-zero code when bundles differ, which is expected for the tampered fixture pair.

---

## What successful verification proves

- The source code builds without errors
- All tests pass on your machine
- The hash chain engine correctly creates and verifies bundles
- Tampered bundles are correctly rejected
- Fixture files match the published checksums

## What verification does NOT prove

- It does not prove the release was created by a specific person (no code signing in public preview)
- It does not prove the release artifacts were not modified after creation (no provenance attestation yet)
- It does not prove the source code has no vulnerabilities
- It does not replace a security audit

---

## Browser verification

You can also verify bundles in the browser:

```bash
npx serve . -l 3000
# Open http://localhost:3000/apps/verifier-web/
```

Drag `fixtures/valid-bundle.json` onto the page to see PASS. Drag `fixtures/tampered-bundle.json` to see FAIL.
