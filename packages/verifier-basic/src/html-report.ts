import type { BasicProofBundle } from "@decision-passport/core";
import type { BasicVerifierResult } from "./types.js";
import type { TamperExplanation } from "@decision-passport/core";

export interface HtmlReportData {
  bundle: BasicProofBundle;
  result: BasicVerifierResult;
  explanation: TamperExplanation;
  generatedAt: string;
}

export function renderVerificationReport(data: HtmlReportData): string {
  const { bundle, result, explanation, generatedAt } = data;
  const status = result.status;
  const statusColor = status === "PASS" ? "#22c55e" : "#ef4444";
  const statusLabel = status === "PASS" ? "PASS" : "FAIL";

  const checksHtml = result.checks
    .map(
      (c) =>
        `<tr>
          <td>${escapeHtml(c.name)}</td>
          <td style="color: ${c.passed ? "#22c55e" : "#ef4444"}">${c.passed ? "PASS" : "FAIL"}</td>
          <td>${c.message ? escapeHtml(c.message) : "&mdash;"}</td>
        </tr>`,
    )
    .join("\n");

  const findingsHtml =
    explanation.findings.length === 0
      ? `<p style="color:#22c55e">No tampering detected.</p>`
      : explanation.findings
          .map(
            (f) =>
              `<tr>
                <td>${f.recordIndex}</td>
                <td><code>${escapeHtml(f.kind)}</code></td>
                <td>${escapeHtml(f.message)}</td>
              </tr>`,
          )
          .join("\n");

  const recordsHtml = bundle.passport_records
    .map(
      (r, i) =>
        `<tr>
          <td>${i}</td>
          <td><code>${escapeHtml(r.id)}</code></td>
          <td>${escapeHtml(r.actor_id)}</td>
          <td>${escapeHtml(r.actor_type)}</td>
          <td>${escapeHtml(r.action_type)}</td>
          <td><code title="${escapeHtml(r.record_hash)}">${escapeHtml(r.record_hash.slice(0, 12))}...</code></td>
        </tr>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Decision Passport &mdash; Verification Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; background: #0f172a; color: #e2e8f0; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  h2 { font-size: 1.125rem; margin: 1.5rem 0 0.75rem; border-bottom: 1px solid #334155; padding-bottom: 0.25rem; }
  .status-card { display: inline-block; padding: 0.5rem 1.5rem; border-radius: 0.5rem; font-size: 1.75rem; font-weight: bold; color: #fff; background: ${statusColor}; margin: 1rem 0; }
  table { width: 100%; border-collapse: collapse; margin: 0.5rem 0; }
  th, td { text-align: left; padding: 0.375rem 0.75rem; border-bottom: 1px solid #1e293b; font-size: 0.875rem; }
  th { color: #94a3b8; font-weight: 600; }
  code { background: #1e293b; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.8125rem; }
  .meta { color: #64748b; font-size: 0.8125rem; margin-top: 2rem; }
  .summary-box { background: #1e293b; padding: 0.75rem 1rem; border-radius: 0.5rem; margin: 0.5rem 0; border-left: 4px solid ${statusColor}; }
</style>
</head>
<body>
  <h1>Decision Passport &mdash; Verification Report</h1>
  <div class="status-card">${statusLabel}</div>

  <h2>Bundle</h2>
  <table>
    <tr><th>Version</th><td>${escapeHtml(bundle.bundle_version)}</td></tr>
    <tr><th>Chain ID</th><td><code>${escapeHtml(bundle.manifest.chain_id)}</code></td></tr>
    <tr><th>Records</th><td>${bundle.passport_records.length}</td></tr>
    <tr><th>Chain Hash</th><td><code>${escapeHtml(bundle.manifest.chain_hash)}</code></td></tr>
    <tr><th>Exported</th><td>${escapeHtml(bundle.exported_at_utc)}</td></tr>
  </table>

  <h2>Checks</h2>
  <table>
    <thead><tr><th>Check</th><th>Result</th><th>Detail</th></tr></thead>
    <tbody>${checksHtml}</tbody>
  </table>

  <h2>Tamper Analysis</h2>
  <div class="summary-box">${escapeHtml(explanation.summary)}</div>
  ${
    explanation.findings.length > 0
      ? `<table>
    <thead><tr><th>Record</th><th>Kind</th><th>Detail</th></tr></thead>
    <tbody>${findingsHtml}</tbody>
  </table>`
      : ""
  }

  <h2>Records</h2>
  <table>
    <thead><tr><th>#</th><th>ID</th><th>Actor</th><th>Type</th><th>Action</th><th>Hash</th></tr></thead>
    <tbody>${recordsHtml}</tbody>
  </table>

  <p class="meta">Generated ${escapeHtml(generatedAt)} by decision-passport verifier-basic</p>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
