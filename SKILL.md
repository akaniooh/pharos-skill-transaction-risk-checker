---
name: transaction-risk-checker
description: "Analyzes a blockchain transaction before execution and returns a standardized risk assessment. Use when an agent or user wants to check whether a transaction is safe to execute, assess risk before signing, evaluate approval or transfer risk, or get a risk score for a swap, transfer, or token approval on Pharos or any EVM-compatible chain. Triggers on: 'check this transaction', 'is this safe to approve', 'risk check before swap', 'analyze this contract approval', 'should I sign this tx', 'pre-execution risk assessment'."
version: "1.0.0"
license: MIT-0
author: Atlas
metadata:
  network: pharos-atlantic-testnet
  chain_id: 688689
  rpc: https://atlantic.dplabs-internal.com/
  usdc: "0xE0BE08c77f415F577A1B3A9aD7a1Df1479564ec8"
  endpoint: POST /api/risk-check
  repo: https://github.com/your-handle/transaction-risk-checker
  hackathon: Pharos AI Agent Carnival — Phase 1 Skill Hackathon
---

# Transaction Risk Checker

A reusable pre-execution risk assessment Skill for the Pharos Agent Center. Any agent can call this Skill before signing or submitting a transaction to receive a standardized risk score, level, and human-readable reason.

## What this Skill does

Before an agent executes any on-chain transaction, it calls this Skill's API endpoint with the transaction parameters. The Skill returns a structured risk assessment — the agent then decides whether to proceed, warn the user, or abort.

The Skill never touches a wallet or submits anything on-chain. It is a pure analysis layer that sits between the agent's intent and the wallet's signing step.

## When to invoke this Skill

Invoke this Skill whenever an agent is about to:
- Approve a token allowance for a contract
- Transfer tokens to an address
- Execute a swap on a DEX
- Perform any on-chain action involving a contract address and amount

Always call this Skill **before** constructing or signing the transaction object.

## API endpoint

```
POST /api/risk-check
Content-Type: application/json
```

### Request

```json
{
  "transaction_type": "approval",
  "contract_address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "amount": "1000",
  "token_symbol": "USDC"
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `transaction_type` | string | yes | `approval`, `transfer`, `swap` |
| `contract_address` | string | yes | EVM address (`0x...`) |
| `amount` | string | yes | Token amount, or `"unlimited"` / `"max"` |
| `token_symbol` | string | no | e.g. `"USDC"`, `"PHRS"` |

### Response

```json
{
  "risk_score": 80,
  "risk_level": "HIGH",
  "reason": "Token approval for a large amount (1000000) to an unknown contract.",
  "breakdown": [
    { "factor": "Transaction type", "score_impact": 25, "detail": "Approval grants allowance — high inherent risk." },
    { "factor": "Amount size",      "score_impact": 40, "detail": "Very large amount (1000000) — significant risk." },
    { "factor": "Contract address", "score_impact": 20, "detail": "Not in the known-safe registry." },
    { "factor": "Approval × large amount", "score_impact": 15, "detail": "Common phishing vector." }
  ],
  "timestamp": "2026-06-09T14:00:00.000Z"
}
```

| Field | Type | Description |
|---|---|---|
| `risk_score` | number (0–100) | Composite risk score |
| `risk_level` | `LOW` / `MEDIUM` / `HIGH` | Categorical label |
| `reason` | string | One-sentence human-readable summary |
| `breakdown` | array | Per-factor score contributions |
| `timestamp` | ISO 8601 | Time of assessment |

### Health check

```
GET /api/risk-check
```

Returns skill metadata and status.

## How agents should use this Skill

```typescript
// Step 1 — Call this Skill before touching the wallet
const risk = await fetch("https://your-skill.example.com/api/risk-check", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    transaction_type: "approval",
    contract_address: contractAddress,
    amount: amount,
  }),
}).then(r => r.json());

// Step 2 — Apply blocking rules
if (risk.risk_level === "HIGH") {
  console.error("Transaction blocked:", risk.reason);
  return; // abort — never reach the wallet
}

if (risk.risk_level === "MEDIUM") {
  const confirmed = await askUser(`⚠ Risk warning: ${risk.reason}\nProceed?`);
  if (!confirmed) return;
}

// Step 3 — Only now invoke the wallet/signer
const tx = await signer.sendTransaction({ to, data, value });
```

See `references/safeExecute.md` for the full integration pattern with ethers.js and multiple wallet providers.

## Risk scoring logic

| Factor | Score impact | Trigger condition |
|---|---|---|
| Transaction type: approval | +25 | Always for approvals |
| Transaction type: swap | +15 | Always for swaps |
| Transaction type: transfer | +5 | Always for transfers |
| Amount < 1,000 | +5 | Small amount |
| Amount 1K–10K | +15 | Moderate |
| Amount 10K–100K | +30 | Large |
| Amount 100K–1M | +40 | Very large |
| Amount ≥ 1M | +50 | Extreme |
| Unknown contract | +20 | Not in safe registry |
| Invalid address format | +20 | Bad `0x...` format |
| Known safe contract | −10 | Whitelisted (USDC, USDT, WETH, etc.) |
| Approval + large amount combo | +15 | Phishing pattern bonus |
| Unlimited approval | +20 | `max` / `unlimited` / `uint256.MAX` |

**Risk levels:** LOW = 0–39 · MEDIUM = 40–69 · HIGH = 70–100

Score is clamped to [0, 100].

## Deployment on Pharos

This Skill runs as a Next.js API route. Deploy to any EVM-compatible environment:

```bash
# Install and run locally
npm install
npm run dev
# → POST http://localhost:3000/api/risk-check

# Deploy to Vercel (recommended for Pharos Agent Center)
vercel deploy

# Or deploy via Docker
docker build -t transaction-risk-checker .
docker run -p 3000:3000 transaction-risk-checker
```

Network configuration for Pharos Atlantic Testnet:
- Chain ID: `688689`
- RPC: `https://atlantic.dplabs-internal.com/`
- Test USDC: `0xE0BE08c77f415F577A1B3A9aD7a1Df1479564ec8`

## Project structure

```
transaction-risk-checker/
├── SKILL.md                          ← this file (Pharos Agent Center entry point)
├── app/
│   ├── page.tsx                      ← interactive UI dashboard
│   └── api/risk-check/
│       └── route.ts                  ← POST + GET endpoint
├── lib/
│   ├── riskEngine.ts                 ← core scoring logic (framework-agnostic)
│   ├── safeExecute.ts                ← wallet integration layer
│   └── walletExamples.ts             ← MetaMask / WalletConnect / private key examples
├── types/index.ts                    ← TypeScript types + client helper
├── __tests__/riskEngine.test.ts      ← 11 Jest unit tests
├── references/
│   ├── safeExecute.md                ← wallet integration guide
│   ├── scoring.md                    ← detailed scoring rules
│   └── pharos-network.md             ← Pharos testnet config
├── examples/
│   └── agent-usage.ts                ← end-to-end agent usage example
└── scripts/
    └── test-local.sh                 ← quick local smoke test
```

## Composing with other Skills

This Skill is designed to be composed. Example multi-Skill agent flow:

```
[Price Oracle Skill] → get token price
[Transaction Risk Checker Skill] → assess risk          ← this Skill
[Wallet Execution Skill] → sign and submit if LOW/MEDIUM
[Transaction Monitor Skill] → watch for confirmation
```

Any agent on Pharos can call this Skill as a dependency before any execution step.
