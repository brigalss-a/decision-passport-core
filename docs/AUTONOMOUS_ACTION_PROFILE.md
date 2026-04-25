# Autonomous Action Receipt Profile

> Part of Decision Passport Core v0.9.0

---

## Important Disclaimers

**Decision Passport does not replace functional safety systems.**

**Decision Passport records and verifies which safety envelope, evidence hashes, and authorization claims were bound to an autonomous action.**

Decision Passport is not:
- Certified for autonomous vehicles under ISO 26262 or any other safety standard
- A runtime safety enforcement layer
- A vehicle control system or robot controller
- A replacement for validated safety-critical software
- Integrated with NVIDIA DRIVE, Isaac, Jetson, ROS, or any hardware SDK

---

## Overview

The Autonomous Action Receipt Profile defines how to use `BasicProofBundle` and `PassportRecord` to create offline-verifiable receipts for autonomous system actions: warehouse robots, delivery drones, autonomous vehicles, industrial arms, edge AI agents, and other physical-world AI systems.

The profile is documentation and fixtures only. It uses the existing `ActionType` values from Decision Passport Core.

---

## What this profile makes provable

For any autonomous action:

1. **Which sensor/context evidence hashes** were bound to the decision
2. **Which safety envelope constraints** (zone, speed, force, confidence) were declared
3. **What authorization claim** was granted or denied
4. **Whether a simulation scenario hash** was included at authorization time
5. **What outcome** was recorded (succeeded, failed, aborted, denied, safety-blocked)
6. **Chain integrity** — none of the above can be silently mutated without breaking verification

---

## Profile fields

### actor

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier for the autonomous agent |
| `type` | `"autonomous_system" \| "robot" \| "vehicle" \| "drone" \| "edge_agent" \| "ai_agent"` | System category |
| `modelVersion` | `string` | AI/ML model version |
| `controllerVersion` | `string` | Runtime controller version |

### action

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Action name |
| `actionType` | `ActionType` | Decision Passport action type |
| `riskClass` | `"software" \| "physical_world_action" \| "safety_relevant_physical_action"` | Risk classification |
| `environment` | `string` | Operating environment |
| `zone` | `string` | Physical zone or area |
| `target` | `string` | Target object or location |
| `correlationId` | `string` | Correlation to external request/order |

### authorization

| Field | Type | Description |
|---|---|---|
| `approved` | `boolean` | Whether authorization was granted |
| `authorizationType` | `"policy" \| "human" \| "safety_system" \| "simulation_validated" \| "none"` | Authorization source |
| `policyVersion` | `string` | Safety or operational policy version |
| `approvedBy` | `string` | Approving authority ID |
| `reason` | `string` | Human-readable reason |
| `decisionId` | `string` | Correlation ID for the authorization decision |

### safetyEnvelope

| Field | Type | Description |
|---|---|---|
| `envelopeId` | `string` | Unique envelope identifier |
| `policyVersion` | `string` | Policy version the envelope was generated from |
| `allowedZone` | `string` | Authorized operating zone |
| `maxSpeed` | `number` | Maximum allowed speed (m/s) |
| `minHumanDistance` | `number` | Minimum human separation distance (m) |
| `maxForce` | `number` | Maximum allowed force (N) |
| `allowedOperatingMode` | `string` | Operating mode |
| `emergencyStopAvailable` | `boolean` | Whether an emergency stop is reachable |
| `confidenceThreshold` | `number` | Minimum perception confidence required |
| `constraintsHash` | `string` | Hash of the full constraints document |

### evidence

| Field | Type | Description |
|---|---|---|
| `sensorSnapshotHash` | `string` | Hash of sensor snapshot at decision time |
| `perceptionOutputHash` | `string` | Hash of perception/model output |
| `simulationScenarioHash` | `string` | Hash of the simulation scenario used for validation |
| `mapVersionHash` | `string` | Hash of the map/environment version |
| `modelArtifactHash` | `string` | Hash of the deployed AI model artifact |
| `operatorCommandHash` | `string` | Hash of operator command input |
| `environmentSnapshotHash` | `string` | Hash of full environment state |

### outcome

