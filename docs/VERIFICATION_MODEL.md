# Verification Model

## What verification checks

Decision Passport Core verification checks:

1. Sequence continuity across records.
2. prev_hash linkage across the chain.
3. record_hash recomputation consistency.
4. Manifest chain_hash match with the final record hash.

## DecisionTrail in v0.7.0

DecisionTrail is a structured pre-action forensic artifact. It is intentionally separate from the Decision Passport proof bundle.

DecisionTrail captures:

1. initiating request intent
2. context references
3. alternatives and rejected options
4. escalation events
5. approval checkpoint
6. final approved payload
7. linked passport id

DecisionTrail is not final authorization by itself. The canonical authorization and execution evidence remains the Decision Passport artifact.

## What verification does not check

1. Runtime authorization of actions.
2. Policy correctness or policy approval workflow.
3. Identity authenticity without external signing.
4. Storage immutability guarantees.
5. Transcript-level conversational provenance beyond structured trail fields.

## RuntimeClaim and Guard semantics in v0.7.0

v0.7.0 defines Decision Guard runtime semantics with a fail-closed model and verifier-visible claim state.

RuntimeClaim minimal fields:

1. claim_id
2. passport_id
3. nonce
4. issued_at_utc
5. expires_at_utc
6. payload_hash
7. authority_ref
8. claim_status
9. single_use
10. guard_version

Fail-closed guard evaluation order:

1. validate structure
2. validate authority present
3. validate claim status
4. validate TTL
5. validate nonce/single-use eligibility
6. validate payload hash match
7. validate passport authorization status
8. decide allow/deny and emit auditable reason

Finite deny reasons:

1. AUTHORITY_MISSING
2. CLAIM_EXPIRED
3. CLAIM_REVOKED
4. NONCE_REUSED
5. PAYLOAD_HASH_MISMATCH
6. PASSPORT_NOT_AUTHORIZED
7. CLAIM_MALFORMED

Honesty boundary:

1. Decision Guard runtime semantics are defined in this release line.
2. Full runtime executor implementation is not included by this semantics pass.
3. Verifier-visible claim semantics are introduced without reducing offline verification value.

## OutcomeBinding in v0.7.0

v0.7.0 adds a minimal OutcomeBinding model so verification can reason about what happened after authorization and claim evaluation.

Minimal OutcomeBinding fields:

1. outcome_status
2. executor_id
3. executed_at_utc
4. reason_code
5. linked_runtime_claim_id
6. output_reference_hashes (optional)
7. outcome_hash (optional)

Finite outcome statuses:

1. SUCCESS
2. DENIED
3. FAILED
4. ABORTED
5. PENDING
6. EXPIRED

Semantics boundary:

1. OutcomeBinding is not a side-effect ledger.
2. OutcomeBinding is not full runtime telemetry.
3. OutcomeBinding is the compact execution-result layer used to link result state to the claim/passport path.

## Inputs to verification

1. A parsed BasicProofBundle object.
2. Record list with required hash fields.
3. Manifest with chain hash fields.

## Expected outputs and statuses

Current verifier result status is PASS or FAIL.
Each run returns structured checks plus:

1. `summary` for human triage.
2. `reasonCodes` for stable machine-readable classification.
3. `nextSteps` for concise inspection guidance.
4. `tamperFindings` when integrity failures can be mapped to tamper categories.

## PASS vs FAIL semantics

1. PASS means internal bundle integrity checks passed.
2. FAIL means one or more integrity checks failed.
3. PASS does not mean runtime policy compliance.
4. FAIL does not by itself identify actor intent.

## Common verification misunderstandings

1. PASS is not runtime authorization proof.
2. PASS is not legal or regulatory admissibility by itself.
3. FAIL is not always a malicious event, it can be corruption or malformed input.
4. Verification is not the same as observability telemetry.

## Reason code taxonomy

Current reason codes include:

1. `MALFORMED_BUNDLE`
2. `EMPTY_OR_MISSING_RECORDS`
3. `CHAIN_INTEGRITY_FAILED`
4. `MANIFEST_HASH_MISMATCH`
5. `PAYLOAD_HASH_MISMATCH`
6. `PREV_HASH_MISMATCH`
7. `SEQUENCE_MISMATCH`
8. `UNKNOWN_VERIFICATION_ERROR`

Malformed and integrity failures are intentionally separated.

## Reproducibility vs determinism

1. Verification behavior is deterministic for the same bundle bytes.
2. Record creation can include runtime UUID and timestamp values.
3. Re-generated sample bundles can differ byte-wise while still verifying correctly.

## How to interpret results safely

1. Treat PASS as integrity evidence for the provided bundle only.
2. Pair PASS with operational controls if you need enforcement guarantees.
3. Investigate FAIL using check messages and tamper explanation paths.
4. Keep original artifacts for repeatable review.

## Verification versus logging, trust, and enforcement

1. Verifying a bundle means checking internal cryptographic consistency.
2. Trusting an execution environment requires external controls.
3. Proving authorization requires runtime claim and guard systems.
4. Generic logs can help context, but they are not equivalent to bundle integrity verification.
