# Tamper Cases

## Why tamper cases matter

Verification results are easier to trust when reviewers can map FAIL outcomes to concrete failure patterns.
This document describes cases grounded in current core implementation behavior.

## Canonical cases represented by current implementation

### Case 1: payload changed after recording

What happens:
1. A record payload is edited after record creation.
2. `payload_hash` no longer matches the payload.
3. `record_hash` recomputation also fails for that record.

Expected verification behavior:
1. `verifyBasicBundle()` returns `FAIL`.
2. Check `chain_integrity` fails.
3. `explainTamper()` reports `payload_hash` and usually `record_hash` findings.

### Case 2: hash chain link broken

What happens:
1. A `prev_hash` is altered, or an upstream record hash changes.
2. The next record no longer links to the expected previous hash.

Expected verification behavior:
1. `verifyBasicBundle()` returns `FAIL`.
2. `chain_integrity` fails with a linkage message.
3. `explainTamper()` reports `prev_hash` findings.

### Case 3: sequence integrity broken

What happens:
1. Sequence values are edited, duplicated, skipped, or reordered.

Expected verification behavior:
1. `verifyBasicBundle()` returns `FAIL`.
2. `chain_integrity` fails with sequence mismatch details.
3. `explainTamper()` reports `sequence` findings.

### Case 4: manifest chain hash mismatch

What happens:
1. `manifest.chain_hash` does not match the last record hash.

Expected verification behavior:
1. `verifyBasicBundle()` returns `FAIL`.
2. `manifest_chain_hash` check fails.
3. `explainTamper()` can report `manifest_chain_hash` findings.

### Case 5: missing record in a previously valid chain

What happens:
1. A middle or terminal record is removed from a bundle.
2. Links or manifest relationship no longer hold.

Expected verification behavior:
1. `verifyBasicBundle()` returns `FAIL` when linkage or manifest checks break.
2. Failure may appear as chain or manifest mismatch, depending on where removal happened.

## Natural malformed-input boundary cases

Malformed input is classified separately from integrity failures.

### Case 6: malformed bundle shape

Examples:
1. Missing `passport_records`.
2. Missing `manifest`.
3. Wrong field types in parsed input.

Expected behavior:
1. Verifier returns `FAIL` with reason code `MALFORMED_BUNDLE` when malformed shape reaches verification.
2. JSON parsing failure can still occur before verification in caller paths.

## What a reviewer should expect from verification failure

1. `status: FAIL` means integrity checks did not pass.
2. `checks` identifies which check failed.
3. `reasonCodes` distinguishes malformed structure from integrity mismatch categories.
4. `explainTamper()` and `tamperFindings` help classify likely tamper or corruption patterns.
5. A single failure does not prove malicious intent by itself.

## How to investigate a failure

1. Inspect `checks` output from `verifyBasicBundle()`.
2. Run `explainTamper(records, manifest)` on the same bundle.
3. Compare with a known-good bundle using `diffBundles()`.
4. Confirm whether transport, manual edits, or export pipeline changes occurred.
5. Keep original bytes and checksum evidence during incident review.

## Limits of tamper interpretation

1. Core verification explains integrity mismatches, not actor intent.
2. PASS does not prove runtime authorization or policy compliance.
3. Without external signing, provenance of bundle origin is out of scope.
4. Storage and retention guarantees require stronger infrastructure outside this repository.
