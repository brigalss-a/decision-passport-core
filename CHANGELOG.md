# Changelog

<!-- markdownlint-disable MD024 -->

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Bundle diff utility** (`diffBundles()`): compare two `BasicProofBundle` objects and get a structured diff. Reports added/removed/changed records, manifest differences, and a human-readable summary.
- **diff-bundles CLI** (`scripts/diff-bundles.ts`): compare two bundle JSON files from the command line (`pnpm diff-bundles a.json b.json`).
- **10 new tests** for bundle diff (identical, tampered, added, removed, manifest, metadata, multi-diff).
- **JSON Schemas** for PassportRecord, ChainManifest, and BasicProofBundle (`docs/json-schema/`).
- **Schema and versioning docs** (`docs/schema-versioning.md`): bundle structure tables, hashing rules, schema evolution guidance.
- **Compatibility matrix** (`docs/compatibility-matrix.md`): tool/format compatibility, cross-repo compatibility, known limits.
- **Release workflow** (`.github/workflows/release.yml`): automated GitHub Release on `v*` tags with artifact collection and SHA-256 checksums.
- **Checksum generation** (`scripts/generate-checksums.ts`): SHA-256 checksums for fixture files.
- **Release verification docs** (`docs/release-verification.md`): step-by-step local verification of published releases.
- Test count at time of update: 79 passing in latest local validation (2026-04-05).

### Fixed

- Markdown lint warnings across README, CONTRIBUTING, SECURITY, CHANGELOG, how-it-works, and RELEASE_NOTES files.
- TypeScript import in `scripts/diff-bundles.ts` (changed to relative path for IDE resolution).

## [0.1.0] - 2025-06-28

### Added

- **Core library** (`@decision-passport/core`): canonical JSON serialisation, SHA-256 hashing, hash-chain construction, bundle manifest generation, and custom error types.
- **Basic verifier** (`@decision-passport/verifier-basic`): standalone bundle verification with `PASS` / `FAIL` / `ERROR` outcomes.
- **Demo** (`@decision-passport/demo`): end-to-end demonstration that builds a 3-record chain, exports a bundle, and verifies it.
- **Test suite**: 56 tests across core (48) and verifier-basic (8), including tampered-bundle fixture tests.
- **CI workflow** (`.github/workflows/ci.yml`): install → build → test → verify-demo on every push and PR.
- **verify-demo script**: automated CI gate that builds a bundle, verifies it, and confirms tampered bundles are rejected.
- **Fixture generation** (`scripts/generate-fixtures.ts`): example valid and tampered bundle JSON fixtures for downstream consumers.
- Apache-2.0 licence, CONTRIBUTING.md, SECURITY.md.
