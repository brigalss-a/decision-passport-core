# How Decision Passport Works

## The core idea

Every AI agent action produces two things:

1. A **result**: the thing the agent did
2. A **record**: proof that it happened exactly this way

Decision Passport handles the second. Every material action is stamped into an append-only, hash-linked chain. Tamper with any record and every subsequent hash breaks. The chain is self-auditing.

---

## The chain model

```
Record [0]                Record [1]                Record [2]
──────────────────        ──────────────────        ──────────────────
id:           uuid        id:           uuid        id:           uuid
sequence:     0           sequence:     1           sequence:     2
actor_id:     agent-01    actor_id:     alice       actor_id:     agent-01
action_type:  AI_REC...   action_type:  HUMAN_AP..  action_type:  EXEC_SUC..
payload:      {...}        payload:      {...}        payload:      {...}
payload_hash: sha256      payload_hash: sha256      payload_hash: sha256
prev_hash:    GENESIS     prev_hash:    hash[0]     prev_hash:    hash[1]
record_hash:  sha256  ──► record_hash:  sha256  ──► record_hash:  sha256
                                                            │
                                                            ▼
                                                   ChainManifest
                                                   chain_hash = hash[2]
```

### How record_hash is computed

```typescript
const recordWithoutHash = {
  id, chain_id, sequence, timestamp_utc,
  actor_id, actor_type, action_type,
  payload, payload_hash, prev_hash
};

record_hash = SHA-256( canonicalJSON(recordWithoutHash) )
```

Canonical JSON means: keys sorted, no whitespace, deterministic encoding. This eliminates any ambiguity in what gets hashed.

### How verification works

For each record `i`:
1. Recompute `record_hash` from all fields (excluding the stored hash itself)
2. Compare to stored `record_hash` (must match)
3. Confirm `prev_hash` equals `record_hash` of record `i-1` (or `GENESIS` for record 0)
4. Confirm `sequence` equals `i`

If any check fails: `FAIL` with the exact record index and reason.

---

## The bundle

When a session ends, you export a `BasicProofBundle`:

```json
{
  "bundle_version": "1.4-basic",
  "exported_at_utc": "2026-01-15T14:32:00.000Z",
  "passport_records": [...],
  "manifest": {
    "chain_id": "session-001",
    "record_count": 4,
    "first_record_id": "uuid-a",
    "last_record_id": "uuid-d",
    "chain_hash": "sha256:..."
  }
}
```

This bundle is **portable**. It contains everything needed to verify the chain, with no API, database, or cloud dependency.

---

## Independent verification

Anyone with the bundle and the verifier can run:

```bash
node verify-bundle.js ./bundle.json
```

```
PASS ✓  Chain: 4 records, all hashes verified, manifest consistent
```

Or:

```
FAIL ✗  record_hash mismatch at index 2
        Expected: sha256:abc123...
        Got:      sha256:def456...
        → Record was altered after creation
```

The verifier has no dependencies on production systems. It is designed to be run by a third party (an auditor, a regulator, a legal expert) with no access to your infrastructure.

---

## Two-layer architecture

```
Truth layer (immutable)          Operational view (disposable)
───────────────────────          ──────────────────────────────
Append-only chain                Indexed database
Hash-linked records              Query-friendly
Cannot be modified               Can be rebuilt from truth layer
Cannot be deleted                Re-derive anytime
Source of truth                  Cache / convenience layer
```

If the operational database is lost or corrupted, it can be rebuilt from the chain. The truth layer is the authority.

---

## What gets recorded

**Store:**
- Rationale summary
- Decision basis
- Evidence references
- Policy references and version
- Confidence score
- Uncertainty markers

**Do not store:**
- Raw chain-of-thought / hidden reasoning dumps
- Personal data in payload fields (use references, not values)
- Secrets or credentials

---

## Environment and tenant binding

For production deployments, consider binding actions to:
- `environment`: `dev`, `staging`, `prod`
- `tenant_id`
- `region` (for data sovereignty)
- `deployment_id`

These fields can be included in record metadata to help isolate chains per environment and tenant.
