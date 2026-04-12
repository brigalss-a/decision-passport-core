import { explainTamper, hashCanonical, verifyChain } from "@decision-passport/core";
import type { ChainManifest, PassportRecord } from "@decision-passport/core";
import type {
  AuditorFinding,
  BasicVerifierResult,
  BasicVerificationCheck,
  BasicVerificationReasonCode,
  VerifierCode,
} from "./types.js";

interface DecisionTrailSurface {
  linked_passport_id?: string;
  final_approved_payload?: Readonly<Record<string, unknown>>;
}

interface RuntimeClaimSurface {
  claim_id?: string;
  passport_id?: string;
  nonce?: string;
  issued_at_utc?: string;
  expires_at_utc?: string;
  payload_hash?: string;
  authority_ref?: string;
  claim_status?: string;
  single_use?: boolean;
  guard_version?: string;
}

interface OutcomeBindingSurface {
  outcome_status?: string;
  executor_id?: string;
  executed_at_utc?: string;
  reason_code?: string;
  linked_runtime_claim_id?: string;
  output_reference_hashes?: readonly string[];
  outcome_hash?: string;
}

interface BundleSurface {
  bundle_version: string;
  exported_at_utc: string;
  passport_records: readonly PassportRecord[];
  manifest: ChainManifest;
  decision_trail?: DecisionTrailSurface;
  runtime_claim?: RuntimeClaimSurface;
  outcome_binding?: OutcomeBindingSurface;
  passport_status?: string;
  superseded_by_passport_id?: string;
}

type SemanticStatuses = Pick<
  BasicVerifierResult,
  | "authorization_status"
  | "payload_binding_status"
  | "runtime_claim_status"
  | "outcome_linkage_status"
  | "revocation_status"
  | "supersession_status"
  | "trail_linkage_status"
>;

const DEFAULT_SEMANTIC_STATUSES: SemanticStatuses = {
  authorization_status: "NOT_EVALUATED",
  payload_binding_status: "NOT_PRESENT",
  runtime_claim_status: "NOT_PRESENT",
  outcome_linkage_status: "NOT_PRESENT",
  revocation_status: "NOT_DECLARED",
  supersession_status: "NOT_DECLARED",
  trail_linkage_status: "NOT_PRESENT",
};

