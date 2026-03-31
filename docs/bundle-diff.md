# Bundle Diff

The `diffBundles()` function compares two `BasicProofBundle` objects and returns a structured report of all differences.

---

## When to use it

- Comparing a locally-held bundle against a received copy to detect modifications
- Auditing whether a bundle was altered between export and delivery
- Comparing bundles across protocol versions or migration boundaries
- Generating a machine-readable diff artifact for an audit trail

---

## CLI usage

```bash
# Human-readable text output (exits 0 if identical, 1 if differs)
pnpm diff-bundles fixtures/valid-bundle.json fixtures/tampered-bundle.json

# Machine-readable JSON output
pnpm diff-bundles --json fixtures/valid-bundle.json fixtures/tampered-bundle.json
```

### Generate committed example artifacts

```bash
pnpm diff-artifacts
# Writes docs/examples/bundle-diff-report.json
# Writes docs/examples/bundle-diff-report.txt
```

---

## API usage

```typescript
import { diffBundles, formatDiffText, formatDiffJson } from "@decision-passport/core";

const result = diffBundles(bundleA, bundleB);

if (result.identical) {
  console.log("Bundles are identical.");
} else {
  console.log(formatDiffText(result));           // human-readable
  const obj = formatDiffJson(result);            // machine-readable object
}
```

---

## What is detected

| Finding kind | Meaning |
| --- | --- |
| `record_added` | A record appears in B but not in A |
| `record_removed` | A record appears in A but not in B |
| `record_changed` | A record exists in both but a field differs (payload, hashes, actor, etc.) |
| `manifest_changed` | A manifest field differs (chain_hash, record_count, etc.) |
| `metadata_changed` | A top-level bundle field differs (bundle_version, exported_at_utc) |

Each finding includes `path`, `message`, and optionally `before` / `after` values.

---

## Example output

### Text (from `pnpm diff-bundles`)

```
✗ 1 difference(s) found: 1 field change(s).

  [~] records[id=20a5542b-...].payload
       Record 1 payload differs
       before: {"approved_recommendation_id":"...","note":"Reviewed and approved"}
       after:  {"approved_recommendation_id":"...","note":"TAMPERED — approval was forged"}
```

### JSON (from `pnpm diff-bundles --json`)

```json
{
  "identical": false,
  "summary": "1 difference(s) found: 1 field change(s).",
  "finding_count": 1,
  "findings": [
    {
      "kind": "record_changed",
      "path": "records[id=20a5542b-...].payload",
      "message": "Record 1 payload differs",
      "before": { "note": "Reviewed and approved" },
      "after":  { "note": "TAMPERED — approval was forged" }
    }
  ]
}
```

Full committed examples: [`docs/examples/bundle-diff-report.json`](examples/bundle-diff-report.json) · [`docs/examples/bundle-diff-report.txt`](examples/bundle-diff-report.txt)

---

## What diff does NOT verify

`diffBundles()` compares field values structurally. It does **not** re-verify cryptographic hashes.

To verify hash integrity **and** detect tampering in a single bundle, use `verifyBasicBundle()` or the [browser verifier](../apps/verifier-web/index.html).

To detect structural differences **between two bundles**, use `diffBundles()`.

Both can be used together: verify each bundle first, then diff them to understand exactly what changed.

---

## Return type

```typescript
interface BundleDiffResult {
  identical: boolean;
  findings: BundleDiffFinding[];
  summary: string;
}
```
