# Compatibility Matrix

## Public tools and bundle formats

| Tool | Bundle version | Status |
| --- | --- | --- |
| `verifyBasicBundle()` | `1.4-basic` | Supported |
| `explainTamper()` | `1.4-basic` | Supported (records + optional manifest) |
| `diffBundles()` | `1.4-basic` | Supported |
| Browser verifier (`apps/verifier-web/`) | `1.4-basic` | Supported |
| CLI verifier (`verifier-basic/src/cli.ts`) | `1.4-basic` | Supported |
| `renderVerificationReport()` | `1.4-basic` | Supported |

---

## Fixture compatibility

| Fixture | Format | Verifier result |
| --- | --- | --- |
| `fixtures/valid-bundle.json` | `1.4-basic` | PASS |
| `fixtures/tampered-bundle.json` | `1.4-basic` | FAIL (payload tampered at index 1) |
| `fixtures/broken-prev-hash.json` | `1.4-basic` | FAIL (prev_hash linkage mismatch) |
| `fixtures/wrong-sequence.json` | `1.4-basic` | FAIL (record sequence mismatch) |
| `fixtures/wrong-chain-hash.json` | `1.4-basic` | FAIL (manifest chain hash mismatch) |
| `fixtures/malformed-bundle.json` | `1.4-basic` | FAIL (malformed structure) |
| `fixtures/unsupported-version.json` | `2.0-future` | FAIL (unsupported bundle version) |
| `fixtures/compatible-optional-metadata.json` | `1.4-basic` | PASS |

The conformance fixtures are deterministic and version-locked. They are used in verifier tests and by the Python reference implementation.

---

## Cross-repo compatibility

| Feature | Core (`1.4-basic`) | OpenClaw Lite (`1.4-openclaw-lite`) |
| --- | --- | --- |
| `PassportRecord` structure | Identical | Identical |
| `ChainManifest` structure | Identical | Identical |
| Hash algorithm (SHA-256) | Identical | Identical |
| Canonical serialisation | Identical | Identical |
| `bundle_version` string | `"1.4-basic"` | `"1.4-openclaw-lite"` |
| `ActionType` values | 10 values | 3 values (subset) |
| `summary` field on bundle | Not present | Optional |

The core verifier (`verifyBasicBundle`) checks `bundle_version === "1.4-basic"` and will reject bundles with a different version string. To verify OpenClaw Lite bundles, use `verifyLiteBundle()` from the `decision-passport-openclaw-lite` package.

---

## Browser verifier compatibility

The browser verifier at `apps/verifier-web/` re-implements canonical serialisation and SHA-256 hashing using the Web Crypto API. It supports `1.4-basic` bundles only.

To verify in the browser:

1. Serve the repo root with any static file server
2. Open `apps/verifier-web/`
3. Drag a `1.4-basic` bundle JSON onto the page

The browser verifier does not upload any data.

---

## Limits of compatibility claims

- Bundle verification confirms structural and cryptographic integrity only. It does not confirm that the recorded actions actually occurred.
- Verification does not prove who created the bundle. There is no signing in the public preview.
- The `1.4-basic` format is in public preview and may change before a 1.0 release.
- Enterprise features (claims, guard, replay protection, signed bundles) use extended formats not covered here.
