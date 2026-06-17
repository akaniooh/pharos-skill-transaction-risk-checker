"use client";
import { useState } from "react";

type TransactionType = "approval" | "transfer" | "swap";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

interface RiskFactor { factor: string; score_impact: number; detail: string; }
interface RiskAssessment {
  risk_score: number; risk_level: RiskLevel; reason: string;
  breakdown: RiskFactor[]; timestamp: string;
}

const PRESETS = {
  high:      { type: "approval" as const,  addr: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", amt: "1000000" },
  unlimited: { type: "approval" as const,  addr: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", amt: "unlimited" },
  safe:      { type: "transfer" as const,  addr: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", amt: "500" },
  swap:      { type: "swap"     as const,  addr: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", amt: "5000" },
};

const LEVEL_COLOR = {
  LOW:    { bg: "rgba(34,197,94,0.08)",  color: "#16a34a", border: "rgba(34,197,94,0.25)",  bar: "#22c55e",  glow: "rgba(34,197,94,0.15)"  },
  MEDIUM: { bg: "rgba(245,158,11,0.08)", color: "#d97706", border: "rgba(245,158,11,0.25)", bar: "#f59e0b",  glow: "rgba(245,158,11,0.15)" },
  HIGH:   { bg: "rgba(239,68,68,0.08)",  color: "#dc2626", border: "rgba(239,68,68,0.25)",  bar: "#ef4444",  glow: "rgba(239,68,68,0.15)"  },
};

const Logo = ({ size = 32 }: { size?: number }) => (
  <svg viewBox="0 0 680 460" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
    <path d="M340 60 L440 100 L440 200 Q440 270 340 310 Q240 270 240 200 L240 100 Z"
          fill="rgba(2,132,199,0.12)" stroke="rgba(2,132,199,0.5)" strokeWidth="1.5"/>
    <path d="M340 80 L424 114 L424 198 Q424 258 340 292 Q256 258 256 198 L256 114 Z"
          fill="none" stroke="rgba(2,132,199,0.2)" strokeWidth="1"/>
    <polyline points="275,195 295,195 305,172 318,218 330,185 343,185 353,195 405,195"
              fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="275" cy="195" r="3.5" fill="#38bdf8"/>
    <circle cx="405" cy="195" r="3.5" fill="#38bdf8"/>
    <rect x="326" y="234" width="28" height="22" rx="4" fill="rgba(2,132,199,0.2)"/>
    <path d="M332 234 L332 226 Q340 218 348 226 L348 234" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="340" cy="244" r="3" fill="#7dd3fc"/>
  </svg>
);

export default function Page() {
  const [txType, setTxType]     = useState<TransactionType>("approval");
  const [contract, setContract] = useState("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef");
  const [amount, setAmount]     = useState("1000");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<RiskAssessment | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);

  async function runCheck() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/risk-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_type: txType, contract_address: contract, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setResult(data);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  function loadPreset(key: keyof typeof PRESETS) {
    const p = PRESETS[key];
    setTxType(p.type); setContract(p.addr); setAmount(p.amt);
  }

  function copyJson() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify({ risk_score: result.risk_score, risk_level: result.risk_level, reason: result.reason }, null, 2));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  const lc = result ? LEVEL_COLOR[result.risk_level] : null;
  const ICONS: Record<RiskLevel, string> = { LOW: "✓", MEDIUM: "⚠", HIGH: "✕" };

  const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif";
  const mono = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";

  return (
    <div style={{ minHeight: "100vh", background: "#070d1a", fontFamily: font, color: "#e2e8f0" }}>

      {/* Top nav bar */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10, background: "rgba(7,13,26,0.85)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={40} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.01em" }}>TxRisk</span>
          <span style={{ fontSize: 11, color: "#475569", marginLeft: 2 }}>by Pharos</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["Skill v1.0.0", "Chain 688689"].map(t => (
            <span key={t} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", background: "rgba(255,255,255,0.03)" }}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 20px 80px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 100, height: 100, borderRadius: 24, background: "rgba(2,132,199,0.1)", border: "1px solid rgba(2,132,199,0.25)", marginBottom: 16 }}>
            <Logo size={72} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f8fafc", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Transaction Risk Checker
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 16px", lineHeight: 1.6 }}>
            Pre-execution risk assessment for blockchain transactions.<br/>
            Powered by the Pharos Agent Center Skill Engine.
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#38bdf8", background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", padding: "4px 14px", borderRadius: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8", display: "inline-block" }}/>
            POST /api/risk-check
          </div>
        </div>

        {/* Form card */}
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", padding: "24px", marginBottom: 16, backdropFilter: "blur(8px)" }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* tx type */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8 }}>
                Transaction Type
              </label>
              <select
                value={txType}
                onChange={e => setTxType(e.target.value as TransactionType)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", fontSize: 14, color: "#e2e8f0", outline: "none", cursor: "pointer" }}
              >
                <option value="approval" style={{ background: "#0f172a" }}>approval</option>
                <option value="transfer" style={{ background: "#0f172a" }}>transfer</option>
                <option value="swap"     style={{ background: "#0f172a" }}>swap</option>
              </select>
            </div>
            {/* amount */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8 }}>
                Amount
              </label>
              <input
                type="text" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 1000 or unlimited"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", fontSize: 14, color: "#e2e8f0", outline: "none", boxSizing: "border-box" as const }}
              />
            </div>
          </div>

          {/* contract address */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8 }}>
              Contract Address
            </label>
            <input
              type="text" value={contract} onChange={e => setContract(e.target.value)}
              placeholder="0x..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", fontSize: 12, color: "#94a3b8", outline: "none", fontFamily: mono, boxSizing: "border-box" as const }}
            />
          </div>

          {/* Presets */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 18 }}>
            <span style={{ fontSize: 11, color: "#334155", alignSelf: "center", marginRight: 2 }}>Try:</span>
            {([
              { key: "high",      label: "⚠ Large approval", color: "#dc2626" },
              { key: "unlimited", label: "⛔ Unlimited",      color: "#dc2626" },
              { key: "safe",      label: "✓ Safe transfer",  color: "#16a34a" },
              { key: "swap",      label: "↔ Swap",           color: "#d97706" },
            ] as const).map(p => (
              <button key={p.key} onClick={() => loadPreset(p.key)}
                style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: `1px solid rgba(255,255,255,0.08)`, background: "rgba(255,255,255,0.04)", color: "#94a3b8", cursor: "pointer" }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Submit button */}
          <button
            onClick={runCheck} disabled={loading}
            style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: loading ? "rgba(56,189,248,0.3)" : "linear-gradient(135deg, #0284c7, #0ea5e9)", color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: "0.01em", boxShadow: loading ? "none" : "0 0 24px rgba(14,165,233,0.3)" }}
          >
            {loading ? (
              <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Analyzing transaction…</>
            ) : (
              <><Logo size={18} /> Analyze Transaction</>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14, padding: "14px 18px", color: "#fca5a5", fontSize: 14, marginBottom: 16 }}>
            ✕ {error}
          </div>
        )}

        {/* Result */}
        {result && lc && (
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 20, border: `1px solid ${lc.border}`, padding: "24px", backdropFilter: "blur(8px)", boxShadow: `0 0 40px ${lc.glow}` }}>

            {/* Score hero row */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 24, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 6 }}>Risk Score</div>
                <div style={{ fontSize: 64, fontWeight: 700, color: lc.color, lineHeight: 1, letterSpacing: "-0.03em" }}>
                  {result.risk_score}
                  <span style={{ fontSize: 20, color: "#334155", fontWeight: 400 }}>/100</span>
                </div>
              </div>
              <div style={{ flex: 1, paddingTop: 6 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, padding: "6px 16px", borderRadius: 24, background: lc.bg, color: lc.color, border: `1px solid ${lc.border}`, marginBottom: 12, letterSpacing: "0.04em" }}>
                  {ICONS[result.risk_level]} {result.risk_level} RISK
                </div>
                {/* progress bar */}
                <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${result.risk_score}%`, background: lc.bar, borderRadius: 6, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)", boxShadow: `0 0 12px ${lc.glow}` }}/>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                  <span style={{ fontSize: 10, color: "#1e3a5f" }}>LOW</span>
                  <span style={{ fontSize: 10, color: "#3d2a00" }}>MEDIUM</span>
                  <span style={{ fontSize: 10, color: "#3d0a0a" }}>HIGH</span>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "14px 16px", marginBottom: 20, borderLeft: `3px solid ${lc.bar}` }}>
              <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>{result.reason}</p>
            </div>

            {/* Breakdown */}
            <div style={{ fontSize: 11, fontWeight: 600, color: "#334155", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 12 }}>Score Breakdown</div>
            <div style={{ marginBottom: 20, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
              {result.breakdown.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "12px 16px", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", borderBottom: i === result.breakdown.length - 1 ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#cbd5e1", marginBottom: 3 }}>{f.factor}</div>
                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{f.detail}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: f.score_impact > 0 ? "#f87171" : "#4ade80", minWidth: 40, textAlign: "right" as const, paddingTop: 2 }}>
                    {f.score_impact > 0 ? "+" : ""}{f.score_impact}
                  </div>
                </div>
              ))}
            </div>

            {/* JSON block */}
            <div style={{ fontSize: 11, fontWeight: 600, color: "#334155", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 10 }}>JSON Response</div>
            <div style={{ background: "#050b15", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px", fontFamily: mono, fontSize: 12, lineHeight: 1.7, color: "#7dd3fc", whiteSpace: "pre" as const, overflowX: "auto" as const, marginBottom: 14 }}>
              {JSON.stringify({ risk_score: result.risk_score, risk_level: result.risk_level, reason: result.reason }, null, 2)}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#1e3a5f" }}>assessed {new Date(result.timestamp).toLocaleTimeString()}</span>
              <button onClick={copyJson} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: copied ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)", color: copied ? "#4ade80" : "#64748b", cursor: "pointer" }}>
                {copied ? "✓ Copied!" : "Copy JSON"}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
            <Logo size={16} />
            <span style={{ fontSize: 12, color: "#334155", fontWeight: 500 }}>TxRisk Checker</span>
          </div>
          <p style={{ fontSize: 11, color: "#1e3a5f", margin: 0 }}>
            Pharos Agent Center · Skill v1.0.0 · Chain 688689
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { background: #0f172a; color: #e2e8f0; }
        input::placeholder { color: #334155; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
