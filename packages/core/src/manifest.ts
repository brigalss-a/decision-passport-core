import type { ChainManifest, PassportRecord } from "./types.js";

export function createManifest(records: PassportRecord[]): ChainManifest {
  if (records.length === 0) {
    return {
      chain_id: "empty-chain",
      record_count: 0,
      first_record_id: "",
      last_record_id: "",
      chain_hash: ""
    };
  }

  return {
    chain_id: records[0].chain_id,
    record_count: records.length,
    first_record_id: records[0].id,
    last_record_id: records[records.length - 1].id,
    chain_hash: records[records.length - 1].record_hash
  };
}