export function verifyBasicBundle(bundle: unknown): BasicVerifierResult {
  const schemaFinding = validateBundleShape(bundle);
  if (schemaFinding) {
    return failWith(
      [
        {
          name: "bundle_structure",
          passed: false,
          message: schemaFinding.reason,
        },
      ],
      [schemaFinding],
      mapLegacyReasonCodes([schemaFinding]),
      `Verification failed because ${schemaFinding.reason}.`,
      undefined,
      [schemaFinding.remediation_hint],
    );
  }

  const typedBundle = bundle as BundleSurface;
  if (typedBundle.bundle_version !== "1.4-basic") {
    const isProfileUnsupported = typedBundle.bundle_version.startsWith("1.4-");
    const finding = buildFinding(
      isProfileUnsupported ? "PROFILE_UNSUPPORTED" : "VERSION_UNSUPPORTED",
      "$.bundle_version",
      isProfileUnsupported
        ? `Bundle profile ${typedBundle.bundle_version} is not supported by verifyBasicBundle.`
        : `Bundle version ${typedBundle.bundle_version} is not supported by verifyBasicBundle.`,
      isProfileUnsupported
        ? "Use the verifier that matches the requested 1.4 profile."
        : "Use bundle_version 1.4-basic for this verifier.",
      isProfileUnsupported ? "version" : "version",
    );
    return failWith(
      [
        {
          name: "bundle_version",
          passed: false,
          message: finding.reason,
        },
      ],
      [finding],
      mapLegacyReasonCodes([finding]),
      `Verification failed because ${finding.reason}.`,
      undefined,
      [finding.remediation_hint],
    );
  }

  const records = typedBundle.passport_records;
  const manifest = typedBundle.manifest;

  if (records.length === 0) {
    const finding = buildFinding(
      "SCHEMA_INVALID_FIELD",
      "$.passport_records",
      "Field passport_records must contain at least one record.",
      "Re-export bundle with at least one material action record.",
      "schema",
    );
    return failWith(
      [
        {
          name: "records_present",
          passed: false,
          message: finding.reason,
        },
      ],
      [finding],
      mapLegacyReasonCodes([finding]),
      `Verification failed because ${finding.reason}.`,
      undefined,
      [finding.remediation_hint],
    );
  }

  const checks: BasicVerificationCheck[] = [];
  const findings: AuditorFinding[] = [];

  const chainResult = verifyChain(records);
  checks.push({
    name: "chain_integrity",
    passed: chainResult.valid,
    message: chainResult.error,
  });

  if (!chainResult.valid) {
    // Detailed integrity findings are mapped deterministically from explainTamper.
  }

  const manifestMatch =
    manifest.chain_hash ===
    records[records.length - 1].record_hash;

  checks.push({
    name: "manifest_chain_hash",
    passed: manifestMatch,
    message: manifestMatch ? undefined : "Manifest chain_hash mismatch",
  });

  if (!manifestMatch) {
    findings.push(
      buildFinding(
        "HASH_MISMATCH",
        "$.manifest.chain_hash",
        "Manifest chain_hash does not match the terminal record_hash.",
        "Recompute manifest from immutable records and re-export bundle.",
        "integrity",
      ),
    );
  }

  const { findings: semanticFindings, statuses } = semanticChecks(typedBundle, records);
  findings.push(...semanticFindings);

  const passed = checks.every((c) => c.passed);
  if (passed && semanticFindings.length === 0) {
    const successFinding = buildFinding(
      "SUCCESS_VALID",
      "$.bundle",
      "Bundle passed schema, integrity, ordering, and semantic checks.",
      "Preserve original bundle bytes and checksums for future review.",
      "success",
      "VALID",
    );
    return {
      status: "PASS",
      summary: "Verification passed. Bundle integrity checks succeeded.",
      verdict: successFinding.verdict,
      code: successFinding.code,
      location: successFinding.location,
      reason: successFinding.reason,
      remediation_hint: successFinding.remediation_hint,
      failure_class: successFinding.failure_class,
      auditor_findings: [successFinding],
      checks,
      reasonCodes: [],
      ...statuses,
      nextSteps: [
        "Preserve original bundle bytes and checksums for future review.",
      ],
    };
  }

  const explanation = explainTamper(records, manifest);
  findings.push(...mapTamperFindings(explanation.findings));

  const uniqueFindings = dedupeFindings(findings);
  const reasonCodes = mapLegacyReasonCodes(uniqueFindings);

  if (uniqueFindings.length === 0) {
    uniqueFindings.push(
      buildFinding(
        "BUNDLE_MALFORMED",
        "$.bundle",
        "Verifier could not classify the bundle failure condition.",
        "Validate bundle structure and compare against a known-good fixture.",
        "schema",
      ),
    );
  }

  const primaryFinding = uniqueFindings[0];
  return failWith(
    checks,
    uniqueFindings,
    reasonCodes,
    buildFailSummary(uniqueFindings),
    explanation.findings,
    buildNextSteps(uniqueFindings),
    primaryFinding,
    statuses,
  );
}

function failWith(
  checks: BasicVerificationCheck[],
  findings: AuditorFinding[],
  reasonCodes: BasicVerificationReasonCode[],
  summary: string,
  tamperFindings?: BasicVerifierResult["tamperFindings"],
  nextSteps?: string[],
  primaryFinding?: AuditorFinding,
  semanticStatuses: SemanticStatuses = DEFAULT_SEMANTIC_STATUSES,
): BasicVerifierResult {
  const resolvedPrimary = primaryFinding ?? findings[0] ?? buildFinding(
    "BUNDLE_MALFORMED",
    "$.bundle",
    "Verifier failed without a classified finding.",
    "Validate bundle shape and run verification again.",
    "schema",
  );

  return {
    status: "FAIL",
    summary,
    verdict: resolvedPrimary.verdict,
    code: resolvedPrimary.code,
    location: resolvedPrimary.location,
    reason: resolvedPrimary.reason,
    remediation_hint: resolvedPrimary.remediation_hint,
    failure_class: resolvedPrimary.failure_class,
    auditor_findings: findings,
    checks,
    reasonCodes,
    ...semanticStatuses,
    tamperFindings,
    nextSteps,
  };
}

