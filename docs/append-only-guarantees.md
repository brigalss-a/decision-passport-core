# Append-Only Guarantees and Limits

Decision Passport is designed as an **append-only protocol** at the API and verification
level. This document explains exactly what that means, what is guaranteed, what is
detected, and what is explicitly outside the scope of these public repos.

---

## What "append-only" means here

| Level | Guarantee |
| --- | --- |
| **Record** | Once a `PassportRecord` is created, no supported API modifies it in place. |
| **Chain** | A chain grows only by appending a new record whose `prev_hash` points to the prior `record_hash`. |
| **Bundle** | A bundle is a snapshot export of the chain at a point in time. Verification fails if any record changes after export. |

---

## What the protocol guarantees

**No mutation API exists.** `createRecord()` only creates new records. There is no
`updateRecord()`, `patchRecord()`, `deleteRecord()`, or `reorderChain()` function in
the public API.

**Records are typed as readonly.** The `PassportRecord`, `ChainManifest`, and
`BasicProofBundle` interfaces use `readonly` fields throughout. Consumer code receives
immutable-by-type records.

**Every record commits to the prior state.** Each record's `prev_hash` field contains
the `record_hash` of the preceding record (or `GENESIS_HASH` for the first). Any break
in this chain is detected by `verifyChain()`.

**Verification is deterministic and hash-based.** `verifyChain()` recomputes every
`payload_hash` and `record_hash` from scratch and compares against stored values.
`verifyBasicBundle()` additionally checks that the manifest `chain_hash` matches the
terminal record hash.

---

## What verification detects

`verifyChain()` and `verifyBasicBundle()` will return `FAIL` for any of the following:

| Mutation | Detected by |
| --- | --- |
| Payload content changed | `record_hash` mismatch |
| `prev_hash` changed | explicit `prev_hash` check |
| `record_hash` changed without payload change | `record_hash` recomputation |
| Sequence number altered | explicit `sequence` check |
| Record removed from chain | `prev_hash` mismatch on subsequent record |
| Records reordered | `sequence` and `prev_hash` mismatch |
| Forged record inserted in the middle | `prev_hash` mismatch |
| Manifest `chain_hash` changed | manifest check in `verifyBasicBundle()` |

See also: [schema-versioning.md](./schema-versioning.md) for exact hash computation rules.

---

## What "append-only" does NOT mean here

These public repos implement a **protocol-level** append-only design. They do not
implement and do not claim:

- **Operating-system write protection** — bundle files on disk can be overwritten.
- **WORM storage** — no underlying storage layer is managed by these libraries.
- **Database trigger immutability** — no database is involved.
- **Legally or forensically irreversible persistence** — persistence guarantees require
  infrastructure outside this library.

If you need storage-level immutability, you must layer that on top: write bundles to
append-only object storage, sign them with a timestamping authority, or store them in
an audited log system. That is an integration concern, not a library concern.

---

## Bundles are snapshots

A bundle is a **snapshot export** of a chain at a specific moment. It is not a live,
mutable working document.

- Appending more records after export produces a **new bundle** with an updated manifest.
- The prior bundle remains valid as a historical snapshot of the chain at that point.
- Mixing records from different snapshots without re-running `createManifest()` will
  produce a bundle whose manifest no longer matches the record list.

---

## Summary

| Claim | Status |
| --- | --- |
| No mutation API in public exports | **True** |
| Records typed as readonly | **True** |
| Tamper detectable by verification | **True** |
| Storage-level immutability | **Out of scope** |
| OS or DB write protection | **Out of scope** |
