/* global React */
const { useState: useStateStats } = React;

// MES STATS — graphiques cycle × performance, ATL/CTL, symptômes, charge hebdo
window.StatsScreen = function StatsScreen({ activeTab, setActiveTab }) {
  const A = window.ARENA;
  const [period, setPeriod] = useStateStats("month"); // week / month / cycle

  // Synthetic data: 28 days — 3 courbes : énergie, performance, symptômes
  // Phases : J1-J5 menstruelle (rouge), J6-J13 folliculaire (cyan), J14-J16 ovulation (vert), J17-J28 lutéale (rose)
  const days = [...Array(28)].map((_, i) => {
    const d = i + 1;
    let phase = "luteal";
    let phaseColor = A.pink;
    if (d <= 5) { phase = "menstrual"; phaseColor = A.bad; }
    else if (d <= 13) { phase = "follicular"; phaseColor = A.blue; }
    else if (d <= 16) { phase = "ovulation"; phaseColor = A.neon; }

    // Énergie : creuse pdt règles (3-5), monte folli (7-9), pic ovu (8-9), descend lutéale (5-7)
    const energyBase = phase === "menstrual" ? 4.0 : phase === "follicular" ? 7.8 : phase === "ovulation" ? 8.6 : 5.8;
    const energy = +(energyBase + Math.sin(d * 0.55) * 0.6).toFixed(1);

    // Performance (objective : RPE inversé / charge soutenue) : très haut folli/ovu, dégradée pdt règles + lutéale tardive
    const perfBase = phase === "menstrual" ? 4.5 : phase === "follicular" ? 8.0 : phase === "ovulation" ? 8.8 : 6.2;
    const perf = +(perfBase + Math.sin(d * 0.7) * 0.5).toFixed(1);

    // Symptômes : pic J1-J3 (8-9), bas folli/ovu (1-2), remonte SPM J24-J28 (5-7)
    let sympBase;
    if (d <= 3) sympBase = 8.0;
    else if (d <= 5) sympBase = 5.5;
    else if (d <= 13) sympBase = 1.5;
    else if (d <= 16) sympBase = 1.8;
    else if (d <= 23) sympBase = 3.2;
    else sympBase = 6.5; // SPM
    const symptoms = +(Math.max(0, sympBase + Math.sin(d * 0.9) * 0.6)).toFixed(1);

    const rpe = +(5 + Math.sin(d * 0.5) * 2).toFixed(1);
    const sleep = +(7 + Math.cos(d * 0.4) * 1.5).toFixed(1);
    const charge = Math.round(rpe * (60 + (d % 3) * 30));
    return { d, phase, phaseColor, perf, energy, symptoms, rpe, sleep, charge };
  });

  const atl = 580;  // acute load (7d avg)
  const ctl = 520;  // chronic load (28d avg)
  const ratio = (atl / ctl).toFixed(2);
  const ratioStatus = ratio < 0.8 ? "DÉSENT." : ratio > 1.5 ? "RISQUE" : ratio > 1.3 ? "TENDU" : "OPTIMAL";
  const ratioColor = ratio < 0.8 ? A.blue : ratio > 1.5 ? A.bad : ratio > 1.3 ? A.amber : A.ok;

  return (
    <div style={{ position: "absolute", inset: 0, background: A.bg, color: A.text, fontFamily: A.font, display: "flex", flexDirection: "column" }}>
      <window.StatusBar />
      <window.ArenaHeader section="ANALYTICS" title="Mes Stats"
        right={<div style={{ fontFamily: A.mono, fontSize: 10, color: A.neon, padding: "4px 8px", border: `1px solid ${A.neon}`, borderRadius: 4 }}>● LIVE</div>} />

      <div style={{ display: "flex", padding: "10px 16px 0", gap: 6 }}>
        {[{ k: "week", l: "7J" }, { k: "month", l: "28J" }, { k: "cycle", l: "CYCLE" }].map((t) => {
          const a = period === t.k;
          return (
            <button key={t.k} onClick={() => setPeriod(t.k)} style={{ flex: 1, padding: "7px 0", background: a ? A.neon : "transparent", color: a ? "#0A0E14" : A.textDim, border: a ? "none" : `1px solid ${A.border}`, borderRadius: 6, fontFamily: A.mono, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer" }}>{t.l}</button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 110px" }}>
        {/* Charge ATL / CTL / Ratio */}
        <window.ArenaCard accent={ratioColor}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <window.MonoLabel color={A.neon}>// CHARGE D'ENTRAÎNEMENT</window.MonoLabel>
              <div style={{ fontSize: 11, color: A.textDim, marginTop: 4, fontFamily: A.mono }}>Aiguë (7j) / Chronique (28j)</div>
            </div>
            <div style={{ fontFamily: A.mono, fontSize: 10, color: ratioColor, padding: "3px 8px", border: `1px solid ${ratioColor}`, borderRadius: 4, fontWeight: 700, letterSpacing: 1 }}>{ratioStatus}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            <Stat label="ATL" val={atl} sub="7J" color={A.amber} />
            <Stat label="CTL" val={ctl} sub="28J" color={A.blue} />
            <Stat label="A:C" val={ratio} sub="RATIO" color={ratioColor} />
          </div>
          {/* dual line chart */}
          <svg width="100%" height="80" viewBox="0 0 320 80" preserveAspectRatio="none">
            <defs>
              <linearGradient id="atl-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={A.amber} stopOpacity="0.3" /><stop offset="100%" stopColor={A.amber} stopOpacity="0" /></linearGradient>
            </defs>
            {[...Array(10)].map((_, i) => <line key={i} x1={i * 35} y1="0" x2={i * 35} y2="80" stroke={A.border} strokeWidth="0.5" />)}
            <path d="M 0 50 L 35 48 L 70 42 L 105 38 L 140 35 L 175 32 L 210 30 L 245 28 L 280 25 L 320 22" stroke={A.blue} strokeWidth="2" fill="none" />
            <path d="M 0 65 L 35 60 L 70 50 L 105 42 L 140 28 L 175 35 L 210 25 L 245 20 L 280 15 L 320 12 L 320 80 L 0 80 Z" fill="url(#atl-grad)" />
            <path d="M 0 65 L 35 60 L 70 50 L 105 42 L 140 28 L 175 35 L 210 25 L 245 20 L 280 15 L 320 12" stroke={A.amber} strokeWidth="2" fill="none" />
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, fontFamily: A.mono, color: A.textMuted }}>
            <span style={{ display: "flex", gap: 6 }}><span style={{ width: 8, height: 2, background: A.amber, marginTop: 5 }} /> ATL</span>
            <span style={{ display: "flex", gap: 6 }}><span style={{ width: 8, height: 2, background: A.blue, marginTop: 5 }} /> CTL</span>
            <span>4 SEM.</span>
          </div>
        </window.ArenaCard>

        {/* CYCLE × PERFORMANCE — 3 courbes superposées */}
        <CyclePerfChart days={days} A={A} />


        {/* Symptômes heatmap */}
        <window.ArenaCard accent={A.amber}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <window.MonoLabel color={A.amber}>// SYMPTÔMES · 28J</window.MonoLabel>
            <span style={{ fontFamily: A.mono, fontSize: 10, color: A.textMuted }}>0 ── 10</span>
          </div>
          {[
            { l: "Crampes", v: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,5,7,8,6,4,2,1,0] },
            { l: "Fatigue", v: [6,7,5,4,3,2,2,3,3,2,2,3,4,3,3,4,5,6,7,7,8,7,6,5,4,4,5,6] },
            { l: "Humeur", v: [8,8,7,5,4,3,2,2,2,2,2,3,3,3,4,5,6,7,8,8,7,6,5,4,3,2,2,3] },
            { l: "Mal de dos", v: [3,4,5,4,3,1,0,0,0,1,1,1,1,2,2,2,3,4,5,6,7,5,4,3,2,1,1,2] },
            { l: "Maux tête", v: [2,3,4,3,2,1,0,0,1,1,2,1,1,2,2,3,3,4,5,5,6,4,3,2,1,1,2,3] },
          ].map((s, ri) => (
            <div key={ri} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: A.textDim, flex: "0 0 70px", fontFamily: A.mono }}>{s.l}</span>
              <div style={{ flex: 1, display: "flex", gap: 1 }}>
                {s.v.map((val, i) => {
                  const c = val === 0 ? A.surface2 : val <= 3 ? A.ok : val <= 6 ? A.amber : A.bad;
                  const op = val === 0 ? 0.3 : 0.4 + val * 0.06;
                  return <div key={i} style={{ flex: 1, height: 14, background: c, opacity: op, borderRadius: 1 }} title={`J${i+1}: ${val}`} />;
                })}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, fontFamily: A.mono, color: A.textMuted }}>
            <span>J1</span><span>J14</span><span>J28</span>
          </div>
        </window.ArenaCard>

        {/* Weekly charge bars */}
        <window.ArenaCard>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <window.MonoLabel>// CHARGE HEBDO · 6 SEM.</window.MonoLabel>
            <span style={{ fontFamily: A.mono, fontSize: 10, color: A.ok }}>▲ +12%</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
            {[420, 510, 580, 490, 620, 580].map((v, i) => {
              const isLast = i === 5;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontFamily: A.mono, fontSize: 9, color: isLast ? A.neon : A.textMuted, fontWeight: 700 }}>{v}</div>
                  <div style={{ width: "100%", height: (v / 700) * 60, background: isLast ? A.neon : A.surface2, border: isLast ? "none" : `1px solid ${A.border}`, borderRadius: 2 }} />
                  <div style={{ fontFamily: A.mono, fontSize: 8, color: A.textMuted }}>S-{5 - i}</div>
                </div>
              );
            })}
          </div>
        </window.ArenaCard>

        {/* Phase actuelle hint */}
        <div style={{ background: `linear-gradient(135deg, ${A.pink}15, transparent)`, border: `1px solid ${A.pink}40`, borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
          <window.MonoLabel color={A.pink}>// PHASE ACTUELLE · J22 LUTÉALE</window.MonoLabel>
          <div style={{ fontSize: 12, color: A.textDim, marginTop: 6, lineHeight: 1.5 }}>
            Énergie en baisse, privilégie les <span style={{ color: A.neon }}>séances tech.</span> et la <span style={{ color: A.neon }}>récup</span>. Évite les charges max sur 1RM.
          </div>
        </div>
      </div>

      <window.ArenaTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

function Stat({ label, val, sub, color }) {
  const A = window.ARENA;
  return (
    <div style={{ background: A.bg, border: `1px solid ${A.border}`, borderRadius: 6, padding: "8px 10px" }}>
      <div style={{ fontFamily: A.mono, fontSize: 9, color: A.textMuted, letterSpacing: 1.5 }}>{label}</div>
      <div style={{ fontFamily: A.mono, fontSize: 22, fontWeight: 800, color, lineHeight: 1.1, marginTop: 2 }}>{val}</div>
      <div style={{ fontFamily: A.mono, fontSize: 9, color: A.textMuted, letterSpacing: 1 }}>{sub}</div>
    </div>
  );
}

// ============================================================================
// CYCLE × PERFORMANCE — 3 courbes (énergie, performance, symptômes)
// superposées sur les bandes des 4 phases. SVG hi-fi avec gradients + grille.
// ============================================================================
function CyclePerfChart({ days, A }) {
  const W = 320, H = 180;          // viewBox
  const padL = 22, padR = 8, padT = 8, padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xOf = (i) => padL + (i / (days.length - 1)) * innerW;
  const yOf = (v) => padT + innerH - (v / 10) * innerH;

  const pathFor = (key) => days.map((d, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(d[key]).toFixed(1)}`).join(" ");
  const areaFor = (key) => `${pathFor(key)} L ${xOf(days.length - 1)} ${padT + innerH} L ${xOf(0)} ${padT + innerH} Z`;

  // Bandes phases
  const phaseBands = [
    { from: 0, to: 4, c: A.bad, l: "MENSTRUELLE", short: "MENST." },
    { from: 5, to: 12, c: A.blue, l: "FOLLICULAIRE", short: "FOLLI." },
    { from: 13, to: 15, c: A.neon, l: "OVULATION", short: "OVU." },
    { from: 16, to: 27, c: A.pink, l: "LUTÉALE", short: "LUT." },
  ];

  // moyennes par phase pour insight
  const avgIn = (key, from, to) => {
    const arr = days.slice(from, to + 1);
    return arr.reduce((s, d) => s + d[key], 0) / arr.length;
  };
  const perfFolli = avgIn("perf", 5, 12);
  const perfLut = avgIn("perf", 16, 27);
  const gain = Math.round(((perfFolli - perfLut) / perfLut) * 100);

  return (
    <window.ArenaCard accent={A.pink}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <window.MonoLabel color={A.pink}>// CYCLE × PERFORMANCE</window.MonoLabel>
          <div style={{ fontSize: 11, color: A.textDim, marginTop: 4 }}>Énergie · Performance · Symptômes (J1–J28)</div>
        </div>
        <div style={{ fontFamily: A.mono, fontSize: 10, color: A.neon, fontWeight: 700, padding: "3px 6px", border: `1px solid ${A.neon}40`, borderRadius: 3 }}>★ PIC J15</div>
      </div>

      {/* Légende 3 courbes */}
      <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        {[
          { l: "Énergie", c: A.amber, dash: false },
          { l: "Performance", c: A.neon, dash: false },
          { l: "Symptômes", c: A.pink, dash: true },
        ].map((p) => (
          <div key={p.l} style={{ fontSize: 10, fontFamily: A.mono, color: A.textDim, display: "flex", alignItems: "center", gap: 6, letterSpacing: 0.5 }}>
            <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke={p.c} strokeWidth="2" strokeDasharray={p.dash ? "3,2" : ""} /></svg>
            <span>{p.l}</span>
          </div>
        ))}
      </div>

      {/* Le graphe */}
      <div style={{ position: "relative" }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
          <defs>
            <linearGradient id="cp-energy" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={A.amber} stopOpacity="0.28" /><stop offset="100%" stopColor={A.amber} stopOpacity="0" /></linearGradient>
            <linearGradient id="cp-perf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={A.neon} stopOpacity="0.32" /><stop offset="100%" stopColor={A.neon} stopOpacity="0" /></linearGradient>
          </defs>

          {/* Bandes phases (fond) */}
          {phaseBands.map((b, i) => {
            const x1 = xOf(b.from) - (i === 0 ? padL : 0);
            const x2 = xOf(b.to) + (i === phaseBands.length - 1 ? padR : 0);
            const w = x2 - x1;
            return (
              <g key={i}>
                <rect x={x1} y={padT} width={w} height={innerH} fill={b.c} fillOpacity="0.06" />
                {i > 0 && <line x1={x1} y1={padT} x2={x1} y2={padT + innerH} stroke={b.c} strokeWidth="1" strokeOpacity="0.35" strokeDasharray="2,3" />}
              </g>
            );
          })}

          {/* Grille horizontale + axe Y */}
          {[0, 2.5, 5, 7.5, 10].map((v, i) => (
            <g key={i}>
              <line x1={padL} y1={yOf(v)} x2={W - padR} y2={yOf(v)} stroke={A.borderSoft} strokeWidth="0.5" strokeDasharray="1,3" />
              <text x={padL - 4} y={yOf(v) + 3} textAnchor="end" fontSize="8" fontFamily="JetBrains Mono, monospace" fill={A.textMuted}>{v}</text>
            </g>
          ))}

          {/* Aire énergie */}
          <path d={areaFor("energy")} fill="url(#cp-energy)" />

          {/* Aire performance */}
          <path d={areaFor("perf")} fill="url(#cp-perf)" />

          {/* Courbe énergie (amber) */}
          <path d={pathFor("energy")} stroke={A.amber} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />

          {/* Courbe performance (neon, plus épaisse) */}
          <path d={pathFor("perf")} stroke={A.neon} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${A.neon}aa)` }} />

          {/* Courbe symptômes (pink, dashed) */}
          <path d={pathFor("symptoms")} stroke={A.pink} strokeWidth="1.8" fill="none" strokeDasharray="4,3" strokeLinejoin="round" strokeLinecap="round" />

          {/* Pic J15 marker */}
          <circle cx={xOf(14)} cy={yOf(days[14].perf)} r="4" fill={A.neon} stroke={A.bg} strokeWidth="1.5" />
          <circle cx={xOf(14)} cy={yOf(days[14].perf)} r="8" fill="none" stroke={A.neon} strokeWidth="1" strokeOpacity="0.4" />

          {/* Étiquettes phases (haut) */}
          {phaseBands.map((b, i) => {
            const xMid = (xOf(b.from) + xOf(b.to)) / 2;
            return (
              <text key={i} x={xMid} y={padT + 9} textAnchor="middle" fontSize="7" fontFamily="JetBrains Mono, monospace" fontWeight="700" fill={b.c} letterSpacing="1">{b.short}</text>
            );
          })}

          {/* Axe X jours */}
          {[0, 6, 13, 20, 27].map((i) => (
            <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize="8" fontFamily="JetBrains Mono, monospace" fill={A.textMuted}>J{i + 1}</text>
          ))}
          <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke={A.border} strokeWidth="1" />
        </svg>
      </div>

      {/* Insights */}
      <div style={{ marginTop: 10, padding: "10px 12px", background: A.bg, border: `1px solid ${A.borderSoft}`, borderRadius: 4, fontSize: 11, color: A.textDim, lineHeight: 1.6 }}>
        <div style={{ fontFamily: A.mono, fontSize: 9, color: A.neon, letterSpacing: 1.5, marginBottom: 4 }}>▸ INSIGHTS</div>
        <div>Performance <span style={{ color: A.neon, fontWeight: 700 }}>+{gain}%</span> en folliculaire vs lutéale</div>
        <div style={{ marginTop: 2 }}>Symptômes max en <span style={{ color: A.bad, fontWeight: 700 }}>J1–J3</span> et SPM <span style={{ color: A.pink, fontWeight: 700 }}>J24–J28</span></div>
      </div>
    </window.ArenaCard>
  );
}
