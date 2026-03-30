// scripts/lib/terminal.ts
// Production-safe terminal formatting helper for demos / CLIs.
// Goal:
// ... avoid mojibake on Windows / PowerShell / CI
// ... fall back to ASCII when Unicode is risky
// ... keep output deterministic and simple

export type TerminalSymbols = {
  line: string;
  heavyLine: string;
  bullet: string;
  arrow: string;
  check: string;
  cross: string;
  info: string;
  warning: string;
  corner: string;
};

export type TerminalFormatOptions = {
  forceUnicode?: boolean;
  forceAscii?: boolean;
  isTTY?: boolean;
  noColor?: boolean; // reserved for future use
};

export class TerminalFormatter {
  private readonly unicode: boolean;
  public readonly symbols: TerminalSymbols;

  constructor(options: TerminalFormatOptions = {}) {
    this.unicode = TerminalFormatter.shouldUseUnicode(options);
    this.symbols = this.unicode
      ? {
          line: "────────────────────────────────────────────────────────────",
          heavyLine: "════════════════════════════════════════════════════════════",
          bullet: "•",
          arrow: "→",
          check: "✓",
          cross: "✗",
          info: "ℹ",
          warning: "⚠",
          corner: "└",
        }
      : {
          line: "------------------------------------------------------------",
          heavyLine: "============================================================",
          bullet: "*",
          arrow: "->",
          check: "[OK]",
          cross: "[X]",
          info: "[i]",
          warning: "[!]",
          corner: "\\-",
        };
  }

  public static shouldUseUnicode(options: TerminalFormatOptions = {}): boolean {
    if (options.forceAscii) return false;
    if (options.forceUnicode) return true;

    const env = process.env;
    const isTTY = options.isTTY ?? Boolean(process.stdout?.isTTY);

    // Respect common env toggles.
    if (env.NO_UNICODE === "1") return false;
    if (env.FORCE_UNICODE === "1") return true;

    // In CI, safer default is ASCII for log portability.
    if (env.CI === "true" || env.GITHUB_ACTIONS === "true") return false;

    // Dumb terminals should not get fancy output.
    if (!isTTY || env.TERM === "dumb") return false;

    // Windows is the main source of mojibake in mixed shell/codepage setups.
    // Use ASCII by default unless user explicitly forces Unicode.
    if (process.platform === "win32") return false;

    return true;
  }

  public rule(char: "line" | "heavyLine" = "line"): string {
    return this.symbols[char];
  }

  public heading(title: string, heavy = true): string {
    const line = heavy ? this.symbols.heavyLine : this.symbols.line;
    return `${line}\n${title}\n${line}`;
  }

  public kv(label: string, value: string | number | boolean | null | undefined): string {
    const rendered =
      value === null ? "null" :
      value === undefined ? "undefined" :
      String(value);

    return `${label}: ${rendered}`;
  }

  public item(text: string): string {
    return `${this.symbols.bullet} ${text}`;
  }

  public status(
    kind: "check" | "cross" | "info" | "warning",
    text: string,
  ): string {
    return `${this.symbols[kind]} ${text}`;
  }

  public tree(label: string, value: string | number | boolean): string {
    return `${this.symbols.corner} ${label}: ${String(value)}`;
  }

  public list(lines: string[]): string {
    return lines.join("\n");
  }

  public block(title: string, rows: Array<[string, string | number | boolean]>): string {
    const renderedRows = rows.map(([k, v]) => this.kv(k, v));
    return `${this.heading(title)}\n${renderedRows.join("\n")}`;
  }

  public json(title: string, payload: unknown): string {
    return `${this.heading(title, false)}\n${JSON.stringify(payload, null, 2)}`;
  }
}

// Convenience singleton for simple scripts.
export const term = new TerminalFormatter();

// Small helper to print with a trailing newline block.
export function printBlock(text: string): void {
  process.stdout.write(`${text}\n`);
}
