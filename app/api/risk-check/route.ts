// app/api/risk-check/route.ts
// Pharos Agent Center — Transaction Risk Checker Skill Endpoint

import { NextRequest, NextResponse } from "next/server";
import { assessRisk, TransactionInput, TransactionType } from "@/lib/riskEngine";

const VALID_TYPES: TransactionType[] = ["approval", "transfer", "swap"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const { transaction_type, contract_address, amount, token_symbol, from_address } = body;

    // ── Validate required fields ──────────────────────────────
    if (!transaction_type || !VALID_TYPES.includes(transaction_type)) {
      return NextResponse.json(
        {
          error: `'transaction_type' is required and must be one of: ${VALID_TYPES.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    if (!contract_address || typeof contract_address !== "string") {
      return NextResponse.json(
        { error: "'contract_address' is required and must be a string." },
        { status: 400 }
      );
    }

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: "'amount' is required." },
        { status: 400 }
      );
    }

    const input: TransactionInput = {
      transaction_type: transaction_type as TransactionType,
      contract_address: String(contract_address),
      amount: String(amount),
      token_symbol: token_symbol ? String(token_symbol) : undefined,
      from_address: from_address ? String(from_address) : undefined,
    };

    const assessment = assessRisk(input);

    return NextResponse.json(
      {
        risk_score: assessment.risk_score,
        risk_level: assessment.risk_level,
        reason: assessment.reason,
        breakdown: assessment.breakdown,
        timestamp: assessment.timestamp,
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Pharos-Skill": "transaction-risk-checker",
          "X-Pharos-Version": "1.0.0",
        },
      }
    );
  } catch (err) {
    console.error("[RiskCheck] Unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}

// ── Health check ───────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    skill: "Transaction Risk Checker",
    version: "1.0.0",
    status: "healthy",
    supported_types: ["approval", "transfer", "swap"],
    endpoint: "POST /api/risk-check",
    description:
      "Analyze a blockchain transaction and receive a risk score before execution.",
  });
}
