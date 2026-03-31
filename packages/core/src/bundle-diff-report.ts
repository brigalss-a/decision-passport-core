import type { BundleDiffResult, BundleDiffFinding } from "./bundle-diff.js";

/**
 * Format a BundleDiffResult as a human-readable text summary.
 *
 * Suitable for terminal output or saving as a .txt artifact.
 */
export function formatDiffText(result: BundleDiffResult): string {
  const lines: string[] = [];

  if (result.identical) {
    lines.push("RESULT: IDENTICAL");
    lines.push("Bundles are identical. No differences found.");
    return lines.join("\n");
  }

  lines.push("RESULT: DIFFERS");
  lines.push(`Summary: ${result.summary}`);
  lines.push(`Findings: ${result.findings.length}`);
  lines.push("");

  for (const finding of result.findings) {
    const icon = findingIcon(finding);
    lines.push(`  [${icon}] ${finding.path}`);
    lines.push(`       ${finding.message}`);
    if (finding.before !== undefined)
      lines.push(`       before: ${JSON.stringify(finding.before)}`);
    if (finding.after !== undefined)
      lines.push(`       after:  ${JSON.stringify(finding.after)}`);
  }

  return lines.join("\n");
}

/**
 * Format a BundleDiffResult as a machine-readable JSON object.
 *
 * Suitable for programmatic consumption or saving as a .json artifact.
 */
export function formatDiffJson(result: BundleDiffResult): object {
  return {
    identical: result.identical,
    summary: result.summary,
    finding_count: result.findings.length,
    findings: result.findings.map((f) => ({
      kind: f.kind,
      path: f.path,
      message: f.message,
      ...(f.before !== undefined ? { before: f.before } : {}),
      ...(f.after !== undefined ? { after: f.after } : {}),
    })),
  };
}

function findingIcon(finding: BundleDiffFinding): string {
  switch (finding.kind) {
    case "record_added": return "+";
    case "record_removed": return "-";
    default: return "~";
  }
}
