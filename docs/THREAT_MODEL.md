# Threat Model

## Scope

This document covers threats relevant to Decision Passport Core proof bundles and offline verification.

## Assets being protected

1. Integrity of bundle records and chain links.
2. Integrity of manifest chain_hash linkage.
3. Reviewer confidence in PASS or FAIL integrity outcomes.

## Threats addressed

1. Payload tampering after record creation.
2. Record hash tampering.
3. Chain-link tampering through prev_hash or sequence edits.
4. Manifest chain hash mismatch.

## Threats partially addressed

1. Missing records can be detected when chain consistency breaks or expected count checks fail in consumer workflows.
2. Malformed bundles are detected when parsing or verification cannot complete normally.
3. Untrusted transport is partially addressed because post-transfer verification can detect integrity change, but cannot prove trusted origin.

## Threats not addressed

1. Runtime authorization and policy enforcement failures.
2. Insider misuse before bundle creation.
3. Strong identity attestation for who created the bundle.
4. Storage overwrite, deletion, or retention policy failure.

## Trust assumptions

1. Consumers verify original bundles before operational decisions.
2. Consumers do not interpret PASS as policy approval.
3. External systems handle secure transport, storage, and identity.

## Operational caveats

1. Record creation uses runtime UUID and timestamp values.
2. Verification semantics are deterministic, but regenerated fixtures are not byte-identical by default.
3. Bundle interpretation errors by humans remain possible.

## Residual risk

1. A valid PASS still depends on trusted capture and export processes upstream.
2. Selective capture outside this repository can omit context even if remaining records are internally valid.
3. Without external signing, integrity verification does not establish provenance.
