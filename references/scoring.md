# Risk scoring rules

Full reference for every scoring factor applied by the Transaction Risk Checker engine.

## Factor table

| Factor | Score impact | Condition |
|---|---|---|
| Transaction type: approval | +25 | `transaction_type === "approval"` |
| Transaction type: swap | +15 | `transaction_type === "swap"` |
| Transaction type: transfer | +5 | `transaction_type === "transfer"` |
| Zero / unparseable amount | +5 | amount is 0 or non-numeric |
| Small amount | +5 | amount < 1,000 |
| Moderate amount | +15 | 1,000 ≤ amount < 10,000 |
| Large amount | +30 | 10,000 ≤ amount < 100,000 |
| Very large amount | +40 | 100,000 ≤ amount < 1,000,000 |
| Extreme amount | +50 | amount ≥ 1,000,000 |
| Invalid address format | +20 | address does not match `/^0x[0-9a-fA-F]{40}$/` |
| Known safe contract | −10 | address is in the verified whitelist |
| Unknown contract | +20 | valid address but not in whitelist |
| Approval × large amount | +15 | approval AND amount ≥ 10,000 |
| Unlimited approval | +20 | amount is `"unlimited"`, `"max"`, or ≥ 1e18 |

Score is summed across all applicable factors, then clamped to [0, 100].

## Risk level mapping

| Score range | Risk level |
|---|---|
| 0–39 | LOW |
| 40–69 | MEDIUM |
| 70–100 | HIGH |

## Known-safe contract registry (built-in whitelist)

The following addresses are pre-verified and reduce risk by −10:

| Symbol | Address |
|---|---|
| USDC (Ethereum) | `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48` |
| USDT (Ethereum) | `0xdac17f958d2ee523a2206206994597c13d831ec7` |
| DAI | `0x6b175474e89094c44da98b954eedeac495271d0f` |
| WETH | `0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2` |
| WBTC | `0x2260fac5e5542a773aa44fbcfedf7c193bc2c599` |
| UNI | `0x1f9840a85d5af5bf1d1762f925bdaddc4201f984` |
| AAVE | `0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9` |

To add Pharos-native tokens to the whitelist, extend `KNOWN_CONTRACTS` in `lib/riskEngine.ts`.

## Example score calculations

**Large approval to unknown contract:**
- approval: +25
- amount 1,000,000: +50
- unknown contract: +20
- approval × large combo: +15
- Total: 110 → clamped to **100 → HIGH**

**Small transfer to USDC contract:**
- transfer: +5
- amount 500: +5
- known contract: −10
- Total: **0 → LOW**

**Medium swap to unknown DEX:**
- swap: +15
- amount 5,000: +15
- unknown contract: +20
- Total: **50 → MEDIUM**