| Field | Type | Description |
|---|---|---|
| `status` | `"SUCCEEDED" \| "FAILED" \| "ABORTED" \| "DENIED" \| "SAFETY_BLOCKED"` | Final outcome |
| `durationMs` | `number` | Action duration in milliseconds |
| `incident` | `string \| null` | Incident identifier |
| `incidentHash` | `string` | Hash of incident report |
| `outcomeEvidenceHash` | `string` | Hash of outcome evidence |

---

## Record mapping

Autonomous actions map to existing `ActionType` values:

| Lifecycle phase | ActionType used | Notes |
|---|---|---|
| System requests action | `AI_RECOMMENDATION` | Full profile payload |
| Policy grants authorization | `POLICY_APPROVAL_GRANTED` | Safety envelope + authorization |
| Human grants authorization | `HUMAN_APPROVAL_GRANTED` | Human-in-the-loop approval |
| Policy/system denies | `HUMAN_APPROVAL_REJECTED` or `POLICY_EXCEPTION` | Reason + incident |
| Execution starts | `EXECUTION_PENDING` | Correlation ID |
| Execution succeeds | `EXECUTION_SUCCEEDED` | Outcome evidence |
| Execution fails | `EXECUTION_FAILED` | Error + incident hash |
| Safety system aborts | `EXECUTION_ABORTED` | Safety action + reason |

---

## Example flows

### 1. Successful warehouse robot action (4 records)

```
AI_RECOMMENDATION     → robot requests pick-and-place
POLICY_APPROVAL_GRANTED → safety policy approves within envelope
EXECUTION_PENDING     → execution starts
EXECUTION_SUCCEEDED   → action completed, outcome evidence hash recorded
```

### 2. Safety-denied action (2 records)

```
AI_RECOMMENDATION     → drone requests flight to restricted zone
HUMAN_APPROVAL_REJECTED → policy denies: outside approved flight envelope
```

### 3. Safety-blocked during execution (4 records)

```
AI_RECOMMENDATION     → vehicle requests lane change
POLICY_APPROVAL_GRANTED → approved within envelope at initiation
EXECUTION_PENDING     → execution starts
EXECUTION_ABORTED     → obstacle detected mid-maneuver, safety abort triggered
```

### 4. Simulation mismatch denial (2 records)

```
AI_RECOMMENDATION     → industrial arm requests weld action
POLICY_EXCEPTION      → denied: runtime scenario hash differs from validated simulation
```

---

## Fixtures

Located in `fixtures/autonomous/`:

| File | Description | Expected verdict |
|---|---|---|
| `valid-warehouse-robot-action.json` | Warehouse robot pick-and-place, authorized and succeeded | PASS |
| `safety-denied-action.json` | Drone flight denied: restricted zone | PASS (denial is a valid receipt) |
| `safety-blocked-action.json` | AV lane change aborted mid-execution by safety system | PASS |
| `simulation-mismatch.json` | Industrial arm denied: simulation hash mismatch | PASS |
| `tampered-sensor-hash.json` | Sensor hash mutated after signing | FAIL (HASH_MISMATCH) |

All 4 valid fixtures produce `PASS` from `verifyBasicBundle`.
The tampered fixture produces `FAIL` with code `HASH_MISMATCH`.

---

## Tests

`packages/core/tests/autonomous-fixtures.test.ts` — 14 tests:

- Each valid fixture verifies as PASS
- Tampered fixture verifies as FAIL with HASH_MISMATCH
- Payload semantic checks (record counts, action types, denial reasons)
- Batch verification of all fixtures
- No network/hardware dependency assertion

---

## What this does NOT prove

- Decision Passport does not make autonomous systems safe
- Decision Passport is not certified for autonomous vehicles under ISO 26262, IEC 61508, or any other safety standard
- Decision Passport does not control robots, vehicles, or drones
- Decision Passport does not integrate with NVIDIA DRIVE, Isaac, Jetson, ROS, or any sensor hardware
- Decision Passport does not replace in-vehicle safety monitors, watchdog circuits, or real-time safety controllers
- The evidence hashes in a passport record are only as trustworthy as the system that generated them

---

## Recommended next steps

After this profile:
- `decision-passport-robotics-lite` — lightweight library for embedding Decision Passport record generation in robotics systems
- `decision-passport-mcp` — MCP protocol bridge for autonomous agent decision logging
- Extended verifier semantics for autonomous-specific action types
