// examples/agent-usage.ts
// ─────────────────────────────────────────────────────────────
// Full end-to-end example: a Pharos Agent that uses the
// Transaction Risk Checker Skill before executing a swap.
//
// This shows the complete pattern:
//   1. Agent decides to execute a swap
//   2. Calls the Risk Checker Skill (this file)
//   3. Evaluates the risk level
//   4. Signs and submits only if risk passes
// ─────────────────────────────────────────────────────────────

import { ethers } from "ethers";
import { safeExecute } from "../lib/safeExecute";

// ── Pharos Atlantic Testnet config ────────────────────────────
const PHAROS_RPC   = "https://atlantic.dplabs-internal.com/";
const USDC_ADDRESS = "0xE0BE08c77f415F577A1B3A9aD7a1Df1479564ec8";
const SKILL_URL    = process.env.RISK_CHECKER_URL ?? "http://localhost:3000/api/risk-check";

// ── Example: agent wants to swap 500 USDC on a DEX ───────────
async function agentSwapExample() {
  // 1. Pharos provider + signer (server-side agent)
  const provider = new ethers.JsonRpcProvider(PHAROS_RPC);
  const signer   = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY!, provider);

  // 2. The swap params the agent has decided on
  const DEX_ROUTER   = "0xSomeDexRouterOnPharos";
  const SWAP_AMOUNT  = "500";
  const swapCalldata = new ethers.Interface([
    "function swapExactTokensForTokens(uint256,uint256,address[],address,uint256)"
  ]).encodeFunctionData("swapExactTokensForTokens", [
    ethers.parseUnits(SWAP_AMOUNT, 6),  // 500 USDC (6 decimals)
    0n,                                  // min output (set properly in production)
    [USDC_ADDRESS, "0xOutputToken"],
    await signer.getAddress(),
    Math.floor(Date.now() / 1000) + 300,
  ]);

  // 3. Call the Risk Checker Skill BEFORE signing
  const result = await safeExecute(signer, {
    transaction_type: "swap",
    contract_address: DEX_ROUTER,
    amount: SWAP_AMOUNT,
    token_symbol: "USDC",

    tx: {
      to: DEX_ROUTER,
      data: swapCalldata,
      value: "0",
    },

    riskCheckerUrl: SKILL_URL,
    blockOnMedium: false,  // warn on MEDIUM but allow

    onRiskAssessed: (risk) => {
      // Log to agent observability
      console.log(JSON.stringify({
        event:  "risk_assessed",
        score:  risk.risk_score,
        level:  risk.risk_level,
        reason: risk.reason,
        ts:     risk.timestamp,
      }));

      // Surface warning to user if MEDIUM
      if (risk.risk_level === "MEDIUM") {
        console.warn(`⚠ Proceeding with MEDIUM risk: ${risk.reason}`);
      }
    },
  });

  // 4. Handle outcome
  if (result.blocked) {
    console.error(`❌ Swap blocked (${result.risk.risk_level}): ${result.error}`);
    return;
  }

  if (result.success) {
    console.log(`✅ Swap confirmed on Pharos: ${result.txHash}`);
  } else {
    console.error(`❌ Swap failed after risk check: ${result.error}`);
  }
}

// ── Example: agent checks a token approval first ─────────────
async function agentApprovalExample() {
  const provider = new ethers.JsonRpcProvider(PHAROS_RPC);
  const signer   = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY!, provider);

  const SPENDER = "0xSomeDexRouterOnPharos";
  const AMOUNT  = "1000";

  const approveCalldata = new ethers.Interface([
    "function approve(address spender, uint256 amount)"
  ]).encodeFunctionData("approve", [
    SPENDER,
    ethers.parseUnits(AMOUNT, 6),
  ]);

  const result = await safeExecute(signer, {
    transaction_type: "approval",
    contract_address: USDC_ADDRESS,
    amount: AMOUNT,
    token_symbol: "USDC",
    tx: { to: USDC_ADDRESS, data: approveCalldata, value: "0" },
    riskCheckerUrl: SKILL_URL,
    blockOnMedium: false,
  });

  if (result.blocked) {
    console.error(`❌ Approval blocked: ${result.error}`);
    return;
  }

  console.log(`✅ Approval tx: ${result.txHash}`);
}

// Run
agentSwapExample().catch(console.error);
