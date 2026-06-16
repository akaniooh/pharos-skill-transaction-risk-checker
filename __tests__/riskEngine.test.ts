// __tests__/riskEngine.test.ts
// Run with: npx jest

import { assessRisk } from "../lib/riskEngine";

describe("Transaction Risk Engine", () => {
  // ── Approval tests ────────────────────────────────────────
  describe("Approval transactions", () => {
    it("should return HIGH risk for large approval to unknown contract", () => {
      const result = assessRisk({
        transaction_type: "approval",
        contract_address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        amount: "1000000",
      });
      expect(result.risk_level).toBe("HIGH");
      expect(result.risk_score).toBeGreaterThanOrEqual(70);
    });

    it("should return HIGH risk for unlimited approval", () => {
      const result = assessRisk({
        transaction_type: "approval",
        contract_address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        amount: "unlimited",
      });
      expect(result.risk_level).toBe("HIGH");
    });

    it("should return MEDIUM risk for small approval to unknown contract", () => {
      const result = assessRisk({
        transaction_type: "approval",
        contract_address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        amount: "100",
      });
      expect(result.risk_level).toBe("MEDIUM");
    });

    it("should return LOW-to-MEDIUM risk for approval to known contract", () => {
      const result = assessRisk({
        transaction_type: "approval",
        contract_address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
        amount: "500",
      });
      expect(result.risk_score).toBeLessThan(70);
    });
  });

  // ── Transfer tests ────────────────────────────────────────
  describe("Transfer transactions", () => {
    it("should return LOW risk for small transfer to known contract", () => {
      const result = assessRisk({
        transaction_type: "transfer",
        contract_address: "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
        amount: "50",
      });
      expect(result.risk_level).toBe("LOW");
    });

    it("should return HIGH risk for very large transfer", () => {
      const result = assessRisk({
        transaction_type: "transfer",
        contract_address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        amount: "5000000",
      });
      expect(result.risk_level).toBe("HIGH");
    });
  });

  // ── Swap tests ────────────────────────────────────────────
  describe("Swap transactions", () => {
    it("should return MEDIUM risk for moderate swap to unknown contract", () => {
      const result = assessRisk({
        transaction_type: "swap",
        contract_address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        amount: "5000",
      });
      expect(result.risk_level).toBe("MEDIUM");
    });
  });

  // ── Edge cases ────────────────────────────────────────────
  describe("Edge cases", () => {
    it("should penalise invalid contract address", () => {
      const result = assessRisk({
        transaction_type: "transfer",
        contract_address: "not-an-address",
        amount: "100",
      });
      expect(result.risk_score).toBeGreaterThan(20);
    });

    it("should handle zero amount", () => {
      const result = assessRisk({
        transaction_type: "transfer",
        contract_address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        amount: "0",
      });
      expect(result.risk_score).toBeDefined();
    });

    it("should clamp score between 0 and 100", () => {
      const result = assessRisk({
        transaction_type: "approval",
        contract_address: "invalid",
        amount: "999999999",
      });
      expect(result.risk_score).toBeGreaterThanOrEqual(0);
      expect(result.risk_score).toBeLessThanOrEqual(100);
    });
  });

  // ── Output structure ──────────────────────────────────────
  describe("Output format", () => {
    it("should always include required fields", () => {
      const result = assessRisk({
        transaction_type: "transfer",
        contract_address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        amount: "100",
      });
      expect(typeof result.risk_score).toBe("number");
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(result.risk_level);
      expect(typeof result.reason).toBe("string");
      expect(Array.isArray(result.breakdown)).toBe(true);
      expect(typeof result.timestamp).toBe("string");
    });
  });
});
