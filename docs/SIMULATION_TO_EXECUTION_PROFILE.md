# Simulation-to-Execution Profile

> Part of Decision Passport Core v0.9.0

---

## Overview

The Simulation-to-Execution Profile documents how to use Decision Passport to create an auditable, offline-verifiable link between a simulation-validated scenario and a real-world execution authorization.

This pattern is relevant for any system where an action is:

1. Validated in simulation before deployment
2. Authorized for real-world execution only if the runtime scenario matches the validated simulation
3. Denied if the simulation hash cannot be reproduced at authorization time

---

## The Problem

In AI-driven autonomous systems, policy approval may depend on the assumption that the runtime environment matches the scenario that was validated in simulation. Without a verifiable link, there is no offline record of:

- Which simulation was used for validation
- Whether the runtime scenario matched
- Why authorization was granted or denied

---

## How Decision Passport binds simulation to execution

1. At simulation time, hash the full simulation scenario specification:
   ```
   simulationScenarioHash = sha256(JSON.stringify(scenarioSpec))
   ```

2. Include the hash in the authorization request payload:
   ```json
   {
     "evidence": {
       "simulationScenarioHash": "sha256:9c4d2f8a1b5e3c7d6f0a2e4b8d1f5c3a7e9b2d4f6a0c8e1"
     }
   }
   ```

3. At authorization time, the policy/safety system:
   - Recomputes or retrieves the validated scenario hash
   - Compares against the runtime scenario hash
   - Grants `POLICY_APPROVAL_GRANTED` if they match
   - Denies with `POLICY_EXCEPTION` if they do not match, recording both hashes in the denial reason

4. All of this is signed into a `PassportRecord` and sealed in a `BasicProofBundle`

---

## Record chain

### On match (authorization granted)

```
AI_RECOMMENDATION
  evidence.simulationScenarioHash: "sha256:VALIDATED-HASH"
  safetyEnvelope: { ... }

POLICY_APPROVAL_GRANTED
  authorization.reason: "Simulation scenario verified"
  authorization.authorizationType: "simulation_validated"
```

### On mismatch (authorization denied)

```
AI_RECOMMENDATION
  evidence.simulationScenarioHash: "sha256:ORIGINAL-HASH"

POLICY_EXCEPTION
  authorization.reason: "Simulation hash mismatch: runtime sha256:RUNTIME-HASH != validated sha256:ORIGINAL-HASH"
  authorization.authorizationType: "simulation_validated"
  outcome.incident: "simulation_to_real_mismatch"
```

---

## Example fixture

`fixtures/autonomous/simulation-mismatch.json` — 2-record chain:

- Record 0: `AI_RECOMMENDATION` — industrial arm requests weld action, includes `simulationScenarioHash`
- Record 1: `POLICY_EXCEPTION` — denied because runtime scenario hash differs from validated scenario

Both records are structurally valid. `verifyBasicBundle` returns `PASS` — the denial itself is correctly recorded and signed.

---

## Key properties

| Property | Value |
|---|---|
| Hash function | sha256 (user's responsibility to compute and include) |
| Verification scope | Chain integrity + manifest hash — Decision Passport does not re-evaluate the simulation |
| Mismatch handling | The denial is a valid receipt — it records the mismatch permanently |
| Offline verification | Fully offline — no simulation engine required to verify the receipt |

---

## What Decision Passport does NOT do in this profile

- Decision Passport does not run simulations
- Decision Passport does not compare simulation hashes at verification time
- Decision Passport does not validate that the scenario specification is correct
- Decision Passport does not access physics engines, simulation backends, or digital twins
- The quality of the simulation is entirely outside Decision Passport's scope

Decision Passport records and verifies **that a simulation hash was included in the authorization request**, and **that the authorization record has not been tampered with**. Nothing more.

---

## Use cases

- Autonomous vehicle validation workflows where simulation-to-real gap is a safety concern
- Industrial robot re-certification after environment changes
- Drone flight envelope pre-validation
- Any AI system where policy depends on scenario-matching between simulation and deployment
