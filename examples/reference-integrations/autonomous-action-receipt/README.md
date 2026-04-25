# Autonomous Action Receipt — Reference Integration

> Decision Passport Core v0.9.0

---

## What this demonstrates

This reference integration demonstrates the Autonomous Action Receipt Profile: offline-verifiable receipts for autonomous system actions (robots, vehicles, drones, industrial arms, edge agents) using existing Decision Passport Core `BasicProofBundle` and `PassportRecord` types.

No new SDK is required. These are documentation fixtures that use the standard v0.7.0 bundle format.

---

## Fixtures

Located in `fixtures/autonomous/` at the repo root:

### `valid-warehouse-robot-action.json`

**Scenario**: Warehouse robot WR-7 requests a pick-and-place action.  
**Chain**: `AI_RECOMMENDATION` → `POLICY_APPROVAL_GRANTED` → `EXECUTION_PENDING` → `EXECUTION_SUCCEEDED`  
**Includes**: Safety envelope (zone, speed, force limits), sensor/perception/simulation evidence hashes.  
**Expected**: `PASS`

### `safety-denied-action.json`

**Scenario**: Delivery drone DD-12 requests flight to restricted airspace.  
**Chain**: `AI_RECOMMENDATION` → `HUMAN_APPROVAL_REJECTED`  
**Notes**: A denial is a valid receipt. The bundle records that the action was requested and denied. `verifyBasicBundle` returns `PASS` — the record is correct and untampered.  
**Expected**: `PASS`

### `safety-blocked-action.json`

**Scenario**: AV unit AV-5 begins an authorized lane change maneuver on a highway. Mid-execution, the safety system detects an obstacle and triggers an emergency abort.  
**Chain**: `AI_RECOMMENDATION` → `POLICY_APPROVAL_GRANTED` → `EXECUTION_PENDING` → `EXECUTION_ABORTED`  
**Notes**: Abort-during-execution is a valid receipt. The safety abort is signed into the chain.  
**Expected**: `PASS`

### `simulation-mismatch.json`

**Scenario**: Industrial arm IA-3 requests a precision weld action. The authorization policy denies because the runtime scenario hash does not match the validated simulation scenario hash.  
**Chain**: `AI_RECOMMENDATION` → `POLICY_EXCEPTION`  
**Notes**: The denial records both the expected and actual scenario hashes in the reason field.  
**Expected**: `PASS`

### `tampered-sensor-hash.json`

**Scenario**: Same edge agent action as above, but the `sensorSnapshotHash` field in the first record's payload has been mutated after signing.  
**Expected**: `FAIL` with code `HASH_MISMATCH`

---

## Verify fixtures

### Single fixture

```typescript
import { verifyBasicBundle } from "@decision-passport/verifier-basic";
import { readFileSync } from "node:fs";

const bundle = JSON.parse(
  readFileSync("fixtures/autonomous/valid-warehouse-robot-action.json", "utf8")
);
const result = verifyBasicBundle(bundle);
console.log(result.status); // "PASS"
```

### Batch verify all valid fixtures

```typescript
import { verifyBundleBatch } from "@decision-passport/verifier-basic";
import { readFileSync } from "node:fs";

const fixtures = [
  "valid-warehouse-robot-action.json",
  "safety-denied-action.json",
  "safety-blocked-action.json",
  "simulation-mismatch.json",
];

const bundles = fixtures.map((f) =>
  JSON.parse(readFileSync(`fixtures/autonomous/${f}`, "utf8"))
);

const report = verifyBundleBatch(bundles, { label: "autonomous-fixtures" });
console.log(report.passedCount); // 4
console.log(report.failedCount); // 0
```

### Verify tampered fixture fails

```typescript
import { verifyBasicBundle } from "@decision-passport/verifier-basic";
import { readFileSync } from "node:fs";

const bundle = JSON.parse(
  readFileSync("fixtures/autonomous/tampered-sensor-hash.json", "utf8")
);
const result = verifyBasicBundle(bundle);
console.log(result.status); // "FAIL"
console.log(result.code);   // "HASH_MISMATCH"
```

---

## Regenerate fixtures

```
pnpm tsx scripts/generate-autonomous-fixtures.ts
```

---

## Tests

```
pnpm --filter @decision-passport/core test
```

See `packages/core/tests/autonomous-fixtures.test.ts` — 14 tests.

---

## Important disclaimers

**Decision Passport does not replace functional safety systems.**

**Decision Passport records and verifies which safety envelope, evidence hashes, and authorization claims were bound to an autonomous action.**

See `docs/AUTONOMOUS_ACTION_PROFILE.md` for the full profile specification and disclaimer.
