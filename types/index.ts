// types/index.ts — Pharos Agent Center Skill Types

export type { TransactionType, TransactionInput, RiskAssessment, RiskFactor, RiskLevel } from "@/lib/riskEngine";

// ── Pharos Agent SDK-compatible wrapper ───────────────────
export interface PharosSkillRequest {
  skill_id: "transaction-risk-checker";
  version?: string;
  payload: {
    transaction_type: "approval" | "transfer" | "swap";
    contract_address: string;
    amount: string;
    token_symbol?: string;
    from_address?: string;
  };
}

export interface PharosSkillResponse {
  skill_id: "transaction-risk-checker";
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
  breakdown: Array<{
    factor: string;
    score_impact: number;
    detail: string;
  }>;
  timestamp: string;
}

// ── Convenience client function (for use from other agents) ─
export async function checkTransactionRisk(
  baseUrl: string,
  payload: PharosSkillRequest["payload"]
): Promise<PharosSkillResponse> {
  const res = await fetch(`${baseUrl}/api/risk-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`RiskChecker error ${res.status}: ${err.error ?? "Unknown"}`);
  }

  const data = await res.json();
  return { skill_id: "transaction-risk-checker", ...data };
}
