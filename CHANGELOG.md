# Changelog

<!-- markdownlint-disable MD024 -->

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.6.0] - 2026-04-12

### Added

- Canonical machine-readable conformance contract at `fixtures/conformance-manifest.json`.
- Cross-language conformance parity gate script `pnpm conformance` with release snapshot output at `artifacts/conformance-snapshot.json`.
- Verifier compatibility policy document at `docs/verifier-compatibility-promise.md`.
- Auditor-mode verifier outputs with explicit findings metadata (`code`, `location`, `reason`, `remediation_hint`).
- Public provenance verification guidance at `docs/release-provenance.md`.
- Two reference integrations in `examples/reference-integrations/`:
	- webhook approval receipt
	- agent tool execution receipt
- Deterministic reference integration smoke gate at `scripts/check-reference-integrations.ts`.

### Changed

- Version alignment across workspace, TypeScript packages, browser verifier app, and Python package metadata to the v0.6.0 release line.
- CI and release workflows now install Python and run parity conformance checks fail-closed.
- CI now runs deterministic reference integration smoke checks and Python verification on reference bundles.
- Release artifact collection now includes canonical fixture corpus, conformance manifest, and conformance snapshot.
- Release verification and checklist docs now enforce non-negotiable gates and parity evidence.

## [0.5.1] - 2026-04-11

### Changed

- README release validation snapshot updated to current local evidence (TypeScript and Python counts).
- Added explicit Python quick-check commands in README for fixture-level verification.

### Notes

- Version-drift audit for `v0.2.0` references found matches only in local `reports/release-double-check/` artifacts (historical/non-release surface).

### Added

- **Python reference implementation** (`python/decision_passport_py`): offline-first create/verify library with bundle diff, tamper explanation, fixture loader, and module CLI (`python -m decision_passport.verify`, `python -m decision_passport.diff`).
- **Python fixture-driven tests**: conformance tests for PASS and FAIL fixtures plus core API surface tests.
- **Expanded conformance fixtures**: `broken-prev-hash.json`, `wrong-sequence.json`, `wrong-chain-hash.json`, `unsupported-version.json`, `compatible-optional-metadata.json`.
- **Fixture conformance catalog** (`fixtures/README.md`) with expected verifier outcomes and reason code families.
- **Protocol conformance spec** (`docs/protocol-conformance.md`) with normative vs informative checks.
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
