// lib/safeExecute.ts
// ─────────────────────────────────────────────────────────────
// The integration layer between the Risk Checker Skill and
// the actual wallet. This is the ONE function your Pharos Agent
// calls instead of calling the wallet directly.
//
// Usage:
//   import { safeExecute } from "@/lib/safeExecute";
//
//   const result = await safeExecute(provider, {
//     transaction_type: "approval",
//     contract_address: "0x...",
//     amount: "1000",
//     tx: {
//       to: "0x...",
//       data: "0x...",
//       value: "0",
//     },
//   });
// ─────────────────────────────────────────────────────────────

import { ethers } from "ethers";

// ── Types ─────────────────────────────────────────────────────

export type TransactionType = "approval" | "transfer" | "swap";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface SafeExecuteParams {
  transaction_type: TransactionType;
  contract_address: string;
  amount: string;
  token_symbol?: string;

  // The actual EVM transaction to sign & send if risk passes
  tx: {
    to: string;
    data?: string;
    value?: string;
    gasLimit?: string;
  };

  // Optional overrides
  riskCheckerUrl?: string;     // default: /api/risk-check (same origin)
  blockOnMedium?: boolean;     // default: false (warn but allow MEDIUM)
  onRiskAssessed?: (assessment: RiskAssessment) => void;
}

export interface RiskAssessment {
  risk_score: number;
  risk_level: RiskLevel;
  reason: string;
  breakdown: Array<{ factor: string; score_impact: number; detail: string }>;
  timestamp: string;
}

export interface SafeExecuteResult {
  success: boolean;
  blocked: boolean;
  risk: RiskAssessment;
  txHash?: string;
  txReceipt?: ethers.TransactionReceipt;
  error?: string;
}

// ── Main function ─────────────────────────────────────────────

export async function safeExecute(
  // Pass any ethers.js-compatible signer:
  //   Browser:     new ethers.BrowserProvider(window.ethereum).getSigner()
  //   Server-side: new ethers.Wallet(process.env.PRIVATE_KEY!, provider)
  //   WalletConnect: use @walletconnect/web3-provider then wrap in BrowserProvider
  signer: ethers.Signer,
  params: SafeExecuteParams
): Promise<SafeExecuteResult> {
  const {
    transaction_type,
    contract_address,
    amount,
    token_symbol,
    tx,
    riskCheckerUrl = "/api/risk-check",
    blockOnMedium = false,
    onRiskAssessed,
  } = params;

  // ── Step 1: Call the Risk Checker Skill ─────────────────────
  let risk: RiskAssessment;

  try {
    const res = await fetch(riskCheckerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction_type, contract_address, amount, token_symbol }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Risk check failed: ${err.error ?? res.statusText}`);
    }

    risk = await res.json();
  } catch (err) {
    // If the Risk Checker is down, fail safe — block the tx
    return {
      success: false,
      blocked: true,
      error: `Risk Checker unreachable: ${(err as Error).message}`,
      risk: {
        risk_score: 100,
        risk_level: "HIGH",
        reason: "Risk assessment service unavailable — transaction blocked as a precaution.",
        breakdown: [],
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ── Step 2: Notify caller of the assessment ──────────────────
  onRiskAssessed?.(risk);

  // ── Step 3: Apply blocking rules ────────────────────────────
  const shouldBlock =
    risk.risk_level === "HIGH" ||
    (blockOnMedium && risk.risk_level === "MEDIUM");

  if (shouldBlock) {
    return {
      success: false,
      blocked: true,
      risk,
      error: risk.reason,
    };
  }

  // ── Step 4: Execute the transaction via the wallet ───────────
  try {
    const txRequest: ethers.TransactionRequest = {
      to: tx.to,
      data: tx.data,
      value: tx.value ? ethers.parseEther(tx.value) : undefined,
      gasLimit: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
    };

    const txResponse = await signer.sendTransaction(txRequest);
    console.log(`[safeExecute] Tx submitted: ${txResponse.hash}`);

    const receipt = await txResponse.wait();

    return {
      success: true,
      blocked: false,
      risk,
      txHash: txResponse.hash,
      txReceipt: receipt ?? undefined,
    };
  } catch (err) {
    return {
      success: false,
      blocked: false,
      risk,
      error: `Transaction failed after risk check: ${(err as Error).message}`,
    };
  }
}
