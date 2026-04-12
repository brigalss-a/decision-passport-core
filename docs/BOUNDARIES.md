# Boundaries

## What this repository is

Decision Passport Core is a proof-layer library for append-only, hash-linked records.
It creates and verifies portable proof bundles offline.

## What this repository is not

This repository is not a runtime policy engine.
It is not an execution guard.
It is not a control-plane service.
It is not a storage immutability platform.

## What is proven

1. Record hash integrity for each record in a bundle.
2. Chain-link integrity through prev_hash and sequence checks.
3. Manifest terminal hash match against the last record hash.
4. Offline verification reproducibility of integrity checks.

## What is not proven

1. That an action was authorized at runtime.
2. That policy compliance was enforced at execution time.
3. That exported files were protected by immutable storage.
4. That a specific human or service identity authored records, unless external signing is added.

## Trust boundaries

1. Input boundary: the verifier trusts the provided bundle bytes as input.
2. Verification boundary: the verifier checks internal integrity, not external provenance.
3. Storage boundary: file durability and write protection are outside this library.
4. Runtime boundary: execution controls are outside this library.

## Assumptions

1. Consumers keep original bundles if they need strict re-verification later.
2. Consumers understand PASS and FAIL as integrity outcomes, not authorization outcomes.
3. Consumers control how bundles are transported and stored.

## Failure modes and non-goals

1. Tampered payload, record_hash, prev_hash, or manifest hash should produce FAIL or tamper findings.
2. Malformed input can fail verification or throw earlier in parsing layers.
3. This repository does not prevent misuse by operators.
4. This repository does not guarantee legal admissibility.

## What stronger infrastructure would add

1. Runtime claim issuance and fail-closed execution gating.
2. Replay protection, tenant boundaries, and policy engines.
3. Signed bundle provenance and key management.
4. Hardened storage controls and enterprise governance workflows.

## v0.7.0 implementation classification

This classification is release-truth and intentionally strict.

1. DecisionTrail: implemented as structured model/schema plus verifier-visible linkage semantics.
2. DecisionPassport: implemented as canonical hash-chain/manifest proof artifact with offline verification.
3. DecisionGuard semantics: partially implemented (RuntimeClaim model + fail-closed semantic outcomes) but no full hosted runtime executor.
4. DecisionVerifier: implemented for v0.7.0 semantic scope with stable auditor fields and additive semantic statuses.

Spec-defined but not fully implemented in v0.7.0:

1. guard runtime service lifecycle and execution orchestration
2. replay-state authority infrastructure across tenants
3. signing/key-management profile expansion

Deferred to 0.8.x or later:

1. hosted guard runtime implementation
2. richer outcome/side-effect graphing
3. extended signing and provenance ecosystems

## Trail vs Passport boundary (v0.7.0)

1. DecisionTrail is a pre-action structured forensic layer.
2. Decision Passport is the canonical authorization and execution proof artifact.
3. DecisionTrail does not replace Decision Passport verification.
4. DecisionTrail should remain compact and structured, not a transcript dump.

## Guard boundary (v0.7.0)

1. Decision Guard runtime semantics are now explicitly defined (fail-closed order, finite deny reasons, claim fields).
2. This release does not claim a full hosted/runtime guard executor implementation.
3. RuntimeClaim semantics are verifier-visible and designed to preserve offline verification value.

## Outcome boundary (v0.7.0)

1. OutcomeBinding is the compact execution-result layer for v0.7.0.
2. It distinguishes DENIED, FAILED, ABORTED, PENDING, EXPIRED, and SUCCESS as separate states.
3. It is not a full side-effect graph, output manifest system, or runtime telemetry stream.

## Logs, traces, audit logs, proof bundles, and enforcement

1. Logs and traces are operational telemetry and can be edited or incomplete.
2. Generic audit logs can describe events without cryptographic integrity checks.
3. Decision Passport proof bundles bind structured records with canonical hashing for integrity verification.
4. Runtime enforcement blocks actions before execution; this repository verifies post-hoc integrity after export.
