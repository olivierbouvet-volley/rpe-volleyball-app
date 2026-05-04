/* global React */
const { useState: useStatePPhys } = React;

window.PPhysScreen = function PPhysScreen({ activeTab, setActiveTab }) {
  const A = window.ARENA;
  // 8 exos du cahier des charges
  const exercises = [
    { name: "Back Squat", code: "BSQ", max: 78, evol: "+4", best: false },
    { name: "Hip Thrust", code: "HPT", max: 105, evol: "+8", best: true },
    { name: "Soulevé de Terre", code: "SDT", max: 88, evol: "+5", best: false },
    { name: "Dévelp. Couché", code: "DC", max: 42, evol: "+2", best: false },
    { name: "Traction", code: "TRC", max: 25, evol: "+2", best: false },
    { name: "Tirage Banc", code: "TIR", max: 38, evol: "+3", best: false },
    { name: "Pull Over", code: "PO", max: 18, evol: "0", best: false },
    { name: "Épaule", code: "EP", max: 22, evol: "+1", best: false },
  ];
  const [selected, setSelected] = useStatePPhys(0);
  const [mode, setMode] = useStatePPhys("percent"); // percent / reps
  const [percent, setPercent] = useStatePPhys(80);
  const [reps, setReps] = useStatePPhys(5);
  const ex = exercises[selected];
  // Epley inverse: 1RM = charge × (1 + reps/30) → charge = 1RM / (1 + reps/30)
  const charge = mode === "percent"
    ? Math.round((ex.max * percent) / 100 * 10) / 10
    : Math.round((ex.max / (1 + reps / 30)) * 10) / 10;

  return (
    <div style={{ position: "absolute", inset: 0, background: A.bg, color: A.text, fontFamily: A.font, display: "flex", flexDirection: "column" }}>
      <window.StatusBar />
      <window.ArenaHeader section="STRENGTH" title="PPhys / 1RM" />

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 110px" }}>
        <window.MonoLabel style={{ marginBottom: 8 }}>// MES MAXIMUMS · {exercises.length} EXOS</window.MonoLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginBottom: 14 }}>
          {exercises.map((e, i) => {
            const a = selected === i;
            return (
              <button key={i} onClick={() => setSelected(i)} style={{ background: a ? A.surface2 : A.surface, border: `1px solid ${a ? A.neon : A.border}`, borderRadius: 8, padding: "10px 11px", textAlign: "left", cursor: "pointer", fontFamily: A.font, color: A.text, position: "relative" }}>
                {e.best && <div style={{ position: "absolute", top: 6, right: 6, fontSize: 7, padding: "2px 5px", background: A.amber, color: "#0A0E14", borderRadius: 2, fontWeight: 900, letterSpacing: 0.5, fontFamily: A.mono }}>★ BEST</div>}
                <div style={{ fontFamily: A.mono, fontSize: 9, color: A.textMuted, letterSpacing: 1 }}>{e.code}</div>
                <div style={{ fontSize: 11, color: A.textDim, fontWeight: 600, marginTop: 1 }}>{e.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
                  <span style={{ fontFamily: A.mono, fontSize: 22, fontWeight: 800, color: a ? A.neon : A.text, letterSpacing: -0.5 }}>{e.max}</span>
                  <span style={{ fontFamily: A.mono, fontSize: 10, color: A.textMuted }}>kg</span>
                  <span style={{ marginLeft: "auto", fontFamily: A.mono, fontSize: 10, color: e.evol === "0" ? A.textMuted : A.ok, fontWeight: 700 }}>{e.evol !== "0" ? "▲" : "—"} {e.evol}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Calculator */}
        <window.ArenaCard accent={A.neon}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <window.MonoLabel color={A.neon}>// CALCULATEUR DE CHARGE</window.MonoLabel>
            <span style={{ fontFamily: A.mono, fontSize: 10, color: A.textDim }}>{ex.code} · {ex.max}kg</span>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            <button onClick={() => setMode("percent")} style={{ flex: 1, padding: "8px 0", background: mode === "percent" ? A.surface2 : "transparent", border: `1px solid ${mode === "percent" ? A.neon : A.border}`, color: mode === "percent" ? A.neon : A.textMuted, borderRadius: 4, fontFamily: A.mono, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>% du 1RM</button>
            <button onClick={() => setMode("reps")} style={{ flex: 1, padding: "8px 0", background: mode === "reps" ? A.surface2 : "transparent", border: `1px solid ${mode === "reps" ? A.neon : A.border}`, color: mode === "reps" ? A.neon : A.textMuted, borderRadius: 4, fontFamily: A.mono, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>RÉPÉTITIONS</button>
          </div>

          {mode === "percent" ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <window.MonoLabel>POURCENTAGE</window.MonoLabel>
                <span style={{ fontFamily: A.mono, fontSize: 14, color: A.neon, fontWeight: 800 }}>{percent}%</span>
              </div>
              <input type="range" min="40" max="100" value={percent} onChange={(e) => setPercent(parseInt(e.target.value))} style={{ width: "100%", accentColor: A.neon }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, fontFamily: A.mono, color: A.textMuted }}><span>40</span><span>70</span><span>100</span></div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <window.MonoLabel>RÉPÉTITIONS · EPLEY⁻¹</window.MonoLabel>
                <span style={{ fontFamily: A.mono, fontSize: 14, color: A.neon, fontWeight: 800 }}>{reps} reps</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[1,3,5,8,10,12].map((r) => (
                  <button key={r} onClick={() => setReps(r)} style={{ flex: 1, padding: "8px 0", background: reps === r ? A.neon : "transparent", color: reps === r ? "#0A0E14" : A.textDim, border: reps === r ? "none" : `1px solid ${A.border}`, borderRadius: 4, fontFamily: A.mono, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{r}</button>
                ))}
              </div>
            </>
          )}

          <div style={{ marginTop: 14, padding: "12px 14px", background: A.bg, border: `1px solid ${A.neon}60`, borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <window.MonoLabel color={A.neon}>CHARGE À UTILISER</window.MonoLabel>
              <div style={{ fontFamily: A.mono, fontSize: 9, color: A.textMuted, marginTop: 2 }}>{mode === "percent" ? `${ex.max} × ${percent}%` : `${ex.max} ÷ (1 + ${reps}/30)`}</div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: A.mono, fontSize: 32, fontWeight: 900, color: A.neon, letterSpacing: -1 }}>{charge}</span>
              <span style={{ fontFamily: A.mono, fontSize: 13, color: A.textDim }}>kg</span>
            </div>
          </div>
        </window.ArenaCard>

        {/* Progression chart */}
        <window.ArenaCard>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <window.MonoLabel>// PROGRESSION · 6 MOIS</window.MonoLabel>
            <span style={{ fontFamily: A.mono, fontSize: 10, color: A.ok, fontWeight: 700 }}>▲ +18%</span>
          </div>
          <svg width="100%" height="80" viewBox="0 0 280 80" preserveAspectRatio="none">
            <defs>
              <linearGradient id="prog-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={A.neon} stopOpacity="0.4" /><stop offset="100%" stopColor={A.neon} stopOpacity="0" /></linearGradient>
            </defs>
            <path d="M 0 60 L 47 55 L 94 50 L 140 42 L 187 38 L 234 30 L 280 18 L 280 80 L 0 80 Z" fill="url(#prog-grad)" />
            <path d="M 0 60 L 47 55 L 94 50 L 140 42 L 187 38 L 234 30 L 280 18" stroke={A.neon} strokeWidth="2" fill="none" />
            <circle cx="280" cy="18" r="4" fill={A.neon} />
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, fontFamily: A.mono, color: A.textMuted }}><span>MAI</span><span>JUL</span><span>SEP</span><span>NOV</span></div>
        </window.ArenaCard>

        {/* Team rank */}
        <window.ArenaCard accent={A.amber}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <window.MonoLabel color={A.amber}>// CLASSEMENT ÉQUIPE · {ex.code}</window.MonoLabel>
            <span style={{ fontFamily: A.mono, fontSize: 10, color: A.amber, fontWeight: 800 }}>#3 / 14</span>
          </div>
          {[
            { r: 1, n: "Lise V.", v: 92 },
            { r: 2, n: "Cyrielle M.", v: 88 },
            { r: 3, n: "Toi", v: ex.max, me: true },
            { r: 4, n: "Léa T.", v: 75 },
          ].map((p) => (
            <div key={p.r} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: p.r === 1 ? "none" : `1px solid ${A.borderSoft}` }}>
              <span style={{ fontFamily: A.mono, fontSize: 10, color: p.me ? A.neon : A.textMuted, fontWeight: 800, width: 22 }}>#{p.r}</span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: p.me ? 800 : 600, color: p.me ? A.neon : A.text }}>{p.n}</span>
              <div style={{ flex: 1, height: 4, background: A.bg, borderRadius: 999 }}>
                <div style={{ width: `${(p.v / 92) * 100}%`, height: "100%", background: p.me ? A.neon : A.borderSoft, borderRadius: 999 }} />
              </div>
              <span style={{ fontFamily: A.mono, fontSize: 11, fontWeight: 700, color: p.me ? A.neon : A.textDim, width: 40, textAlign: "right" }}>{p.v}kg</span>
            </div>
          ))}
        </window.ArenaCard>
      </div>

      <window.ArenaTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};
