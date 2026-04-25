/**
 * Generate autonomous action receipt fixtures for v0.9.0.
 * Run once: pnpm tsx scripts/generate-autonomous-fixtures.ts
 */

import { createRecord, createManifest } from "@decision-passport/core";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "../fixtures/autonomous");
mkdirSync(outputDir, { recursive: true });

function write(name: string, bundle: unknown) {
  writeFileSync(join(outputDir, name), JSON.stringify(bundle, null, 2) + "\n");
  console.log(`✓ ${name}`);
}

const EXPORTED_AT = "2026-04-25T10:00:00.000Z";

// ─── 1. Valid autonomous warehouse robot action ───────────────────────────────

const r1_0 = createRecord({
  chainId: "autonomous-warehouse-robot-001",
  lastRecord: null,
  actorId: "warehouse-robot-WR-7",
  actorType: "ai_agent",
  actionType: "AI_RECOMMENDATION",
  payload: {
    tool_call_phase: "REQUESTED",
    actor: {
      id: "warehouse-robot-WR-7",
      type: "robot",
      modelVersion: "pick-nav-v3.2",
      controllerVersion: "warehouse-os-2.1.0",
    },
    action: {
      name: "pick_and_place",
      actionType: "EXECUTION_PENDING",
      riskClass: "physical_world_action",
      environment: "warehouse-zone-A3",
      zone: "ZONE_A3",
      target: "shelf-bin-A3-042",
      correlationId: "order-78921",
    },
    safetyEnvelope: {
      envelopeId: "env-WR7-20260425",
      policyVersion: "warehouse-safety-v1.4",
      allowedZone: "ZONE_A3",
      maxSpeed: 1.5,
      minHumanDistance: 1.0,
      maxForce: 20.0,
      allowedOperatingMode: "autonomous",
      emergencyStopAvailable: true,
      confidenceThreshold: 0.95,
      constraintsHash: "a3b8f2e1d9c4",
    },
    evidence: {
      sensorSnapshotHash: "sha256:7f3a1b9e2c5d4f8a0e6b3c7d1a5f9e2b4c8d3a6f1e0b5c9d",
      perceptionOutputHash: "sha256:2d8f1a3c6e9b5d7f0a4e8c2b6d9f3a1e5c8b4d7f0e3a9c2",
      simulationScenarioHash: "sha256:9c4d2f8a1b5e3c7d6f0a2e4b8d1f5c3a7e9b2d4f6a0c8e1",
      modelArtifactHash: "sha256:1e5b9d3a7f2c6e4b8d0a1f3c5e7b9d2a4f6c8e0b3d5a7f1",
    },
  },
});

const r1_1 = createRecord({
  chainId: "autonomous-warehouse-robot-001",
  lastRecord: r1_0,
  actorId: "warehouse-safety-policy-v1.4",
  actorType: "policy",
  actionType: "POLICY_APPROVAL_GRANTED",
  payload: {
    tool_call_phase: "AUTHORIZED",
    authorization: {
      approved: true,
      authorizationType: "policy",
      policyVersion: "warehouse-safety-v1.4",
      approvedBy: "safety-controller",
      reason: "Action within approved zone, speed, and force limits",
      decisionId: "auth-WR7-20260425-001",
    },
  },
});

const r1_2 = createRecord({
  chainId: "autonomous-warehouse-robot-001",
  lastRecord: r1_1,
  actorId: "warehouse-robot-WR-7",
  actorType: "ai_agent",
  actionType: "EXECUTION_PENDING",
  payload: {
    tool_call_phase: "EXECUTION_STARTED",
    correlationId: "order-78921",
    target: "shelf-bin-A3-042",
  },
});

const r1_3 = createRecord({
  chainId: "autonomous-warehouse-robot-001",
  lastRecord: r1_2,
  actorId: "warehouse-robot-WR-7",
  actorType: "ai_agent",
  actionType: "EXECUTION_SUCCEEDED",
  payload: {
    tool_call_phase: "SUCCEEDED",
    outcome: {
      status: "SUCCEEDED",
      durationMs: 3400,
      incident: null,
      outcomeEvidenceHash: "sha256:4f8ab8e613f1c399f9bb18ab7e0c383319ffed34318ac70b908b353e31683bf5",
    },
  },
});

