"use client";
import { useState } from "react";

type TransactionType = "approval" | "transfer" | "swap";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

interface RiskFactor {
  factor: string;
  score_impact: number;
  detail: string;
}

interface RiskAssessment {
  risk_score: number;
  risk_level: RiskLevel;
  reason: string;
  breakdown: RiskFactor[];
  timestamp: string;
}

const PRESETS = {
  high:      { type: "approval" as const,  addr: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", amt: "1000000" },
  unlimited: { type: "approval" as const,  addr: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", amt: "unlimited" },
  safe:      { type: "transfer" as const,  addr: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", amt: "500" },
  swap:      { type: "swap" as const,      addr: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", amt: "5000" },
};

const LEVEL_STYLES: Record<RiskLevel, { badge: string; bar: string; icon: string }> = {
  LOW:    { badge: "bg-green-50 text-green-700 border-green-200",   bar: "bg-green-500",  icon: "✓" },
  MEDIUM: { badge: "bg-amber-50 text-amber-700 border-amber-200",   bar: "bg-amber-500",  icon: "⚠" },
  HIGH:   { badge: "bg-red-50   text-red-700   border-red-200",     bar: "bg-red-500",    icon: "✕" },
};

export default function Page() {
  const [txType, setTxType]     = useState<TransactionType>("approval");
  const [contract, setContract] = useState("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef");
  const [amount, setAmount]     = useState("1000");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<RiskAssessment | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);

  async function runCheck() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/risk-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_type: txType, contract_address: contract, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function loadPreset(key: keyof typeof PRESETS) {
    const p = PRESETS[key];
    setTxType(p.type);
    setContract(p.addr);
    setAmount(p.amt);
  }

  function copyJson() {
    if (!result) return;
    navigator.clipboard.writeText(
      JSON.stringify({ risk_score: result.risk_score, risk_level: result.risk_level, reason: result.reason }, null, 2)
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const styles = result ? LEVEL_STYLES[result.risk_level] : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto py-12 px-5">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-lg">
              🔐
            </div>
            <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
              Transaction risk checker
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {["Pharos Agent Center", "Skill v1.0.0", "POST /api/risk-check"].map(tag => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">
                transaction_type
              </label>
              <select
                value={txType}
                onChange={e => setTxType(e.target.value as TransactionType)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                <option value="approval">approval</option>
                <option value="transfer">transfer</option>
                <option value="swap">swap</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">
                amount
              </label>
              <input
                type="text"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 1000 or unlimited"
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-400 dark:text-zinc-500 mb-1.5 uppercase tracking-wide">
              contract_address
            </label>
            <input
              type="text"
              value={contract}
              onChange={e => setContract(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          {/* Presets */}
          <div className="flex gap-2 flex-wrap mb-4">
            {([
              { key: "high",      label: "⚠ Large approval" },
              { key: "unlimited", label: "⛔ Unlimited" },
              { key: "safe",      label: "✓ Safe transfer" },
              { key: "swap",      label: "↔ Swap" },
            ] as const).map(p => (
              <button
                key={p.key}
                onClick={() => loadPreset(p.key)}
                className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={runCheck}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="animate-spin">⟳</span> Analyzing…</>
            ) : (
              <>🔍 Analyze transaction</>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Result */}
        {result && styles && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">

            {/* Score row */}
            <div className="flex items-start gap-5 mb-5">
              <div>
                <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-1.5">Risk score</div>
                <div className="text-5xl font-medium text-zinc-900 dark:text-zinc-50 leading-none">
                  {result.risk_score}
                </div>
              </div>
              <div className="flex-1 pt-1">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border mb-3 ${styles.badge}`}>
                  {styles.icon} {result.risk_level}
                </span>
                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${styles.bar}`}
                    style={{ width: `${result.risk_score}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-zinc-300 dark:text-zinc-600">0</span>
                  <span className="text-xs text-zinc-300 dark:text-zinc-600">100</span>
                </div>
              </div>
            </div>

            {/* Reason */}
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-5">
              {result.reason}
            </p>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800 mb-4" />

            {/* Breakdown */}
            <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-3">
              Score breakdown
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 mb-5">
              {result.breakdown.map((f, i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{f.factor}</div>
                    <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{f.detail}</div>
                  </div>
                  <div className={`text-sm font-medium shrink-0 pt-0.5 ${f.score_impact > 0 ? "text-red-500" : "text-green-500"}`}>
                    {f.score_impact > 0 ? "+" : ""}{f.score_impact}
                  </div>
                </div>
              ))}
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800 mb-4" />

            {/* JSON output */}
            <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
              JSON response
            </div>
            <pre className="text-xs font-mono bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 overflow-x-auto text-zinc-700 dark:text-zinc-300 mb-3">
{JSON.stringify({ risk_score: result.risk_score, risk_level: result.risk_level, reason: result.reason }, null, 2)}
            </pre>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 dark:text-zinc-600">
                assessed {new Date(result.timestamp).toLocaleTimeString()}
              </span>
              <button
                onClick={copyJson}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {copied ? "✓ Copied" : "Copy JSON"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