function validateBundleShape(bundle: unknown): AuditorFinding | null {
  if (!isObject(bundle)) {
    return buildFinding(
      "BUNDLE_MALFORMED",
      "$",
      "Bundle must be a JSON object.",
      "Provide a JSON object with bundle_version, exported_at_utc, passport_records, and manifest.",
      "schema",
    );
  }

  if (!("bundle_version" in bundle)) {
    return buildFinding(
      "SCHEMA_MISSING_FIELD",
      "$.bundle_version",
      "Required field bundle_version is missing.",
      "Add bundle_version and set it to 1.4-basic for this verifier.",
      "schema",
    );
  }

  if (!("exported_at_utc" in bundle)) {
    return buildFinding(
      "SCHEMA_MISSING_FIELD",
      "$.exported_at_utc",
      "Required field exported_at_utc is missing.",
      "Add exported_at_utc in ISO-8601 string format.",
      "schema",
    );
  }

  if (!("passport_records" in bundle)) {
    return buildFinding(
      "SCHEMA_MISSING_FIELD",
      "$.passport_records",
      "Required field passport_records is missing.",
      "Add passport_records as a non-empty array of records.",
      "schema",
    );
  }

  if (!("manifest" in bundle)) {
    return buildFinding(
      "SCHEMA_MISSING_FIELD",
      "$.manifest",
      "Required field manifest is missing.",
      "Add manifest with chain_id, record_count, first_record_id, last_record_id, and chain_hash.",
      "schema",
    );
  }

  if (typeof bundle.bundle_version !== "string") {
    return buildFinding(
      "SCHEMA_INVALID_FIELD",
      "$.bundle_version",
      "Field bundle_version must be a string.",
      "Set bundle_version to a supported string value, such as 1.4-basic.",
      "schema",
    );
  }

  if (typeof bundle.exported_at_utc !== "string") {
    return buildFinding(
      "SCHEMA_INVALID_FIELD",
      "$.exported_at_utc",
      "Field exported_at_utc must be a string.",
      "Set exported_at_utc to an ISO-8601 UTC timestamp string.",
      "schema",
    );
  }

  if (!Array.isArray(bundle.passport_records)) {
    return buildFinding(
      "SCHEMA_INVALID_FIELD",
      "$.passport_records",
      "Field passport_records must be an array.",
      "Set passport_records to an array of passport record objects.",
      "schema",
    );
  }

  if (!isObject(bundle.manifest)) {
    return buildFinding(
      "SCHEMA_INVALID_FIELD",
      "$.manifest",
      "Field manifest must be an object.",
      "Set manifest to an object containing chain metadata fields.",
      "schema",
    );
  }

  const manifest = bundle.manifest;
  if (!("chain_hash" in manifest)) {
    return buildFinding(
      "SCHEMA_MISSING_FIELD",
      "$.manifest.chain_hash",
      "Required field manifest.chain_hash is missing.",
      "Add manifest.chain_hash with the terminal record_hash value.",
      "schema",
    );
  }

  if (typeof manifest.chain_hash !== "string") {
    return buildFinding(
      "SCHEMA_INVALID_FIELD",
      "$.manifest.chain_hash",
      "Field manifest.chain_hash must be a string.",
      "Set manifest.chain_hash to a SHA-256 hex string.",
      "schema",
    );
  }

  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mapTamperFindings(
  findings: readonly { kind: string; recordIndex: number }[],
): AuditorFinding[] {
  const mapped: AuditorFinding[] = [];

  for (const finding of findings) {
    if (finding.kind === "payload_hash" || finding.kind === "record_hash") {
      mapped.push(
        buildFinding(
          "HASH_MISMATCH",
          `$.passport_records[${finding.recordIndex}].payload_hash`,
          "Record payload hash does not match deterministic recomputation.",
          "Rebuild payload and recompute payload_hash and record_hash from canonical record bytes.",
          "integrity",
        ),
      );
    } else if (finding.kind === "prev_hash") {
      mapped.push(
        buildFinding(
          "CHAIN_BROKEN",
          `$.passport_records[${finding.recordIndex}].prev_hash`,
          "Record prev_hash does not match the previous record_hash.",
          "Repair record ordering and prev_hash linkage, then regenerate downstream records.",
          "integrity",
        ),
      );
    } else if (finding.kind === "sequence") {
      mapped.push(
        buildFinding(
          "ORDER_INVALID",
          `$.passport_records[${finding.recordIndex}].sequence`,
          "Record sequence is not strictly gapless from 0..N-1.",
          "Re-index sequence values and regenerate dependent record hashes.",
          "order",
        ),
      );
    } else if (finding.kind === "manifest_chain_hash") {
      mapped.push(
        buildFinding(
          "HASH_MISMATCH",
          "$.manifest.chain_hash",
          "Manifest chain_hash does not match the final record_hash.",
          "Regenerate manifest from the finalized record chain.",
          "integrity",
        ),
      );
    }
  }

  return mapped;
}

function buildFailSummary(findings: AuditorFinding[]): string {
  const parts: string[] = [];

  for (const finding of findings) {
    parts.push(`${finding.code} at ${finding.location}`);
  }

  if (parts.length === 0) {
    return "Verification failed due to an unknown integrity or structure error.";
  }

  return `Verification failed because ${parts.join("; ")}.`;
}

function buildNextSteps(findings: AuditorFinding[]): string[] {
  const steps = new Set<string>();

  for (const finding of findings) {
    steps.add(finding.remediation_hint);
  }

  steps.add("Compare with a known-good bundle artifact if available.");
  return [...steps];
}

function dedupeFindings(findings: AuditorFinding[]): AuditorFinding[] {
  const seen = new Set<string>();
  const deduped: AuditorFinding[] = [];

  for (const finding of findings) {
    const key = `${finding.code}|${finding.location}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(finding);
    }
  }

  const priority: Record<VerifierCode, number> = {
    SUCCESS_VALID: 0,
    BUNDLE_MALFORMED: 1,
    SCHEMA_MISSING_FIELD: 2,
    SCHEMA_INVALID_FIELD: 3,
    VERSION_UNSUPPORTED: 4,
    PROFILE_UNSUPPORTED: 5,
    ORDER_INVALID: 6,
    CHAIN_BROKEN: 7,
    HASH_MISMATCH: 8,
    AUTHORIZATION_EXECUTION_MISMATCH: 9,
    CLAIM_EXPIRED: 10,
    CLAIM_REVOKED: 11,
    CLAIM_NONCE_REUSED: 12,
    CLAIM_PAYLOAD_MISMATCH: 13,
    OUTCOME_MISSING: 14,
    OUTCOME_STATUS_INVALID: 15,
    OUTCOME_LINKAGE_MISMATCH: 16,
    TRAIL_LINKAGE_MISSING: 17,
    TRAIL_PAYLOAD_MISMATCH: 18,
    PASSPORT_REVOKED: 19,
    PASSPORT_SUPERSEDED: 20,
    SEMANTIC_INCONSISTENCY: 21,
  };

  return deduped.sort((a, b) => {
    const byPriority = priority[a.code] - priority[b.code];
    if (byPriority !== 0) {
      return byPriority;
    }
    return a.location.localeCompare(b.location);
  });
}

function mapLegacyReasonCodes(findings: AuditorFinding[]): BasicVerificationReasonCode[] {
  const codes = new Set<BasicVerificationReasonCode>();

  for (const finding of findings) {
    if (finding.code === "VERSION_UNSUPPORTED" || finding.code === "PROFILE_UNSUPPORTED") {
      codes.add("UNSUPPORTED_BUNDLE_VERSION");
    } else if (finding.code === "BUNDLE_MALFORMED") {
      codes.add("MALFORMED_BUNDLE");
    } else if (finding.code === "SCHEMA_MISSING_FIELD" || finding.code === "SCHEMA_INVALID_FIELD") {
      if (finding.location === "$.passport_records") {
        codes.add("EMPTY_OR_MISSING_RECORDS");
      } else {
        codes.add("MALFORMED_BUNDLE");
      }
    } else if (finding.code === "CHAIN_BROKEN") {
      codes.add("CHAIN_INTEGRITY_FAILED");
      codes.add("PREV_HASH_MISMATCH");
    } else if (finding.code === "ORDER_INVALID") {
      codes.add("CHAIN_INTEGRITY_FAILED");
      codes.add("SEQUENCE_MISMATCH");
    } else if (finding.code === "HASH_MISMATCH") {
      if (finding.location === "$.manifest.chain_hash") {
        codes.add("MANIFEST_HASH_MISMATCH");
      } else {
        codes.add("CHAIN_INTEGRITY_FAILED");
        codes.add("PAYLOAD_HASH_MISMATCH");
      }
    } else if (finding.code === "AUTHORIZATION_EXECUTION_MISMATCH" || finding.code === "SEMANTIC_INCONSISTENCY") {
      codes.add("UNKNOWN_VERIFICATION_ERROR");
    } else if (finding.code === "CLAIM_EXPIRED") {
      codes.add("CLAIM_EXPIRED");
    } else if (finding.code === "CLAIM_REVOKED") {
      codes.add("CLAIM_REVOKED");
    } else if (finding.code === "CLAIM_NONCE_REUSED") {
      codes.add("CLAIM_NONCE_REUSED");
    } else if (finding.code === "CLAIM_PAYLOAD_MISMATCH") {
      codes.add("CLAIM_PAYLOAD_MISMATCH");
    } else if (finding.code === "OUTCOME_MISSING") {
      codes.add("OUTCOME_MISSING");
    } else if (finding.code === "OUTCOME_STATUS_INVALID") {
      codes.add("OUTCOME_STATUS_INVALID");
    } else if (finding.code === "OUTCOME_LINKAGE_MISMATCH") {
      codes.add("OUTCOME_LINKAGE_MISMATCH");
    } else if (finding.code === "TRAIL_LINKAGE_MISSING") {
      codes.add("TRAIL_LINKAGE_MISSING");
    } else if (finding.code === "TRAIL_PAYLOAD_MISMATCH") {
      codes.add("TRAIL_PAYLOAD_MISMATCH");
    } else if (finding.code === "PASSPORT_REVOKED") {
      codes.add("PASSPORT_REVOKED");
    } else if (finding.code === "PASSPORT_SUPERSEDED") {
      codes.add("PASSPORT_SUPERSEDED");
    }
  }

  if (codes.size === 0) {
    codes.add("UNKNOWN_VERIFICATION_ERROR");
  }

  return [...codes].sort();
}

function semanticChecks(bundle: BundleSurface, records: readonly PassportRecord[]): {
  findings: AuditorFinding[];
  statuses: SemanticStatuses;
} {
  const findings: AuditorFinding[] = [];
  const statuses: SemanticStatuses = { ...DEFAULT_SEMANTIC_STATUSES };

  const approvalActions = new Set(["HUMAN_APPROVAL_GRANTED", "POLICY_APPROVAL_GRANTED"]);
  const executionActions = new Set([
    "EXECUTION_PENDING",
    "EXECUTION_SUCCEEDED",
    "EXECUTION_FAILED",
    "EXECUTION_ABORTED",
  ]);

  let seenApproval = false;
  let firstExecutionIndex = -1;
  for (let i = 0; i < records.length; i += 1) {
    const action = records[i].action_type;
    if (approvalActions.has(action)) {
      seenApproval = true;
    }
    if (executionActions.has(action) && firstExecutionIndex === -1) {
      firstExecutionIndex = i;
      if (!seenApproval) {
        statuses.authorization_status = "NOT_AUTHORIZED";
        findings.push(
          buildFinding(
            "AUTHORIZATION_EXECUTION_MISMATCH",
            `$.passport_records[${i}].action_type`,
            "Execution action appears before any authorization grant action.",
            "Insert a HUMAN_APPROVAL_GRANTED or POLICY_APPROVAL_GRANTED action before execution.",
            "authorization",
          ),
        );
      } else {
        statuses.authorization_status = "AUTHORIZED";
      }
    }
  }

  if (firstExecutionIndex === -1) {
    statuses.authorization_status = "NOT_EVALUATED";
  }

  const actions = new Set(records.map((r) => r.action_type));
  if (actions.has("HUMAN_APPROVAL_GRANTED") && actions.has("HUMAN_APPROVAL_REJECTED")) {
    findings.push(
      buildFinding(
        "SEMANTIC_INCONSISTENCY",
        "$.passport_records[*].action_type",
        "Chain contains both HUMAN_APPROVAL_GRANTED and HUMAN_APPROVAL_REJECTED actions.",
        "Split contradictory approval outcomes into separate chains or preserve only one terminal approval decision.",
        "semantic",
      ),
    );
  }

  if (actions.has("EXECUTION_SUCCEEDED") && actions.has("EXECUTION_FAILED")) {
    findings.push(
      buildFinding(
        "SEMANTIC_INCONSISTENCY",
        "$.passport_records[*].action_type",
        "Chain contains both EXECUTION_SUCCEEDED and EXECUTION_FAILED actions.",
        "Split conflicting execution outcomes into separate chains or keep one terminal execution outcome.",
        "semantic",
      ),
    );
  }

  const runtimeClaim = bundle.runtime_claim;
  const trail = bundle.decision_trail;
  const outcome = bundle.outcome_binding;

  if (bundle.passport_status === "REVOKED") {
    statuses.revocation_status = "REVOKED";
    findings.push(
      buildFinding(
        "PASSPORT_REVOKED",
        "$.passport_status",
        "Passport is explicitly marked as REVOKED.",
        "Treat this passport as denied and issue a new authorization artifact if execution is still intended.",
        "authorization",
      ),
    );
  } else if (runtimeClaim && runtimeClaim.claim_status) {
    statuses.revocation_status = runtimeClaim.claim_status === "REVOKED" ? "REVOKED" : "CLEAR";
  }

  if (bundle.passport_status === "SUPERSEDED" || typeof bundle.superseded_by_passport_id === "string") {
    statuses.supersession_status = "SUPERSEDED";
    findings.push(
      buildFinding(
        "PASSPORT_SUPERSEDED",
        "$.passport_status",
        "Passport is explicitly marked as SUPERSEDED.",
        "Verify only the newest passport artifact in the supersession chain.",
        "semantic",
      ),
    );
  } else if (bundle.passport_status === "ACTIVE") {
    statuses.supersession_status = "CLEAR";
  }

  if (runtimeClaim) {
    const hasClaimShape = Boolean(
      runtimeClaim.claim_id
      && runtimeClaim.passport_id
      && runtimeClaim.nonce
      && runtimeClaim.issued_at_utc
      && runtimeClaim.expires_at_utc
      && runtimeClaim.payload_hash
      && runtimeClaim.claim_status
      && runtimeClaim.guard_version,
    );

    if (!runtimeClaim.authority_ref) {
      statuses.runtime_claim_status = "MALFORMED";
      findings.push(
        buildFinding(
          "SCHEMA_MISSING_FIELD",
          "$.runtime_claim.authority_ref",
          "Runtime claim is missing authority_ref.",
          "Add authority_ref to the RuntimeClaim before verification.",
          "schema",
        ),
      );
    } else if (!hasClaimShape) {
      statuses.runtime_claim_status = "MALFORMED";
      findings.push(
        buildFinding(
          "SCHEMA_INVALID_FIELD",
          "$.runtime_claim",
          "Runtime claim is present but incomplete for fail-closed evaluation.",
          "Provide all required RuntimeClaim fields before verification.",
          "schema",
        ),
      );
    } else if (runtimeClaim.claim_status === "REVOKED") {
      statuses.runtime_claim_status = "REVOKED";
      statuses.revocation_status = "REVOKED";
      findings.push(
        buildFinding(
          "CLAIM_REVOKED",
          "$.runtime_claim.claim_status",
          "Runtime claim is in REVOKED state.",
          "Issue a new active claim before execution and preserve the revoked claim as audit evidence.",
          "claim",
        ),
      );
    } else if (
      runtimeClaim.claim_status === "EXPIRED"
      || runtimeClaim.expires_at_utc!.localeCompare(bundle.exported_at_utc) < 0
    ) {
      statuses.runtime_claim_status = "EXPIRED";
      findings.push(
        buildFinding(
          "CLAIM_EXPIRED",
          "$.runtime_claim.expires_at_utc",
          "Runtime claim expired before verification could establish valid execution scope.",
          "Issue a new claim with a valid TTL and re-run verification against the new claim.",
          "claim",
        ),
      );
    } else if (runtimeClaim.claim_status === "USED" && runtimeClaim.single_use === true) {
      statuses.runtime_claim_status = "NONCE_REUSED";
      findings.push(
        buildFinding(
          "CLAIM_NONCE_REUSED",
          "$.runtime_claim.nonce",
          "Runtime claim nonce indicates the single-use claim has already been consumed.",
          "Do not reuse a consumed claim nonce; issue a fresh single-use claim.",
          "claim",
        ),
      );
    } else {
      statuses.runtime_claim_status = "VALID";
    }
  }

  if (trail) {
    if (!runtimeClaim) {
      statuses.trail_linkage_status = "MISSING";
      findings.push(
        buildFinding(
          "TRAIL_LINKAGE_MISSING",
          "$.decision_trail.linked_passport_id",
          "DecisionTrail is present but no RuntimeClaim exists to establish bundle linkage.",
          "Provide a RuntimeClaim so trail linkage can be checked deterministically.",
          "trail",
        ),
      );
    } else if (trail.linked_passport_id !== runtimeClaim.passport_id) {
      statuses.trail_linkage_status = "MISSING";
      findings.push(
        buildFinding(
          "TRAIL_LINKAGE_MISSING",
          "$.decision_trail.linked_passport_id",
          "DecisionTrail linked_passport_id does not match runtime_claim.passport_id.",
          "Align DecisionTrail.linked_passport_id with the passport_id carried by RuntimeClaim.",
          "trail",
        ),
      );
    } else {
      statuses.trail_linkage_status = "LINKED";
    }

    if (runtimeClaim?.payload_hash && trail.final_approved_payload) {
      const approvedPayloadHash = hashCanonical(trail.final_approved_payload);
      if (approvedPayloadHash === runtimeClaim.payload_hash) {
        statuses.payload_binding_status = "MATCHED";
      } else {
        statuses.payload_binding_status = "MISMATCH";
        statuses.runtime_claim_status = statuses.runtime_claim_status === "VALID"
          ? "PAYLOAD_MISMATCH"
          : statuses.runtime_claim_status;
        statuses.trail_linkage_status = "PAYLOAD_MISMATCH";
        findings.push(
          buildFinding(
            "CLAIM_PAYLOAD_MISMATCH",
            "$.runtime_claim.payload_hash",
            "Runtime claim payload_hash does not match the canonical hash of decision_trail.final_approved_payload.",
            "Regenerate the RuntimeClaim payload_hash from the approved payload bytes before verification.",
            "claim",
          ),
        );
        findings.push(
          buildFinding(
            "TRAIL_PAYLOAD_MISMATCH",
            "$.decision_trail.final_approved_payload",
            "DecisionTrail final approved payload does not bind to the RuntimeClaim payload_hash.",
            "Use the exact approved payload when issuing the claim and preserve the canonical payload bytes.",
            "trail",
          ),
        );
      }
    } else if (trail.final_approved_payload) {
      statuses.payload_binding_status = "NOT_EVALUATED";
    }
  }

  if (outcome) {
    const validOutcomeStatuses = new Set(["SUCCESS", "DENIED", "FAILED", "ABORTED", "PENDING", "EXPIRED"]);
    if (!validOutcomeStatuses.has(outcome.outcome_status ?? "")) {
      statuses.outcome_linkage_status = "INVALID";
      findings.push(
        buildFinding(
          "OUTCOME_STATUS_INVALID",
          "$.outcome_binding.outcome_status",
          "OutcomeBinding outcome_status is not in the supported finite status set.",
          "Use one of SUCCESS, DENIED, FAILED, ABORTED, PENDING, or EXPIRED.",
          "outcome",
        ),
      );
    } else if (!runtimeClaim) {
      statuses.outcome_linkage_status = "MISMATCH";
      findings.push(
        buildFinding(
          "OUTCOME_LINKAGE_MISMATCH",
          "$.outcome_binding.linked_runtime_claim_id",
          "OutcomeBinding is present but no RuntimeClaim exists to verify claim linkage.",
          "Provide a RuntimeClaim so outcome linkage can be verified deterministically.",
          "outcome",
        ),
      );
    } else if (outcome.linked_runtime_claim_id !== runtimeClaim.claim_id) {
      statuses.outcome_linkage_status = "MISMATCH";
      findings.push(
        buildFinding(
          "OUTCOME_LINKAGE_MISMATCH",
          "$.outcome_binding.linked_runtime_claim_id",
          "OutcomeBinding linked_runtime_claim_id does not match runtime_claim.claim_id.",
          "Align OutcomeBinding with the exact RuntimeClaim used for execution.",
          "outcome",
        ),
      );
    } else {
      statuses.outcome_linkage_status = "LINKED";
    }
  } else if (runtimeClaim) {
    statuses.outcome_linkage_status = "MISSING";
    findings.push(
      buildFinding(
        "OUTCOME_MISSING",
        "$.outcome_binding",
        "RuntimeClaim is present but no OutcomeBinding exists to describe execution result state.",
        "Attach a minimal OutcomeBinding so verification can classify execution result semantics.",
        "outcome",
      ),
    );
  }

  return { findings, statuses };
}

function buildFinding(
  code: VerifierCode,
  location: string,
  reason: string,
  remediationHint: string,
  failureClass: AuditorFinding["failure_class"],
  verdict: AuditorFinding["verdict"] = "INVALID",
): AuditorFinding {
  return {
    verdict,
    code,
    location,
    reason,
    remediation_hint: remediationHint,
    failure_class: failureClass,
  };
}
