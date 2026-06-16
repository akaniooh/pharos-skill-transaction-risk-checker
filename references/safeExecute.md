# Wallet integration guide

This reference covers how to wire the Transaction Risk Checker Skill into a real wallet signing flow. Read this when you need to connect the Skill's risk assessment to an actual transaction submission.

## The safeExecute pattern

The `safeExecute` function in `lib/safeExecute.ts` is the single integration point. It:

1. Calls `POST /api/risk-check` with the transaction params
2. Invokes your `onRiskAssessed` callback (for logging or UI warnings)
3. Blocks the transaction if `risk_level` is HIGH (or MEDIUM if `blockOnMedium: true`)
4. Signs and submits via the ethers.js signer you pass in — only if risk passes

```typescript
import { ethers } from "ethers";
import { safeExecute } from "./lib/safeExecute";

const result = await safeExecute(signer, {
  transaction_type: "approval",
  contract_address: "0x...",
  amount: "1000",
  tx: {
    to: "0x...",
    data: encodedCalldata,
    value: "0",
  },
  riskCheckerUrl: "https://your-skill.example.com/api/risk-check",
  onRiskAssessed: (risk) => {
    console.log(`Risk: ${risk.risk_level} (${risk.risk_score}) — ${risk.reason}`);
  },
});

if (result.blocked) {
  // Transaction was stopped by the risk gate
  console.error(result.error);
} else {
  // Transaction submitted on-chain
  console.log(result.txHash);
}
```

## Wallet provider examples

### MetaMask (browser)

```typescript
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
// pass signer to safeExecute
```

### WalletConnect (mobile)

```typescript
import WalletConnectProvider from "@walletconnect/web3-provider";
const wc = new WalletConnectProvider({ rpc: { 688689: "https://atlantic.dplabs-internal.com/" } });
await wc.enable();
const provider = new ethers.BrowserProvider(wc);
const signer = await provider.getSigner();
// pass signer to safeExecute
```

### Private key (server-side agent)

```typescript
const provider = new ethers.JsonRpcProvider("https://atlantic.dplabs-internal.com/");
const signer = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY!, provider);
// pass signer to safeExecute
```

## Fail-safe behaviour

If the Risk Checker API is unreachable, `safeExecute` returns `blocked: true` with `risk_score: 100`. The wallet is never invoked. This is intentional — a broken safety gate should stop execution, not allow it.

## Pharos Atlantic Testnet config

```typescript
const PHAROS_TESTNET = {
  chainId: 688689,
  rpc: "https://atlantic.dplabs-internal.com/",
  usdc: "0xE0BE08c77f415F577A1B3A9aD7a1Df1479564ec8",
  nativeCurrency: { name: "PHRS", symbol: "PHRS", decimals: 18 },
};
```
