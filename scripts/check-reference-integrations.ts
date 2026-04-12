import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function run(command: string, args: string[]): void {
  const shouldUseCmd = process.platform === "win32"
    && !command.includes("\\")
    && !command.includes("/")
    && !command.toLowerCase().endsWith(".exe");
  const resolvedCommand = shouldUseCmd ? `${command}.cmd` : command;
  const proc = spawnSync(resolvedCommand, args, {
    cwd: resolve("."),
    stdio: "inherit",
    encoding: "utf-8",
  });

  if (proc.status !== 0) {
    throw new Error(`Command failed: ${resolvedCommand} ${args.join(" ")}`);
  }
}

function assertFileEqual(expectedPath: string, actualPath: string): void {
  const expected = readFileSync(expectedPath, "utf-8").replace(/\r\n/g, "\n");
  const actual = readFileSync(actualPath, "utf-8").replace(/\r\n/g, "\n");
  if (expected !== actual) {
    throw new Error(
      [
        "Reference integration output drift detected.",
        `Expected: ${expectedPath}`,
        `Actual: ${actualPath}`,
        "Re-run the example scripts and intentionally update checked-in bundles if behavior changed.",
      ].join("\n"),
    );
  }
}

function main(): void {
  const tsxCli = resolve("node_modules", "tsx", "dist", "cli.mjs");
  run(process.execPath, [tsxCli, resolve("examples", "reference-integrations", "webhook-approval-receipt.ts")]);
  run(process.execPath, [tsxCli, resolve("examples", "reference-integrations", "agent-tool-execution-receipt.ts")]);

  assertFileEqual(
    resolve("examples", "reference-integrations", "webhook-approval-receipt.bundle.json"),
    resolve("artifacts", "reference-integrations", "webhook-approval-receipt.bundle.generated.json"),
  );
  assertFileEqual(
    resolve("examples", "reference-integrations", "agent-tool-execution-receipt.bundle.json"),
    resolve("artifacts", "reference-integrations", "agent-tool-execution-receipt.bundle.generated.json"),
  );

  console.log("Reference integration smoke check PASS.");
}

main();
