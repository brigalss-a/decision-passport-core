# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2025-06-28

### Added

- **Core library** (`@decision-passport/core`): canonical JSON serialisation, SHA-256 hashing, hash-chain construction, bundle manifest generation, and custom error types.
- **Basic verifier** (`@decision-passport/verifier-basic`): standalone bundle verification with `PASS` / `FAIL` / `ERROR` outcomes.
- **Demo** (`@decision-passport/demo`): end-to-end demonstration that builds a 3-record chain, exports a bundle, and verifies it.
- **Test suite**: 56 tests across core (48) and verifier-basic (8), including tampered-bundle fixture tests.
- **CI workflow** (`.github/workflows/ci.yml`): install → build → test → verify-demo on every push and PR.
- **verify-demo script**: automated CI gate that builds a bundle, verifies it, and confirms tampered bundles are rejected.
- **Fixture generation** (`scripts/generate-fixtures.ts`): deterministic valid and tampered bundle JSON fixtures for downstream consumers.
- Apache-2.0 licence, CONTRIBUTING.md, SECURITY.md.