const records1 = [r1_0, r1_1, r1_2, r1_3];
write("valid-warehouse-robot-action.json", {
  bundle_version: "1.4-basic" as const,
  exported_at_utc: EXPORTED_AT,
  passport_records: records1,
  manifest: createManifest(records1),
});

// ─── 2. Safety-denied action ──────────────────────────────────────────────────

const r2_0 = createRecord({
  chainId: "autonomous-drone-delivery-002",
  lastRecord: null,
  actorId: "delivery-drone-DD-12",
  actorType: "ai_agent",
  actionType: "AI_RECOMMENDATION",
  payload: {
    tool_call_phase: "REQUESTED",
    actor: {
      id: "delivery-drone-DD-12",
      type: "drone",
      modelVersion: "delivery-nav-v2.0",
      controllerVersion: "flight-os-3.0.1",
    },
    action: {
      name: "fly_to_destination",
      actionType: "EXECUTION_PENDING",
      riskClass: "safety_relevant_physical_action",
      environment: "urban-restricted-airspace",
      zone: "ZONE_RESTRICTED",
      target: "delivery-point-C7",
      correlationId: "delivery-44512",
    },
    safetyEnvelope: {
      envelopeId: "env-DD12-20260425",
      policyVersion: "airspace-safety-v2.1",
      allowedZone: "ZONE_APPROVED_ONLY",
      maxSpeed: 8.0,
      minHumanDistance: 30.0,
      allowedOperatingMode: "autonomous",
      emergencyStopAvailable: true,
      confidenceThreshold: 0.98,
      constraintsHash: "f7c2a8e1b4d9",
    },
    evidence: {
      sensorSnapshotHash: "sha256:3a9f2b7c5d1e8f4a0b6c2d8e3f9a1b5c7d2e4f8a0b3c6d9f",
      perceptionOutputHash: "sha256:8d1f4c9a2e6b3f7a1d5c0e8b4f2a9d3c6e1f4b7a0d5c8e2",
    },
  },
});

const r2_1 = createRecord({
  chainId: "autonomous-drone-delivery-002",
  lastRecord: r2_0,
  actorId: "airspace-safety-policy-v2.1",
  actorType: "policy",
  actionType: "HUMAN_APPROVAL_REJECTED",
  payload: {
    tool_call_phase: "DENIED",
    authorization: {
      approved: false,
      authorizationType: "policy",
      policyVersion: "airspace-safety-v2.1",
      approvedBy: "airspace-controller",
      reason: "Target zone ZONE_RESTRICTED is outside approved flight envelope",
      decisionId: "deny-DD12-20260425-001",
    },
    outcome: {
      status: "DENIED",
      incident: "attempted_restricted_airspace_entry",
      incidentHash: "sha256:1c4e8a2f6d0b3c7e9f1a5d2b8f4c0a6e3d1f9b5c7a2e4d8f",
    },
  },
});

const records2 = [r2_0, r2_1];
write("safety-denied-action.json", {
  bundle_version: "1.4-basic" as const,
  exported_at_utc: EXPORTED_AT,
  passport_records: records2,
  manifest: createManifest(records2),
});

// ─── 3. Safety-blocked action (aborted during execution) ─────────────────────

