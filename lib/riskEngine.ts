// ============================================================
// Transaction Risk Engine — Pharos Agent Center Skill
// ============================================================

export type TransactionType = "approval" | "transfer" | "swap";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface TransactionInput {
  transaction_type: TransactionType;
  contract_address: string;
  amount: string;
  token_symbol?: string;
  from_address?: string;
}

export interface RiskAssessment {
  risk_score: number;        // 0–100
  risk_level: RiskLevel;
  reason: string;
  breakdown: RiskFactor[];
  timestamp: string;
}

export interface RiskFactor {
  factor: string;
  score_impact: number;
  detail: string;
}

// ── Known-safe contract addresses (example whitelist) ──────
const KNOWN_CONTRACTS: Set<string> = new Set([
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
  "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
  "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", // UNI
  "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9", // AAVE
]);

// ── Thresholds ─────────────────────────────────────────────
const AMOUNT_THRESHOLDS = {
  LOW:    1_000,
  MEDIUM: 10_000,
  HIGH:   100_000,
  VERY_HIGH: 1_000_000,
};

// ── Helpers ────────────────────────────────────────────────
function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

function isKnownContract(address: string): boolean {
  return KNOWN_CONTRACTS.has(address.toLowerCase());
}

function parseAmount(raw: string): number {
  const lower = raw.trim().toLowerCase();
  if (lower === "unlimited" || lower === "max" || lower === "infinite") return Infinity;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function scoreToLevel(score: number): RiskLevel {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

// ── Main scoring function ──────────────────────────────────
export function assessRisk(input: TransactionInput): RiskAssessment {
  const factors: RiskFactor[] = [];
  let totalScore = 0;

  const amount = parseAmount(input.amount);
  const address = input.contract_address?.trim() ?? "";

  // ── Factor 1: Transaction Type Base Risk ──────────────────
  const typeRisk: Record<TransactionType, { impact: number; detail: string }> = {
    approval: { impact: 25, detail: "Approval grants allowance to a contract — high inherent risk." },
    swap:     { impact: 15, detail: "Swaps involve DEX routing and price exposure." },
    transfer: { impact: 5,  detail: "Direct transfer is the lowest-risk transaction type." },
  };

  const typeData = typeRisk[input.transaction_type] ?? { impact: 10, detail: "Unknown transaction type." };
  factors.push({
    factor: "Transaction Type",
    score_impact: typeData.impact,
    detail: typeData.detail,
  });
  totalScore += typeData.impact;

  // ── Factor 2: Amount Risk ─────────────────────────────────
  let amountImpact = 0;
  let amountDetail = "";

  if (!isFinite(amount) && amount > 0) {
    amountImpact = 50;
    amountDetail = "Unlimited amount — exposes entire token balance.";
  } else if (amount === 0) {
    amountImpact = 5;
    amountDetail = "Zero or unparseable amount — treat as suspicious.";
  } else if (amount < AMOUNT_THRESHOLDS.LOW) {
    amountImpact = 5;
    amountDetail = `Small amount (${amount.toLocaleString()}) — minimal financial risk.`;
  } else if (amount < AMOUNT_THRESHOLDS.MEDIUM) {
    amountImpact = 15;
    amountDetail = `Moderate amount (${amount.toLocaleString()}) — standard caution advised.`;
  } else if (amount < AMOUNT_THRESHOLDS.HIGH) {
    amountImpact = 30;
    amountDetail = `Large amount (${amount.toLocaleString()}) — elevated financial exposure.`;
  } else if (amount < AMOUNT_THRESHOLDS.VERY_HIGH) {
    amountImpact = 40;
    amountDetail = `Very large amount (${amount.toLocaleString()}) — significant risk.`;
  } else {
    amountImpact = 50;
    amountDetail = `Extremely large amount (${amount.toLocaleString()}) — maximum financial risk flag.`;
  }

  factors.push({ factor: "Amount Size", score_impact: amountImpact, detail: amountDetail });
  totalScore += amountImpact;

  // ── Factor 3: Contract Address Risk ──────────────────────
  if (!isValidAddress(address)) {
    factors.push({
      factor: "Contract Address",
      score_impact: 20,
      detail: "Invalid or missing contract address format — suspicious.",
    });
    totalScore += 20;
  } else if (isKnownContract(address)) {
    factors.push({
      factor: "Contract Address",
      score_impact: -10,
      detail: "Contract is on the verified safe-list — risk reduced.",
    });
    totalScore -= 10;
  } else {
    factors.push({
      factor: "Contract Address",
      score_impact: 20,
      detail: "Contract address is not in the known-safe registry — treat as unknown.",
    });
    totalScore += 20;
  }

  // ── Factor 4: Approval + Large Amount Combo ───────────────
  if (input.transaction_type === "approval" && amount >= AMOUNT_THRESHOLDS.MEDIUM) {
    factors.push({
      factor: "Approval × Large Amount",
      score_impact: 15,
      detail: "Granting approval for a large amount to an unverified contract is a common phishing vector.",
    });
    totalScore += 15;
  }

  // ── Factor 5: Unlimited Approval Check ───────────────────
  const isUnlimited =
    input.transaction_type === "approval" &&
    (input.amount === "115792089237316195423570985008687907853269984665640564039457584007913129639935" ||
      input.amount.toLowerCase() === "unlimited" ||
      input.amount.toLowerCase() === "max" ||
      parseFloat(input.amount) >= 1e18);

  if (isUnlimited) {
    factors.push({
      factor: "Unlimited Approval",
      score_impact: 20,
      detail: "Unlimited approvals expose your entire token balance indefinitely.",
    });
    totalScore += 20;
  }

  // ── Clamp and finalize ────────────────────────────────────
  const risk_score = Math.max(0, Math.min(100, Math.round(totalScore)));
  const risk_level = scoreToLevel(risk_score);
  const reason = buildReason(input, risk_level, factors, amount, address);

  return {
    risk_score,
    risk_level,
    reason,
    breakdown: factors,
    timestamp: new Date().toISOString(),
  };
}

function buildReason(
  input: TransactionInput,
  level: RiskLevel,
  factors: RiskFactor[],
  amount: number,
  address: string,
): string {
  const topFactors = [...factors]
    .filter((f) => f.score_impact > 0)
    .sort((a, b) => b.score_impact - a.score_impact)
    .slice(0, 2);

  const parts: string[] = [];

  const typeLabels: Record<TransactionType, string> = {
    approval: "Token approval",
    transfer: "Token transfer",
    swap: "Token swap",
  };
  parts.push(typeLabels[input.transaction_type] ?? "Transaction");

  if (amount >= AMOUNT_THRESHOLDS.HIGH) {
    parts.push(`for a large amount (${amount.toLocaleString()})`);
  } else if (amount > 0) {
    parts.push(`for ${amount.toLocaleString()} tokens`);
  }

  if (!isValidAddress(address)) {
    parts.push("to an invalid contract address");
  } else if (!isKnownContract(address)) {
    parts.push("to an unknown contract");
  } else {
    parts.push("to a verified contract");
  }

  if (topFactors[1]) {
    parts.push(`— ${topFactors[1].detail.toLowerCase()}`);
  }

  return parts.join(" ") + ".";
}
