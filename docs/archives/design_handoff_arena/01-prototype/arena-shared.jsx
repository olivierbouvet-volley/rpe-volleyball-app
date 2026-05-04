/* global React */
// ARENA design system tokens
window.ARENA = {
  bg: "#0A0E14",
  bg2: "#0F141C",
  surface: "#11161F",
  surface2: "#131923",
  border: "#1A1F2A",
  borderSoft: "#222938",
  text: "#E8EAED",
  textDim: "#9CA3AF",
  textMuted: "#6B7280",
  textFaint: "#4B5563",
  neon: "#C8FF00",       // primary — green
  pink: "#FF2E97",       // alerts / cycle
  blue: "#00D9FF",       // secondary stats
  amber: "#FFB627",      // warnings
  ok: "#10C57E",
  bad: "#FF5252",
  font: '"Inter", system-ui, sans-serif',
  mono: '"JetBrains Mono", monospace',
};

// Status bar (battery / signal / time)
window.StatusBar = function StatusBar() {
  return (
    <div style={{ height: 44, padding: "12px 22px 0", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#E8EAED", fontFamily: window.ARENA.mono, fontSize: 13, fontWeight: 600, position: "relative", zIndex: 50 }}>
      <span>9:41</span>
      <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "#9CA3AF" }}>●●●●  100%</span>
    </div>
  );
};

// Top bar — section label, title, optional right element
window.ArenaHeader = function ArenaHeader({ section, title, right }) {
  const A = window.ARENA;
  return (
    <div style={{ padding: "8px 20px 14px", borderBottom: `1px solid ${A.border}`, position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, fontFamily: A.mono, color: A.neon, textTransform: "uppercase", marginBottom: 4 }}>// {section}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: A.text, letterSpacing: -0.5 }}>{title}</div>
        </div>
        {right}
      </div>
    </div>
  );
};

// Bottom tab bar — 6 tabs (Check, RPE, Stats, PPhys, Match, Album)
window.ArenaTabBar = function ArenaTabBar({ activeTab, setActiveTab }) {
  const A = window.ARENA;
  const tabs = [
    { key: "checkin", label: "CHECK", icon: "✓" },
    { key: "rpe", label: "RPE", icon: "↯" },
    { key: "stats", label: "STATS", icon: "▦" },
    { key: "pphys", label: "PPHYS", icon: "≡" },
    { key: "match", label: "MATCH", icon: "◆" },
    { key: "album", label: "ALBUM", icon: "★" },
  ];
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(10,14,20,0.95)", backdropFilter: "blur(12px)", borderTop: `1px solid ${A.border}`, padding: "10px 8px 22px", display: "flex", gap: 0, zIndex: 40 }}>
      {tabs.map((t) => {
        const a = activeTab === t.key;
        return (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: 1, background: "transparent", border: "none", color: a ? A.neon : A.textFaint, padding: "6px 0", cursor: "pointer", fontFamily: A.mono, fontWeight: 700, fontSize: 9, letterSpacing: 1, position: "relative", transition: "color 150ms" }}>
            {a && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", width: 28, height: 2, background: A.neon, borderRadius: 999 }} />}
            <div style={{ fontSize: 16, marginBottom: 3 }}>{t.icon}</div>
            <div>{t.label}</div>
          </button>
        );
      })}
    </div>
  );
};

// Reusable: monospace label
window.MonoLabel = function MonoLabel({ children, color, style }) {
  const A = window.ARENA;
  return <div style={{ fontFamily: A.mono, fontSize: 10, letterSpacing: 1.5, color: color || A.textMuted, textTransform: "uppercase", ...style }}>{children}</div>;
};

// Reusable: card surface
window.ArenaCard = function ArenaCard({ children, accent, style }) {
  const A = window.ARENA;
  return (
    <div style={{ background: A.surface, border: `1px solid ${accent ? accent + "40" : A.border}`, borderRadius: 10, padding: "14px 14px", marginBottom: 10, position: "relative", ...style }}>
      {children}
    </div>
  );
};

// Reusable: neon segmented value scale (0-10)
window.SegScale = function SegScale({ value, setValue, max = 10, color }) {
  const A = window.ARENA;
  const c = color || A.neon;
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[...Array(max)].map((_, i) => {
        const filled = i < value;
        return (
          <button key={i} onClick={() => setValue(i + 1)} style={{ flex: 1, height: 30, background: filled ? c : "transparent", border: filled ? "none" : `1px solid ${A.border}`, borderRadius: 3, cursor: "pointer", fontSize: 10, fontFamily: A.mono, fontWeight: 700, color: filled ? "#0A0E14" : A.textFaint, transition: "all 100ms" }}>{i + 1}</button>
        );
      })}
    </div>
  );
};
