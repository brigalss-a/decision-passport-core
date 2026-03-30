export type BasicVerifierStatus = "PASS" | "FAIL";

export interface BasicVerifierResult {
  status: BasicVerifierStatus;
  checks: Array<{
    name: string;
    passed: boolean;
    message?: string;
  }>;
}
