/* global React */
const { useState: useStateMatch } = React;

window.MatchScreen = function MatchScreen({ activeTab, setActiveTab }) {
  const A = window.ARENA;
  const [tab, setTab] = useStateMatch("recap");
  const recap = {
    score: "3-1", us: "P. Espoir", them: "VC Le Mans", date: "Sam 25 oct.", points: 28,
    aces: 4, blocks: 3, errors: 7, attacks: 18, attacksOk: 12,
  };
  const next = { opp: "VC Saint-Cloud", date: "Sam 02 nov.", time: "16:00" };

  return (
    <div style={{ position: "absolute", inset: 0, background: A.bg, color: A.text, fontFamily: A.font, display: "flex", flexDirection: "column" }}>
      <window.StatusBar />
      <window.ArenaHeader section="COMPETITION" title="Match" />

      <div style={{ display: "flex", padding: "10px 16px 0", gap: 6 }}>
        {[{ k: "recap", l: "WEEKEND" }, { k: "next", l: "PROCHAIN" }, { k: "decl", l: "DÉCLARER" }].map((t) => {
          const a = tab === t.k;
          return (
            <button key={t.k} onClick={() => setTab(t.k)} style={{ flex: 1, padding: "7px 0", background: a ? A.neon : "transparent", color: a ? "#0A0E14" : A.textDim, border: a ? "none" : `1px solid ${A.border}`, borderRadius: 6, fontFamily: A.mono, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer" }}>{t.l}</button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 110px" }}>
        {tab === "recap" && (
          <>
            <window.ArenaCard accent={A.neon}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <window.MonoLabel color={A.neon}>// MATCH · {recap.date.toUpperCase()}</window.MonoLabel>
                <span style={{ fontFamily: A.mono, fontSize: 10, color: A.ok, padding: "2px 6px", border: `1px solid ${A.ok}`, borderRadius: 3, fontWeight: 700 }}>VICTOIRE</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ width: 50, height: 50, margin: "0 auto 4px", borderRadius: 999, background: A.surface2, border: `1px solid ${A.neon}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: A.mono, fontSize: 16, fontWeight: 900, color: A.neon }}>PE</div>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{recap.us}</div>
                </div>
                <div style={{ flex: "0 0 auto", textAlign: "center", padding: "0 16px", minWidth: 90 }}>
                  <div style={{ fontFamily: A.mono, fontSize: 34, fontWeight: 900, color: A.neon, letterSpacing: -1, whiteSpace: "nowrap", lineHeight: 1 }}>{recap.score}</div>
                  <div style={{ fontFamily: A.mono, fontSize: 9, color: A.textMuted, marginTop: 4 }}>FINAL</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ width: 50, height: 50, margin: "0 auto 4px", borderRadius: 999, background: A.surface2, border: `1px solid ${A.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: A.mono, fontSize: 16, fontWeight: 900, color: A.textDim }}>LM</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: A.textDim }}>{recap.them}</div>
                </div>
              </div>
            </window.ArenaCard>

            {/* Mes stats du match */}
            <window.ArenaCard accent={A.blue}>
              <window.MonoLabel color={A.blue} style={{ marginBottom: 12 }}>// MES STATS · MATCH</window.MonoLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
                <Stat l="POINTS" v={recap.points} c={A.neon} />
                <Stat l="ACES" v={recap.aces} c={A.blue} />
                <Stat l="BLOCS" v={recap.blocks} c={A.amber} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, fontSize: 11, marginBottom: 6, whiteSpace: "nowrap" }}>
                  <span style={{ color: A.textDim, overflow: "hidden", textOverflow: "ellipsis" }}>Attaques</span>
                  <span style={{ fontFamily: A.mono, color: A.ok, fontWeight: 700, fontSize: 10 }}>{recap.attacksOk}/{recap.attacks} · {Math.round((recap.attacksOk/recap.attacks)*100)}%</span>
                </div>
                <div style={{ height: 6, background: A.bg, borderRadius: 999 }}>
                  <div style={{ width: `${(recap.attacksOk/recap.attacks)*100}%`, height: "100%", background: A.ok, borderRadius: 999 }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, fontSize: 11, marginBottom: 6, whiteSpace: "nowrap" }}>
                  <span style={{ color: A.textDim }}>Erreurs</span>
                  <span style={{ fontFamily: A.mono, color: A.bad, fontWeight: 700, fontSize: 10 }}>{recap.errors}</span>
                </div>
                <div style={{ height: 6, background: A.bg, borderRadius: 999 }}>
                  <div style={{ width: `${(recap.errors/20)*100}%`, height: "100%", background: A.bad, borderRadius: 999 }} />
                </div>
              </div>
            </window.ArenaCard>

            <window.ArenaCard>
              <window.MonoLabel style={{ marginBottom: 8 }}>// SETS</window.MonoLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {[{us:25,them:18},{us:23,them:25},{us:25,them:21},{us:25,them:19}].map((s, i) => (
                  <div key={i} style={{ background: A.bg, border: `1px solid ${A.border}`, borderRadius: 4, padding: "8px 4px", textAlign: "center" }}>
                    <div style={{ fontFamily: A.mono, fontSize: 9, color: A.textMuted, letterSpacing: 1 }}>SET {i+1}</div>
                    <div style={{ fontFamily: A.mono, fontSize: 14, color: s.us > s.them ? A.neon : A.textDim, fontWeight: 800, marginTop: 2 }}>{s.us}-{s.them}</div>
                  </div>
                ))}
              </div>
            </window.ArenaCard>
          </>
        )}

        {tab === "next" && (
          <window.ArenaCard accent={A.amber}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <window.MonoLabel color={A.amber}>// PROCHAIN MATCH</window.MonoLabel>
              <span style={{ fontFamily: A.mono, fontSize: 10, color: A.amber, fontWeight: 700 }}>J-6</span>
            </div>
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontFamily: A.mono, fontSize: 22, fontWeight: 800, color: A.text }}>{next.opp}</div>
              <div style={{ fontFamily: A.mono, fontSize: 12, color: A.neon, marginTop: 4 }}>{next.date} · {next.time}</div>
            </div>
            <button style={{ width: "100%", padding: 12, background: "transparent", border: `1px solid ${A.neon}`, color: A.neon, borderRadius: 6, fontFamily: A.mono, fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 1 }}>▸ AJOUTER AU CALENDRIER</button>
          </window.ArenaCard>
        )}

        {tab === "decl" && (
          <window.ArenaCard accent={A.neon}>
            <window.MonoLabel color={A.neon} style={{ marginBottom: 12 }}>// DÉCLARER MON MATCH</window.MonoLabel>
            <div style={{ fontSize: 12, color: A.textDim, marginBottom: 14, lineHeight: 1.5 }}>Renseigne les infos de ton prochain match pour qu'il soit suivi sur Pôle TV.</div>
            <input placeholder="Adversaire" style={{ width: "100%", padding: "10px 12px", background: A.bg, border: `1px solid ${A.border}`, color: A.text, borderRadius: 4, fontFamily: A.font, fontSize: 12, marginBottom: 8, boxSizing: "border-box" }} />
            <input type="date" style={{ width: "100%", padding: "10px 12px", background: A.bg, border: `1px solid ${A.border}`, color: A.text, borderRadius: 4, fontFamily: A.font, fontSize: 12, marginBottom: 8, boxSizing: "border-box" }} />
            <input placeholder="Lieu" style={{ width: "100%", padding: "10px 12px", background: A.bg, border: `1px solid ${A.border}`, color: A.text, borderRadius: 4, fontFamily: A.font, fontSize: 12, marginBottom: 12, boxSizing: "border-box" }} />
            <button style={{ width: "100%", padding: 12, background: A.neon, color: "#0A0E14", border: "none", borderRadius: 6, fontFamily: A.mono, fontSize: 11, fontWeight: 800, cursor: "pointer", letterSpacing: 1.5 }}>▸ ENREGISTRER</button>
          </window.ArenaCard>
        )}
      </div>

      <window.ArenaTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

function Stat({ l, v, c }) {
  const A = window.ARENA;
  return (
    <div style={{ background: A.bg, border: `1px solid ${A.border}`, borderRadius: 4, padding: "8px 6px", textAlign: "center" }}>
      <div style={{ fontFamily: A.mono, fontSize: 9, color: A.textMuted, letterSpacing: 1 }}>{l}</div>
      <div style={{ fontFamily: A.mono, fontSize: 22, fontWeight: 900, color: c, lineHeight: 1, marginTop: 2 }}>{v}</div>
    </div>
  );
}