const r3_0 = createRecord({
  chainId: "autonomous-vehicle-highway-003",
  lastRecord: null,
  actorId: "av-unit-AV-5",
  actorType: "ai_agent",
  actionType: "AI_RECOMMENDATION",
  payload: {
    tool_call_phase: "REQUESTED",
    actor: {
      id: "av-unit-AV-5",
      type: "autonomous_system",
      modelVersion: "highway-nav-v4.1",
      controllerVersion: "drive-os-1.9.3",
    },
    action: {
      name: "lane_change_maneuver",
      actionType: "EXECUTION_PENDING",
      riskClass: "safety_relevant_physical_action",
      environment: "highway-I95-km342",
      zone: "LANE_2_TO_3",
      correlationId: "route-8821",
    },
    safetyEnvelope: {
      envelopeId: "env-AV5-20260425",
      policyVersion: "highway-safety-v3.0",
      maxSpeed: 120.0,
      minHumanDistance: 5.0,
      allowedOperatingMode: "autonomous",
      emergencyStopAvailable: true,
      confidenceThreshold: 0.97,
      constraintsHash: "d2e5f1a8c3b6",
    },
    evidence: {
      sensorSnapshotHash: "sha256:6b2f8d1a9c4e0f3b7d2a6e1c5f9b3a8d0e4f2c6b1a9d3e7f",
      perceptionOutputHash: "sha256:4a9f3b1d6e2c8f5a0d3b7e1c4f8a2d6b9c3e0f4a7d1b5c8",
    },
  },
});

const r3_1 = createRecord({
  chainId: "autonomous-vehicle-highway-003",
  lastRecord: r3_0,
  actorId: "highway-safety-policy-v3.0",
  actorType: "policy",
  actionType: "POLICY_APPROVAL_GRANTED",
  payload: {
    tool_call_phase: "AUTHORIZED",
    authorization: {
      approved: true,
      authorizationType: "policy",
      policyVersion: "highway-safety-v3.0",
      reason: "Lane change within speed/distance envelope at initiation",
      decisionId: "auth-AV5-20260425-001",
    },
  },
});

const r3_2 = createRecord({
  chainId: "autonomous-vehicle-highway-003",
  lastRecord: r3_1,
  actorId: "av-unit-AV-5",
  actorType: "ai_agent",
  actionType: "EXECUTION_PENDING",
  payload: { tool_call_phase: "EXECUTION_STARTED", correlationId: "route-8821" },
});

const r3_3 = createRecord({
  chainId: "autonomous-vehicle-highway-003",
  lastRecord: r3_2,
  actorId: "highway-safety-policy-v3.0",
  actorType: "policy",
  actionType: "EXECUTION_ABORTED",
  payload: {
    tool_call_phase: "ABORTED",
    outcome: {
      status: "SAFETY_BLOCKED",
      incident: "sudden_obstacle_detected_mid_maneuver",
      incidentHash: "sha256:9e1a3d5f8b2c4e7a0d3f6b1c5e9a2d4f7c0b3e6a1d4f7c0",
      durationMs: 180,
    },
    safetyAction: "emergency_abort",
    reason: "Obstacle detected within 2.3m during maneuver; safety system triggered abort",
  },
});

const records3 = [r3_0, r3_1, r3_2, r3_3];
write("safety-blocked-action.json", {
  bundle_version: "1.4-basic" as const,
  exported_at_utc: EXPORTED_AT,
  passport_records: records3,
  manifest: createManifest(records3),
});

// ─── 4. Simulation mismatch ───────────────────────────────────────────────────

const r4_0 = createRecord({
  chainId: "autonomous-industrial-robot-004",
  lastRecord: null,
  actorId: "industrial-arm-IA-3",
  actorType: "ai_agent",
  actionType: "AI_RECOMMENDATION",
  payload: {
    tool_call_phase: "REQUESTED",
    actor: {
      id: "industrial-arm-IA-3",
      type: "robot",
      modelVersion: "welding-v1.8",
      controllerVersion: "arm-os-4.2.1",
    },
    action: {
      name: "precision_weld",
      actionType: "EXECUTION_PENDING",
      riskClass: "physical_world_action",
      environment: "assembly-line-B",
    },
    evidence: {
      simulationScenarioHash: "sha256:simscenario-ORIGINAL-3f8a1b9e2c5d4f8a0e6b3c7d1a5f",
      sensorSnapshotHash: "sha256:7a1b4c9d2e5f3a8b6c0d4e8f1a3b7c2d5e9f0a4b8c3d7e1",
    },
  },
});

