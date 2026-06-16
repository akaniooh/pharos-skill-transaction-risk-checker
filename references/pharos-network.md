# Pharos network configuration

Configuration reference for deploying and testing this Skill on Pharos.

## Atlantic Testnet

| Property | Value |
|---|---|
| Chain ID | `688689` |
| Network name | Pharos Atlantic Testnet |
| RPC URL | `https://atlantic.dplabs-internal.com/` |
| Native currency | PHRS (18 decimals) |
| Test USDC address | `0xE0BE08c77f415F577A1B3A9aD7a1Df1479564ec8` |
| Block explorer | https://testnet.pharosscan.io/ |

## Adding Pharos to MetaMask

```json
{
  "chainId": "0xA8071",
  "chainName": "Pharos Atlantic Testnet",
  "rpcUrls": ["https://atlantic.dplabs-internal.com/"],
  "nativeCurrency": { "name": "PHRS", "symbol": "PHRS", "decimals": 18 },
  "blockExplorerUrls": ["https://testnet.pharosscan.io/"]
}
```

## ethers.js provider setup

```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://atlantic.dplabs-internal.com/");
const network = await provider.getNetwork();
console.log(network.chainId); // 688689n
```

## viem chain definition

```typescript
import { defineChain } from "viem";

export const pharosAtlantic = defineChain({
  id: 688_689,
  name: "Pharos Atlantic Testnet",
  nativeCurrency: { name: "PHRS", symbol: "PHRS", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://atlantic.dplabs-internal.com/"] },
  },
  testnet: true,
});
```

## Key Pharos performance characteristics

| Metric | Pharos | Typical EVM |
|---|---|---|
| TPS | 30,000 | < 5,000 |
| Block time | < 1 second | 2–15 seconds |
| Finality | Sub-second | Minutes |

Sub-second finality means this Skill's risk check + execution round-trip completes before the user notices any delay.
