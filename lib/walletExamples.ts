// lib/walletExamples.ts
// ─────────────────────────────────────────────────────────────
// Three concrete examples of how to wire safeExecute to
// different wallet providers. Copy the one that fits your setup.
// ─────────────────────────────────────────────────────────────

import { ethers } from "ethers";
import { safeExecute } from "./safeExecute";

// ════════════════════════════════════════════════════════════
// EXAMPLE 1 — MetaMask (browser, ethers.js v6)
// Use in a React component or client-side page
// ════════════════════════════════════════════════════════════
export async function exampleMetaMask() {
  if (!window.ethereum) throw new Error("MetaMask not installed");

  // Connect to MetaMask
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const result = await safeExecute(signer, {
    // Risk assessment inputs
    transaction_type: "approval",
    contract_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
    amount: "1000",
    token_symbol: "USDC",

    // The actual transaction MetaMask will sign
    tx: {
      to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      // ERC-20 approve(spender, amount) ABI-encoded
      data: new ethers.Interface([
        "function approve(address spender, uint256 amount)"
      ]).encodeFunctionData("approve", [
        "0xSpenderAddress",
        ethers.parseUnits("1000", 6),
      ]),
      value: "0",
    },

    onRiskAssessed: (risk) => {
      // Called before the wallet prompt — use to show a warning UI
      if (risk.risk_level !== "LOW") {
        console.warn(`⚠ Risk: ${risk.risk_level} (${risk.risk_score}/100) — ${risk.reason}`);
      }
    },
  });

  if (result.blocked) {
    console.error("Transaction blocked:", result.error);
    return;
  }

  console.log("Transaction confirmed:", result.txHash);
}


// ════════════════════════════════════════════════════════════
// EXAMPLE 2 — WalletConnect (mobile wallet via QR)
// Install: npm install @walletconnect/web3-provider
// ════════════════════════════════════════════════════════════
export async function exampleWalletConnect() {
  // Dynamic import so server bundles don't break
  const WalletConnectProvider = (
    await import("@walletconnect/web3-provider")
  ).default;

  const wcProvider = new WalletConnectProvider({
    rpc: {
      1: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
    },
  });

  await wcProvider.enable(); // Opens QR modal on mobile

  const provider = new ethers.BrowserProvider(wcProvider as any);
  const signer = await provider.getSigner();

  const result = await safeExecute(signer, {
    transaction_type: "transfer",
    contract_address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
    amount: "500",

    tx: {
      to: "0xRecipientAddress",
      data: new ethers.Interface([
        "function transfer(address to, uint256 amount)"
      ]).encodeFunctionData("transfer", [
        "0xRecipientAddress",
        ethers.parseUnits("500", 6),
      ]),
    },
  });

  console.log(result.success ? `Sent! ${result.txHash}` : `Blocked: ${result.error}`);
}


// ════════════════════════════════════════════════════════════
// EXAMPLE 3 — Private key signer (server-side Pharos Agent)
// Use when the agent signs autonomously (no human in the loop)
// Store the private key in an env variable — never hardcode it
// ════════════════════════════════════════════════════════════
export async function exampleServerAgent() {
  const provider = new ethers.JsonRpcProvider(
    process.env.RPC_URL ?? "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
  );

  const signer = new ethers.Wallet(
    process.env.AGENT_PRIVATE_KEY!,
    provider
  );

  const result = await safeExecute(signer, {
    transaction_type: "swap",
    contract_address: "0xUnknownDex",
    amount: "50000",

    tx: {
      to: "0xUnknownDex",
      data: "0xSwapCalldata",
      value: "0",
      gasLimit: "250000",
    },

    // In a server agent, HIGH-risk txs should always be blocked
    blockOnMedium: false,

    // Point to your deployed skill URL when running server-side
    riskCheckerUrl: "https://your-skill.example.com/api/risk-check",

    onRiskAssessed: (risk) => {
      // Log to your observability platform (Datadog, etc.)
      console.log(JSON.stringify({
        event: "risk_assessed",
        score: risk.risk_score,
        level: risk.risk_level,
        reason: risk.reason,
        ts: risk.timestamp,
      }));
    },
  });

  if (!result.success) {
    // In a server agent: emit an alert, don't crash silently
    console.error("[Agent] TX blocked or failed:", result.error);
    process.exitCode = 1;
    return;
  }

  console.log("[Agent] TX confirmed on-chain:", result.txHash);
}
