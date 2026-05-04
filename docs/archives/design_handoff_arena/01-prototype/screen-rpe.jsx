/* global React */
const { useState: useStateRPE } = React;

window.RPEScreen = function RPEScreen({ activeTab, setActiveTab }) {
  const A = window.ARENA;
  const [step, setStep] = useStateRPE(1);
  const [type, setType] = useStateRPE("");
  const [duration, setDuration] = useStateRPE(90);
  const [rpe, setRpe] = useStateRPE(0);
  const [comment, setComment] = useStateRPE("");
  const [submitted, setSubmitted] = useStateRPE(false);

  const types = [
    { v: "Volley", l: "VOLLEY", c: A.neon, em: "🏐" },
    { v: "Muscu", l: "MUSCU", c: A.blue, em: "💪" },
    { v: "Cardio", l: "CARDIO", c: A.amber, em: "↯" },
    { v: "Muscu+Volley", l: "M+V", c: "#A855F7", em: "💪🏐" },
    { v: "Match", l: "MATCH", c: A.bad, em: "🏆" },
  ];
  const charge = rpe * duration;
  const rpeColor = rpe <= 3 ? A.ok : rpe <= 6 ? A.amber : rpe <= 8 ? "#FF8A3D" : A.bad;
  const rpeLabel = rpe === 0 ? "—" : rpe <= 2 ? "Très facile" : rpe <= 4 ? "Facile" : rpe <= 6 ? "Modéré" : rpe <= 8 ? "Dur" : "Maximal";

  return (
    <div style={{ position: "absolute", inset: 0, background: A.bg, color: A.text, fontFamily: A.font, display: "flex", flexDirection: "column" }}>
      <window.StatusBar />
      <window.ArenaHeader section="POST_SESSION" title="Log RPE"
        right={<div style={{ fontFamily: A.mono, fontSize: 10, color: A.textMuted, padding: "4px 8px", border: `1px solid ${A.border}`, borderRadius: 4 }}>STEP {step}/4</div>} />

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 110px" }}>
        {/* Step 1: type */}
        <window.ArenaCard accent={step === 1 ? A.neon : null}>
          <window.MonoLabel color={step === 1 ? A.neon : A.textMuted} style={{ marginBottom: 12 }}>// 01 · TYPE DE SÉANCE</window.MonoLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
            {types.map((t) => {
              const a = type === t.v;
              return (
                <button key={t.v} onClick={() => { setType(t.v); setStep(2); }} style={{ aspectRatio: "0.85", background: a ? t.c : "transparent", border: a ? "none" : `1px solid ${A.border}`, borderRadius: 6, cursor: "pointer", color: a ? "#0A0E14" : A.textDim, fontFamily: A.mono, fontSize: 9, fontWeight: 800, letterSpacing: 0.5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <span style={{ fontSize: 18 }}>{t.em}</span>
                  <span>{t.l}</span>
                </button>
              );
            })}
          </div>
        </window.ArenaCard>

        {/* Step 2: RPE 0-10 */}
        <window.ArenaCard accent={step >= 2 ? A.neon : null} style={{ opacity: step < 2 ? 0.4 : 1 }}>
          <window.MonoLabel color={step >= 2 ? A.neon : A.textMuted} style={{ marginBottom: 8 }}>// 02 · INTENSITÉ PERÇUE</window.MonoLabel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 56, fontWeight: 900, fontFamily: A.mono, color: rpeColor, lineHeight: 1, letterSpacing: -2 }}>{rpe || "—"}</div>
              <div style={{ fontSize: 11, color: rpeColor, fontFamily: A.mono, fontWeight: 700, letterSpacing: 1 }}>▸ {rpeLabel}</div>
            </div>
            <div style={{ fontFamily: A.mono, fontSize: 9, color: A.textMuted, textAlign: "right", lineHeight: 1.6 }}>
              0 · Repos<br />5 · Modéré<br />10 · Maximal
            </div>
          </div>
          <window.SegScale value={rpe} setValue={(v) => { setRpe(v); if (step < 3) setStep(3); }} color={A.neon} />
        </window.ArenaCard>

        {/* Step 3: duration */}
        <window.ArenaCard accent={step >= 3 ? A.neon : null} style={{ opacity: step < 3 ? 0.4 : 1 }}>
          <window.MonoLabel color={step >= 3 ? A.neon : A.textMuted} style={{ marginBottom: 10 }}>// 03 · DURÉE (MINUTES)</window.MonoLabel>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[30, 60, 90, 120, 150].map((d) => {
              const a = duration === d;
              return (
                <button key={d} onClick={() => { setDuration(d); if (step < 4) setStep(4); }} style={{ flex: 1, padding: "10px 0", background: a ? A.neon : "transparent", border: a ? "none" : `1px solid ${A.border}`, color: a ? "#0A0E14" : A.textDim, borderRadius: 6, fontFamily: A.mono, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>{d}'</button>
              );
            })}
          </div>
          <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} style={{ width: "100%", padding: "8px 10px", background: A.bg, border: `1px solid ${A.border}`, color: A.text, borderRadius: 4, fontFamily: A.mono, fontSize: 13, boxSizing: "border-box" }} placeholder="Durée personnalisée…" />
        </window.ArenaCard>

        {/* Charge result */}
        {step >= 3 && rpe > 0 && (
          <div style={{ background: `linear-gradient(135deg, ${A.neon}15, transparent)`, border: `1px solid ${A.neon}60`, borderRadius: 10, padding: "14px 16px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <window.MonoLabel color={A.neon}>// CHARGE D'ENTRAÎNEMENT</window.MonoLabel>
              <div style={{ fontSize: 11, color: A.textDim, marginTop: 4, fontFamily: A.mono }}>RPE × Durée = {rpe} × {duration}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 36, fontWeight: 900, fontFamily: A.mono, color: A.neon, lineHeight: 1, letterSpacing: -1 }}>{charge}</div>
              <div style={{ fontSize: 10, color: A.textMuted, fontFamily: A.mono }}>UA</div>
            </div>
          </div>
        )}

        {/* Comment (step 4) */}
        {step >= 4 && (
          <window.ArenaCard accent={A.neon}>
            <window.MonoLabel color={A.neon} style={{ marginBottom: 8 }}>// 04 · COMMENTAIRE</window.MonoLabel>
            <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 150))} placeholder="Comment s'est passée la séance ?" rows={2} style={{ width: "100%", background: A.bg, border: `1px solid ${A.border}`, color: A.text, borderRadius: 4, padding: "8px 10px", fontFamily: A.font, fontSize: 12, resize: "none", boxSizing: "border-box" }} />
            <div style={{ textAlign: "right", fontFamily: A.mono, fontSize: 9, color: A.textMuted, marginTop: 4 }}>{comment.length}/150</div>
          </window.ArenaCard>
        )}

        {step >= 3 && rpe > 0 && (
          <button onClick={() => setSubmitted(true)} style={{ width: "100%", padding: 16, background: submitted ? "transparent" : A.neon, color: submitted ? A.ok : "#0A0E14", border: submitted ? `1px solid ${A.ok}` : "none", borderRadius: 8, fontFamily: A.mono, fontSize: 12, fontWeight: 800, letterSpacing: 2, cursor: "pointer", marginTop: 8, boxShadow: submitted ? "none" : `0 0 24px ${A.neon}40` }}>
            {submitted ? "✓ RPE ENREGISTRÉ" : "▸ VALIDER LE RPE"}
          </button>
        )}
      </div>

      <window.ArenaTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};
