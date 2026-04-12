# Schema and Versioning

## Current bundle version

The release-track protocol uses a single bundle format:

```text
bundle_version: "1.4-basic"
```

This version string appears in every `BasicProofBundle` and is checked by `verifyBasicBundle()`.

The OpenClaw Lite variant uses:

```text
bundle_version: "1.4-openclaw-lite"
```

Both formats share the same `PassportRecord` and `ChainManifest` structures.

---

## v0.7.0 schema scope lock

For v0.7.0, schema expansion is core-first and constrained to trust-critical semantics.

Planned primary schema additions:

1. DecisionTrail
2. RuntimeClaim
3. OutcomeBinding
4. extended verifier result semantics for authorization, runtime claim, and outcome linkage states

Scope boundaries for v0.7.0:

1. no hosted runtime executor semantics in this release line
2. no enterprise-only control plane schema in this repository
3. no broad signing/profile schema expansion without complete fixture and verifier support

Normative source for v0.7.0 model semantics remains decision-passport-core.

---

## Bundle structure

A `BasicProofBundle` contains:

| Field | Type | Description |
| --- | --- | --- |
| `bundle_version` | `"1.4-basic"` | Format identifier |
| `exported_at_utc` | ISO 8601 string | Export timestamp |
| `passport_records` | `PassportRecord[]` | Ordered hash chain |
| `manifest` | `ChainManifest` | Chain summary |

---

## Record structure

Each `PassportRecord` contains:

| Field | Type | Required |
| --- | --- | --- |
| `id` | UUID string | Yes |
| `chain_id` | string | Yes |
| `sequence` | integer (0-based) | Yes |
| `timestamp_utc` | ISO 8601 string | Yes |
| `actor_id` | string | Yes |
| `actor_type` | `"human"` / `"ai_agent"` / `"system"` / `"policy"` | Yes |
| `action_type` | ActionType enum | Yes |
| `payload` | object | Yes |
| `payload_hash` | SHA-256 hex string | Yes |
| `prev_hash` | SHA-256 hex string or GENESIS hash | Yes |
| `record_hash` | SHA-256 hex string | Yes |
| `metadata` | object | No |

---

## Manifest structure

A `ChainManifest` contains:

| Field | Type | Description |
| --- | --- | --- |
| `chain_id` | string | Matches all records |
| `record_count` | integer | Number of records |
| `first_record_id` | UUID string | First record |
| `last_record_id` | UUID string | Last record |
| `chain_hash` | SHA-256 hex string | `record_hash` of the last record |

---

## Deterministic hashing

All hashes are computed using SHA-256 over canonical JSON.

Canonical serialisation rules:

- Object keys are sorted lexicographically
- No whitespace between tokens
- Strings are JSON-escaped
- Numbers use standard representation (`-0` normalised to `0`)
- Non-finite numbers (`NaN`, `Infinity`) throw an error
- `null` and `undefined` serialise as `"null"`
- Arrays and objects are recursively serialised

`payload_hash` = SHA-256 of `canonicalSerialize(payload)`

`record_hash` = SHA-256 of `canonicalSerialize(record_without_record_hash)`

The excluded field is only `record_hash` itself. All other fields (including `payload_hash` and `prev_hash`) are included in the hash input.

---

## Schema evolution

### Compatible changes (non-breaking)

- Adding new optional fields to `PassportRecord.metadata`
- Adding new `ActionType` values
- Adding new optional top-level fields to the bundle

These changes preserve backward compatibility. Existing verifiers will ignore unknown fields.

### Breaking changes

- Removing or renaming required fields
- Changing field types
- Changing the canonical serialisation algorithm
- Changing the hash algorithm
- Changing the `bundle_version` string

Breaking changes require:

1. A new `bundle_version` value
2. A documented migration path
3. Updated verifiers that handle both old and new versions

### Current status

The `1.4-basic` format is on the release track. The schema is stable for current use but may evolve before a 1.0 release. Breaking changes will be documented in the CHANGELOG and will increment the version in line with `docs/verifier-compatibility-promise.md`.

---

## JSON Schemas

Machine-readable JSON Schema files are available at:

- [`docs/json-schema/bundle.schema.json`](json-schema/bundle.schema.json)
- [`docs/json-schema/manifest.schema.json`](json-schema/manifest.schema.json)
- [`docs/json-schema/record.schema.json`](json-schema/record.schema.json)

These schemas reflect the current `1.4-basic` format and can be used for validation in any JSON Schema-compatible tool.

Additional v0.7.0 schema tracks:

- [`docs/json-schema/decision-trail.schema.json`](json-schema/decision-trail.schema.json)
- [`docs/json-schema/verification-result.schema.json`](json-schema/verification-result.schema.json)
- [`docs/json-schema/runtime-claim.schema.json`](json-schema/runtime-claim.schema.json)
- [`docs/json-schema/outcome-binding.schema.json`](json-schema/outcome-binding.schema.json)
