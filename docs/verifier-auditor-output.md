# Verifier Auditor Output Contract

offline-verifiable authorization and execution receipts for AI and high-consequence software actions

## Stable contract fields

Each verifier result exposes the following auditor-grade fields:

- verdict
- code
- location
- reason
- remediation_hint

These fields are deterministic and machine-readable in both TypeScript and Python verifier implementations.

## Additive semantic status fields (v0.7.0)

The stable auditor contract remains `verdict`, `code`, `location`, `reason`, and `remediation_hint`.

v0.7.0 adds verifier-visible semantic status fields on the TypeScript `@decision-passport/verifier-basic` surface:

- authorization_status
- payload_binding_status
- runtime_claim_status
- outcome_linkage_status
- revocation_status
- supersession_status
- trail_linkage_status

These fields are additive. They do not replace the stable auditor contract and must not silently repurpose existing verifier codes.

Truth boundary for parity in v0.7.0:

1. cross-language compatibility promise remains anchored on verdict, code, location, reason, and remediation_hint
2. additive semantic statuses are currently canonical on the TypeScript verifier surface
3. fixture contracts may declare typescript_only parity scope for semantic fields that are intentionally outside current Python parity guarantees

## Contract freeze policy

For the public release track, auditor fields and code taxonomy are treated as stability-critical verifier API.

- `verdict`, `code`, `location`, `reason`, and `remediation_hint` are part of the compatibility surface.
- New codes may be added when they represent genuinely new failure classes.
- Existing codes will not be silently repurposed to different meanings.
- If a code must be retired, migration guidance is required in release notes and CHANGELOG.

## Verdict enum

- VALID
- INVALID

## Code taxonomy

- SUCCESS_VALID
- SCHEMA_MISSING_FIELD
- SCHEMA_INVALID_FIELD
- VERSION_UNSUPPORTED
- PROFILE_UNSUPPORTED
- HASH_MISMATCH
- CHAIN_BROKEN
- ORDER_INVALID
- AUTHORIZATION_EXECUTION_MISMATCH
- SEMANTIC_INCONSISTENCY
- BUNDLE_MALFORMED

## Location format

Locations use stable JSON-path-like pointers, for example:

- $.bundle
- $.bundle_version
- $.manifest.chain_hash
- $.passport_records[1].payload_hash
- $.passport_records[*].action_type

## Determinism rules

- Equivalent failure conditions must emit equivalent `code` and `location` in TypeScript and Python.
- Unsupported profile/version handling is fail-closed.
- Missing field and invalid field failures are not conflated.
- Success results use the same contract with `verdict=VALID` and `code=SUCCESS_VALID`.

## Canonical CLI examples

PASS example (`fixtures/valid-bundle.json`):

```json
{
	"status": "PASS",
	"verdict": "VALID",
	"code": "SUCCESS_VALID",
	"location": "$.bundle",
	"authorization_status": "AUTHORIZED",
	"runtime_claim_status": "VALID",
	"outcome_linkage_status": "LINKED"
}
```

FAIL example (`fixtures/tampered-bundle.json`):

```json
{
	"status": "FAIL",
	"verdict": "INVALID",
	"code": "HASH_MISMATCH",
	"location": "$.passport_records[1].payload_hash",
	"authorization_status": "AUTHORIZED",
	"runtime_claim_status": "NOT_PRESENT",
	"outcome_linkage_status": "NOT_PRESENT"
}
```

The full verifier output also includes `auditor_findings`, `reasonCodes`, and `nextSteps` for machine and human triage.