const r4_1 = createRecord({
  chainId: "autonomous-industrial-robot-004",
  lastRecord: r4_0,
  actorId: "welding-safety-policy-v1.2",
  actorType: "policy",
  actionType: "POLICY_EXCEPTION",
  payload: {
    tool_call_phase: "DENIED",
    authorization: {
      approved: false,
      authorizationType: "simulation_validated",
      reason:
        "Simulation scenario hash mismatch: runtime environment diverges from validated scenario. Simulation hash at authorization time: sha256:simscenario-MUTATED-xxxxxxxxxxxxxxxx. Expected: sha256:simscenario-ORIGINAL-3f8a1b9e2c5d4f8a0e6b3c7d1a5f",
      decisionId: "deny-IA3-20260425-sim-mismatch",
    },
    outcome: {
      status: "DENIED",
      incident: "simulation_to_real_mismatch",
      incidentHash: "sha256:0b3e7a1f4c8d2a5b9f3c1e6d0a4f8b2c5e9a1d3f7b0c4e8",
    },
  },
});

const records4 = [r4_0, r4_1];
write("simulation-mismatch.json", {
  bundle_version: "1.4-basic" as const,
  exported_at_utc: EXPORTED_AT,
  passport_records: records4,
  manifest: createManifest(records4),
});

// ─── 5. Tampered sensor hash ──────────────────────────────────────────────────
// Start with the valid warehouse robot action, then mutate a payload hash

const r5_0 = createRecord({
  chainId: "autonomous-edge-agent-005",
  lastRecord: null,
  actorId: "edge-agent-EA-9",
  actorType: "ai_agent",
  actionType: "AI_RECOMMENDATION",
  payload: {
    tool_call_phase: "REQUESTED",
    actor: {
      id: "edge-agent-EA-9",
      type: "edge_agent",
      modelVersion: "inspection-v2.5",
    },
    action: {
      name: "equipment_inspection",
      actionType: "EXECUTION_PENDING",
      riskClass: "physical_world_action",
    },
    evidence: {
      sensorSnapshotHash: "sha256:ORIGINAL-sensor-hash-5b3a2d8f1c6e4a9b7d3f0e1c5a8b2d6f",
      perceptionOutputHash: "sha256:8c1a4b7d2e5f9c3a6b0d4e8f2a1b5c9d3e7f0a4b8d2c6e1",
    },
  },
});

const r5_1 = createRecord({
  chainId: "autonomous-edge-agent-005",
  lastRecord: r5_0,
  actorId: "inspection-policy-v1.0",
  actorType: "policy",
  actionType: "POLICY_APPROVAL_GRANTED",
  payload: {
    tool_call_phase: "AUTHORIZED",
    authorization: { approved: true, authorizationType: "policy" },
  },
});

const r5_2 = createRecord({
  chainId: "autonomous-edge-agent-005",
  lastRecord: r5_1,
  actorId: "edge-agent-EA-9",
  actorType: "ai_agent",
  actionType: "EXECUTION_SUCCEEDED",
  payload: {
    tool_call_phase: "SUCCEEDED",
    outcome: { status: "SUCCEEDED", durationMs: 2100 },
  },
});

// Build valid bundle first
const records5 = [r5_0, r5_1, r5_2];
const validBundle5 = {
  bundle_version: "1.4-basic" as const,
  exported_at_utc: EXPORTED_AT,
  passport_records: records5,
  manifest: createManifest(records5),
};

// Tamper: mutate the sensorSnapshotHash inside the first record's payload
// This causes payload_hash mismatch when verified
const tamperedBundle5 = JSON.parse(JSON.stringify(validBundle5));
tamperedBundle5.passport_records[0].payload.evidence.sensorSnapshotHash =
  "sha256:TAMPERED-sensor-hash-0000000000000000000000000000000000000000";
// Note: payload_hash and record_hash are NOT updated — this is the tamper

write("tampered-sensor-hash.json", tamperedBundle5);

console.log("\n✅ All autonomous fixtures generated.");
