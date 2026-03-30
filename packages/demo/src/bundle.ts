import { createManifest } from "@decision-passport/core";
import type { BasicProofBundle, PassportRecord } from "@decision-passport/core";

export function createBasicDemoBundle(records: PassportRecord[]): BasicProofBundle {
  return {
    bundle_version: "1.4-basic",
    exported_at_utc: new Date().toISOString(),
    passport_records: records,
    manifest: createManifest(records)
  };
}
