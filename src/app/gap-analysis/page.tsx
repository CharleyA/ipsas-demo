"use client";

export default function GapAnalysisPage() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#0f2044", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ maxWidth: 520, textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Gap Analysis &amp; Implementation Roadmap</h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
          IPSAS School Finance System — April 2026<br />
          5-page PDF document covering all findings, gaps, and the phased implementation plan.
        </p>
        <a
          href="/gap-analysis.pdf"
          download="IPSAS-Gap-Analysis-2026.pdf"
          style={{
            display: "inline-block",
            background: "#2563eb",
            color: "#fff",
            padding: "14px 32px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 16,
            textDecoration: "none",
            marginBottom: 16,
            cursor: "pointer",
          }}
        >
          ⬇ Download PDF
        </a>
        <br />
        <a
          href="/gap-analysis.pdf"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            color: "rgba(255,255,255,0.5)",
            fontSize: 13,
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          Open in new tab
        </a>

        <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "left" }}>
          {[
            { icon: "✓", label: "Executive Summary", desc: "KPI cards + master status table" },
            { icon: "✓", label: "Working Features", desc: "15 confirmed, fully verified" },
            { icon: "⚠", label: "8 Gaps Identified", desc: "Root cause + fix for each" },
            { icon: "→", label: "4-Phase Roadmap", desc: "Effort estimates per task" },
          ].map((item) => (
            <div key={item.label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{item.label}</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
