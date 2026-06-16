#!/bin/bash
# scripts/test-local.sh
# Quick smoke test against a locally running Risk Checker Skill
# Usage: bash scripts/test-local.sh [BASE_URL]

BASE="${1:-http://localhost:3000}"

echo "🔍 Testing Transaction Risk Checker Skill at $BASE"
echo ""

# Health check
echo "── GET /api/risk-check (health)"
curl -s "$BASE/api/risk-check" | jq .
echo ""

# HIGH risk — large approval to unknown contract
echo "── POST: large approval to unknown contract (expect HIGH)"
curl -s -X POST "$BASE/api/risk-check" \
  -H "Content-Type: application/json" \
  -d '{"transaction_type":"approval","contract_address":"0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef","amount":"1000000"}' | jq '{risk_score,risk_level,reason}'
echo ""

# LOW risk — small transfer to known USDC contract
echo "── POST: small transfer to USDC (expect LOW)"
curl -s -X POST "$BASE/api/risk-check" \
  -H "Content-Type: application/json" \
  -d '{"transaction_type":"transfer","contract_address":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48","amount":"50"}' | jq '{risk_score,risk_level,reason}'
echo ""

# HIGH risk — unlimited approval
echo "── POST: unlimited approval (expect HIGH)"
curl -s -X POST "$BASE/api/risk-check" \
  -H "Content-Type: application/json" \
  -d '{"transaction_type":"approval","contract_address":"0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef","amount":"unlimited"}' | jq '{risk_score,risk_level,reason}'
echo ""

# MEDIUM risk — moderate swap
echo "── POST: moderate swap to unknown DEX (expect MEDIUM)"
curl -s -X POST "$BASE/api/risk-check" \
  -H "Content-Type: application/json" \
  -d '{"transaction_type":"swap","contract_address":"0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef","amount":"5000"}' | jq '{risk_score,risk_level,reason}'
echo ""

echo "✅ Done."
