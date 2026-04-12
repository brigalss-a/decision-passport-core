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

## Trail vs Passport boundary (v0.7.0)

1. DecisionTrail is a pre-action structured forensic layer.
2. Decision Passport is the canonical authorization and execution proof artifact.
3. DecisionTrail does not replace Decision Passport verification.
4. DecisionTrail should remain compact and structured, not a transcript dump.

## Logs, traces, audit logs, proof bundles, and enforcement

1. Logs and traces are operational telemetry and can be edited or incomplete.
2. Generic audit logs can describe events without cryptographic integrity checks.
3. Decision Passport proof bundles bind structured records with canonical hashing for integrity verification.
4. Runtime enforcement blocks actions before execution; this repository verifies post-hoc integrity after export.
