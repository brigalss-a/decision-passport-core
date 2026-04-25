# Release Notes — Decision Passport Core v0.9.0

## Summary

v0.9.0 introduces the **Autonomous Action Receipt Profile**: a documented pattern and fixture set for creating offline-verifiable receipts for autonomous system actions — warehouse robots, delivery drones, autonomous vehicles, industrial arms, and edge AI agents.

This release adds documentation, fixtures, and tests. No new code packages are introduced. The existing `BasicProofBundle`, `PassportRecord`, and `ActionType` values from v0.7.0/v0.8.x are fully sufficient.

---

## Important Disclaimers

**Decision Passport does not replace functional safety systems.**

**Decision Passport records and verifies which safety envelope, evidence hashes, and authorization claims were bound to an autonomous action.**

Decision Passport is not:
- Certified for autonomous vehicles under ISO 26262 or any safety standard
- A runtime safety enforcement layer
- Integrated with NVIDIA DRIVE, Isaac, Jetson, ROS, or any hardware SDK

---

## What changed in v0.9.0

### New: Autonomous Action Receipt Profile

- `docs/AUTONOMOUS_ACTION_PROFILE.md` — Full profile specification: actor, action, authorization, safetyEnvelope, evidence, and outcome fields; record mapping; example flows; fixture descriptions; disclaimer
- `docs/SIMULATION_TO_EXECUTION_PROFILE.md` — Documents how simulation scenario hashes bind simulation validation to real-world execution authorization

### New: Autonomous Action Fixtures

Five production-style fixtures in `fixtures/autonomous/`:

| Fixture | Description | Verdict |
|---|---|---|
| `valid-warehouse-robot-action.json` | Warehouse robot pick-and-place: authorized, succeeded | PASS |
| `safety-denied-action.json` | Drone denied: restricted airspace | PASS |
| `safety-blocked-action.json` | AV lane change aborted mid-execution by safety system | PASS |
| `simulation-mismatch.json` | Industrial arm denied: simulation hash mismatch | PASS |
| `tampered-sensor-hash.json` | Sensor hash mutated after signing | FAIL (HASH_MISMATCH) |

### New: Example README

- `examples/reference-integrations/autonomous-action-receipt/README.md` — Fixture walkthrough, verification commands, batch verification example

### New: Tests

- `packages/core/tests/autonomous-fixtures.test.ts` — 14 tests covering individual verification, payload semantics, batch verification, and no-external-dependency assertion

### Updated

- `README.md` — Added "Autonomous Action Receipt Profile" section
- `scripts/generate-autonomous-fixtures.ts` — Generation script (run once to regenerate fixtures)

---

## Public profile defined

The Autonomous Action Receipt Profile defines standard payload conventions for:

- `actor` — autonomous system identity
- `action` — action request with risk classification and environment
- `authorization` — policy/human/simulation-validated grant or denial
- `safetyEnvelope` — constraints declared at decision time
- `evidence` — sensor, perception, simulation, and model hash bindings
- `outcome` — execution result with incident hashes

---

## Security boundary

### What Decision Passport proves

- The `sensorSnapshotHash`, `simulationScenarioHash`, and `safetyEnvelope` fields were included in the record at the time it was created
- No field has been silently mutated after creation — verified by `verifyBasicBundle`
- The chain of records is unbroken — no records were inserted, removed, or reordered
- The manifest covers all records in the bundle

### What Decision Passport does NOT prove

- That the sensor data was accurate
- That the safety envelope was appropriate
- That the simulation scenario was valid
- That the autonomous system behaved correctly during execution
- That any hardware or safety system was functioning

---

## Tests

Total tests after v0.9.0: **199** (109 core + 52 verifier-basic + 39 tool-call-wrapper)

New in this release: 14 tests (`packages/core/tests/autonomous-fixtures.test.ts`)

---

## Migration notes

v0.9.0 adds no new code packages. No changes to existing APIs. All v0.8.x integrations continue to work without modification.

---

## Next recommended repositories

- `decision-passport-robotics-lite` — lightweight library for embedding Decision Passport record generation directly in robotics systems
- `decision-passport-mcp` — MCP protocol bridge for autonomous agent decision logging
