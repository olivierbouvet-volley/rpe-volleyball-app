/* global React */
const { useState: useStateCheckin } = React;

// CHECK-IN — version exhaustive : reprend toutes les questions du formulaire prod
//   • Vitals : Sommeil, Courbatures, Stress, Humeur, Énergie  (5 sliders 0-10)
//   • Douleurs : toggle "✓ Aucune douleur" + confirmation des douleurs actives + déclaration nouvelle (zone, intensité, durée, description)
//   • Cycle : J1-J8 ou Non, SPM si non-règles + proximité, 7 symptômes menstruels (collapsible), phase calculée
//   • Commentaire 150 char

window.CheckinScreen = function CheckinScreen({ activeTab, setActiveTab }) {
  const A = window.ARENA;
  const [day, setDay] = useStateCheckin("today");

  // Vitals (5)
  const [sleep, setSleep] = useStateCheckin(7);
  const [aches, setAches] = useStateCheckin(3);
  const [stress, setStress] = useStateCheckin(4);
  const [mood, setMood] = useStateCheckin(8);
  const [energy, setEnergy] = useStateCheckin(7);

  // Douleurs
  const [noPain, setNoPain] = useStateCheckin(true); // par défaut "aucune douleur" (✓)
  const [activePains, setActivePains] = useStateCheckin([
    { id: 1, zone: "Cheville D.", days: 3, lastIntensity: 4, status: null }, // status: "ok" | "worse" | "healed"
  ]);
  const [showNewPain, setShowNewPain] = useStateCheckin(false);
  const [newPain, setNewPain] = useStateCheckin({ zone: "", intensity: 0, daysSince: "1", desc: "" });

  // Cycle
  const [cycleOpen, setCycleOpen] = useStateCheckin(true);
  const [cycleDay, setCycleDay] = useStateCheckin(null); // 1-8 (en règles JN) | 0 (non) | null
  const [periodProximity, setPeriodProximity] = useStateCheckin(""); // notyet / j5-j3 / j2-j1
  const [showSymptoms, setShowSymptoms] = useStateCheckin(false);
  const [symptoms, setSymptoms] = useStateCheckin({
    cramps: 0, headache: 0, fatigue: 0, moodSwings: 0,
    bloating: 0, backPain: 0, breastTenderness: 0,
  });

  const [comment, setComment] = useStateCheckin("");
  const [submitted, setSubmitted] = useStateCheckin(false);

  // dérivé : phase calculée
  const phase = cycleDay === null ? "—"
    : cycleDay >= 1 && cycleDay <= 5 ? "MENSTRUELLE"
    : cycleDay === 0 ? "LUTÉALE"
    : "MENSTRUELLE";
  const phaseColor = phase === "MENSTRUELLE" ? A.bad : phase === "LUTÉALE" ? A.amber : A.textMuted;

  // total symptômes /70
  const totalSymp = Object.values(symptoms).reduce((a, b) => a + b, 0);
  const sympColor = totalSymp > 20 ? A.bad : totalSymp > 10 ? A.amber : A.ok;

  return (
    <div style={{ position: "absolute", inset: 0, background: A.bg, color: A.text, fontFamily: A.font, display: "flex", flexDirection: "column" }}>
      <window.StatusBar />
      <window.ArenaHeader section="DAILY_CHECKIN" title="Check-in"
        right={<div style={{ fontFamily: A.mono, fontSize: 10, color: A.neon, padding: "4px 8px", border: `1px solid ${A.neon}`, borderRadius: 4 }}>● 12d STREAK</div>} />

      {/* Day selector */}
      <div style={{ display: "flex", padding: "10px 16px 0", gap: 6 }}>
        {[
          { k: "today", l: "AUJD" },
          { k: "yesterday", l: "J-1" },
          { k: "daybefore", l: "J-2" },
        ].map((t) => {
          const a = day === t.k;
          return (
            <button key={t.k} onClick={() => setDay(t.k)} style={{ flex: 1, padding: "7px 0", background: a ? A.neon : "transparent", color: a ? "#0A0E14" : A.textDim, border: a ? "none" : `1px solid ${A.border}`, borderRadius: 6, fontFamily: A.mono, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer" }}>{t.l}</button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 110px" }}>
        <window.MonoLabel style={{ marginBottom: 10 }}>// LUN 27.OCT.2025 · {day === "today" ? "CURRENT" : day === "yesterday" ? "−24H" : "−48H"}</window.MonoLabel>

        {/* === 5 VITALS === */}
        <window.ArenaCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <window.MonoLabel color={A.neon}>// VITALS</window.MonoLabel>
            <span style={{ fontFamily: A.mono, fontSize: 9, color: A.textMuted, letterSpacing: 1 }}>5 INDICATEURS</span>
          </div>
          <SliderRow label="Sommeil" sub="Qualité" value={sleep} setValue={setSleep} color={A.blue} />
          <SliderRow label="Courbatures" sub="Niveau" value={aches} setValue={setAches} color={A.amber} invert />
          <SliderRow label="Stress" sub="Mental" value={stress} setValue={setStress} color={A.pink} invert />
          <SliderRow label="Humeur" sub="Générale" value={mood} setValue={setMood} color={A.neon} />
          <SliderRow label="Énergie" sub="Globale" value={energy} setValue={setEnergy} color={A.neon} last />
        </window.ArenaCard>

        {/* === DOULEURS === */}
        <window.ArenaCard accent={!noPain || activePains.some(p => p.status === "worse") ? A.bad : null}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <window.MonoLabel color={noPain ? A.ok : A.bad}>// DOULEURS / BLESSURES</window.MonoLabel>
            <button onClick={() => { setNoPain(!noPain); if (noPain) setShowNewPain(true); else { setShowNewPain(false); } }}
              style={{ padding: "6px 12px", background: noPain ? A.surface2 : "transparent", border: `1px solid ${noPain ? A.ok : A.bad}`, color: noPain ? A.ok : A.bad, borderRadius: 4, fontFamily: A.mono, fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: 1 }}>
              {noPain ? "✓ AUCUNE DOULEUR" : "⚠ DOULEUR PRÉSENTE"}
            </button>
          </div>

          {/* Confirmation des douleurs actives suivies */}
          {activePains.length > 0 && (
            <div style={{ marginBottom: showNewPain ? 14 : 0 }}>
              <div style={{ fontFamily: A.mono, fontSize: 9, color: A.textMuted, marginBottom: 6, letterSpacing: 1 }}>▸ DOULEURS EN COURS · CONFIRME L'ÉTAT</div>
              {activePains.map((p) => (
                <div key={p.id} style={{ background: A.bg, border: `1px solid ${A.borderSoft}`, borderRadius: 6, padding: "10px 12px", marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: A.text }}>{p.zone}</span>
                      <span style={{ fontFamily: A.mono, fontSize: 10, color: A.textMuted, marginLeft: 8 }}>· J{p.days} · dernier {p.lastIntensity}/10</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                    {[
                      { k: "ok", l: "≈ STABLE", c: A.amber },
                      { k: "worse", l: "▲ PIRE", c: A.bad },
                      { k: "healed", l: "✓ GUÉRI", c: A.ok },
                    ].map((b) => {
                      const a = p.status === b.k;
                      return (
                        <button key={b.k}
                          onClick={() => setActivePains(activePains.map(x => x.id === p.id ? { ...x, status: b.k } : x))}
                          style={{ padding: "8px 0", background: a ? b.c : "transparent", color: a ? "#0A0E14" : b.c, border: `1px solid ${b.c}${a ? "" : "60"}`, borderRadius: 4, fontFamily: A.mono, fontSize: 9, fontWeight: 800, letterSpacing: 1, cursor: "pointer" }}>{b.l}</button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bouton "Déclarer nouvelle douleur" */}
          {!showNewPain && (
            <button onClick={() => { setShowNewPain(true); setNoPain(false); }}
              style={{ width: "100%", padding: "10px 0", background: "transparent", border: `1px dashed ${A.border}`, color: A.textDim, borderRadius: 6, fontFamily: A.mono, fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: 1.5, marginTop: activePains.length ? 4 : 0 }}>
              + DÉCLARER UNE NOUVELLE DOULEUR
            </button>
          )}

          {/* Form nouvelle douleur */}
          {showNewPain && (
            <div style={{ background: A.bg, border: `1px solid ${A.bad}40`, borderRadius: 6, padding: 12, marginTop: activePains.length ? 4 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <window.MonoLabel color={A.bad}>// NOUVELLE DOULEUR</window.MonoLabel>
                <button onClick={() => { setShowNewPain(false); setNewPain({ zone: "", intensity: 0, daysSince: "1", desc: "" }); }}
                  style={{ background: "transparent", border: "none", color: A.textMuted, fontFamily: A.mono, fontSize: 10, cursor: "pointer" }}>✕ ANNULER</button>
              </div>

              <div style={{ marginBottom: 10 }}>
                <window.MonoLabel style={{ marginBottom: 6 }}>ZONE *</window.MonoLabel>
                <select value={newPain.zone} onChange={(e) => setNewPain({ ...newPain, zone: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", background: A.surface2, border: `1px solid ${A.border}`, color: A.text, borderRadius: 4, fontFamily: A.mono, fontSize: 11, boxSizing: "border-box" }}>
                  <option value="">— Sélectionner —</option>
                  <option>Tête</option><option>Cou / Cervicales</option><option>Épaule G.</option><option>Épaule D.</option>
                  <option>Coude</option><option>Poignet</option><option>Dos haut</option><option>Dos bas / Lombaires</option>
                  <option>Hanche</option><option>Cuisse / Quadri.</option><option>Ischio</option><option>Genou G.</option><option>Genou D.</option>
                  <option>Mollet</option><option>Cheville G.</option><option>Cheville D.</option><option>Pied</option>
                </select>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <window.MonoLabel>INTENSITÉ</window.MonoLabel>
                  <span style={{ fontFamily: A.mono, fontSize: 11, color: newPain.intensity ? A.bad : A.textMuted, fontWeight: 700 }}>{newPain.intensity || "—"}/10</span>
                </div>
                <window.SegScale value={newPain.intensity} setValue={(v) => setNewPain({ ...newPain, intensity: v })} max={10} color={A.bad} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div>
                  <window.MonoLabel style={{ marginBottom: 6 }}>DEPUIS</window.MonoLabel>
                  <select value={newPain.daysSince} onChange={(e) => setNewPain({ ...newPain, daysSince: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", background: A.surface2, border: `1px solid ${A.border}`, color: A.text, borderRadius: 4, fontFamily: A.mono, fontSize: 11, boxSizing: "border-box" }}>
                    <option value="1">Aujourd'hui</option>
                    <option value="2">2 jours</option>
                    <option value="3">3 jours</option>
                    <option value="7">1 semaine</option>
                    <option value="14">2 semaines</option>
                    <option value="30">+1 mois</option>
                  </select>
                </div>
                <div>
                  <window.MonoLabel style={{ marginBottom: 6 }}>CONTEXTE</window.MonoLabel>
                  <input type="text" value={newPain.desc} onChange={(e) => setNewPain({ ...newPain, desc: e.target.value.slice(0, 100) })}
                    placeholder="ex: en sautant"
                    style={{ width: "100%", padding: "8px 10px", background: A.surface2, border: `1px solid ${A.border}`, color: A.text, borderRadius: 4, fontFamily: A.font, fontSize: 11, boxSizing: "border-box" }} />
                </div>
              </div>
            </div>
          )}
        </window.ArenaCard>

        {/* === CYCLE === */}
        <window.ArenaCard accent={A.pink}>
          <button onClick={() => setCycleOpen(!cycleOpen)} style={{ width: "100%", background: "transparent", border: "none", padding: 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: A.text }}>
            <div style={{ textAlign: "left" }}>
              <window.MonoLabel color={A.pink}>// CYCLE_MENSTRUEL</window.MonoLabel>
              <div style={{ fontSize: 13, color: A.text, marginTop: 4, fontWeight: 600 }}>Suivi du cycle <span style={{ fontSize: 10, color: A.textMuted, fontWeight: 400 }}>(optionnel)</span></div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontFamily: A.mono, fontSize: 10, color: phaseColor, padding: "3px 7px", border: `1px solid ${phaseColor}60`, borderRadius: 3, letterSpacing: 1, fontWeight: 700 }}>
                {cycleDay === null ? "—" : cycleDay >= 1 && cycleDay <= 8 ? `J${cycleDay} · ${phase}` : phase}
              </span>
              <span style={{ color: A.textMuted, fontSize: 14 }}>{cycleOpen ? "▾" : "▸"}</span>
            </div>
          </button>

          {cycleOpen && (
            <div style={{ marginTop: 16 }}>
              {/* J1-J8 grid */}
              <window.MonoLabel style={{ marginBottom: 8 }}>EN RÈGLES ? CHOISIS LE JOUR</window.MonoLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, marginBottom: 8 }}>
                {[...Array(8)].map((_, i) => {
                  const d = i + 1;
                  const a = cycleDay === d;
                  return (
                    <button key={d} onClick={() => setCycleDay(d)} style={{ aspectRatio: "1", background: a ? A.pink : "transparent", border: a ? "none" : `1px solid ${A.border}`, color: a ? "#0A0E14" : A.textDim, borderRadius: 6, fontFamily: A.mono, fontWeight: 800, fontSize: 11, cursor: "pointer" }}>J{d}</button>
                  );
                })}
              </div>
              <button onClick={() => setCycleDay(0)}
                style={{ width: "100%", padding: "8px 0", background: cycleDay === 0 ? A.surface2 : "transparent", color: cycleDay === 0 ? A.text : A.textDim, border: `1px solid ${cycleDay === 0 ? A.pink : A.border}`, borderRadius: 6, fontFamily: A.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, cursor: "pointer", marginBottom: 14 }}>
                {cycleDay === 0 ? "● PAS DE RÈGLES" : "○ NON, PAS DE RÈGLES"}
              </button>

              {/* Si NON : proximité */}
              {cycleDay === 0 && (
                <div style={{ marginBottom: 14 }}>
                  <window.MonoLabel style={{ marginBottom: 8 }}>RÈGLES PROCHES ?</window.MonoLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                    {[
                      { v: "notyet", l: "PAS ENCORE" },
                      { v: "j5-j3", l: "J-5 / J-3" },
                      { v: "j2-j1", l: "J-2 / J-1" },
                    ].map((b) => {
                      const a = periodProximity === b.v;
                      return (
                        <button key={b.v} onClick={() => setPeriodProximity(b.v)} style={{ padding: "9px 0", background: a ? A.pink + "30" : "transparent", border: `1px solid ${a ? A.pink : A.border}`, color: a ? A.pink : A.textDim, borderRadius: 6, fontFamily: A.mono, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: "pointer" }}>{b.l}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toggle symptômes détaillés */}
              {cycleDay !== null && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showSymptoms ? 12 : 0 }}>
                    <div>
                      <window.MonoLabel color={A.pink}>// SYMPTÔMES MENSTRUELS</window.MonoLabel>
                      {totalSymp > 0 && <div style={{ fontFamily: A.mono, fontSize: 10, color: sympColor, marginTop: 4, fontWeight: 700 }}>SCORE: {totalSymp}/70</div>}
                    </div>
                    <button onClick={() => setShowSymptoms(!showSymptoms)}
                      style={{ padding: "6px 10px", background: "transparent", border: `1px solid ${A.border}`, color: A.textMuted, borderRadius: 4, fontFamily: A.mono, fontSize: 9, fontWeight: 700, cursor: "pointer", letterSpacing: 1 }}>
                      {showSymptoms ? "▲ RÉDUIRE" : "▼ DÉTAILLER"}
                    </button>
                  </div>

                  {showSymptoms && (
                    <div>
                      <div style={{ fontSize: 10, color: A.textMuted, fontFamily: A.mono, marginBottom: 10, letterSpacing: 0.5 }}>0 (aucun) → 10 (insupportable). Laisse à 0 si rien.</div>
                      {[
                        { k: "cramps", l: "Crampes abdominales" },
                        { k: "headache", l: "Maux de tête" },
                        { k: "fatigue", l: "Fatigue excessive" },
                        { k: "moodSwings", l: "Variations d'humeur" },
                        { k: "bloating", l: "Ballonnements" },
                        { k: "backPain", l: "Douleurs dorsales" },
                        { k: "breastTenderness", l: "Sensibilité mammaire" },
                      ].map((s, i, arr) => (
                        <SymptomRow key={s.k} label={s.l} value={symptoms[s.k]} setValue={(v) => setSymptoms({ ...symptoms, [s.k]: v })} last={i === arr.length - 1} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </window.ArenaCard>

        {/* === COMMENTAIRE === */}
        <window.ArenaCard>
          <window.MonoLabel style={{ marginBottom: 8 }}>// COMMENTAIRE (OPTIONNEL)</window.MonoLabel>
          <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 150))} placeholder="Comment tu te sens aujourd'hui ?" rows={2} style={{ width: "100%", background: A.bg, border: `1px solid ${A.border}`, color: A.text, borderRadius: 4, padding: "8px 10px", fontFamily: A.font, fontSize: 12, resize: "none", boxSizing: "border-box" }} />
          <div style={{ textAlign: "right", fontFamily: A.mono, fontSize: 9, color: A.textMuted, marginTop: 4 }}>{comment.length}/150</div>
        </window.ArenaCard>

        <button onClick={() => setSubmitted(true)} style={{ width: "100%", padding: 16, background: submitted ? "transparent" : A.neon, color: submitted ? A.ok : "#0A0E14", border: submitted ? `1px solid ${A.ok}` : "none", borderRadius: 8, fontFamily: A.mono, fontSize: 12, fontWeight: 800, letterSpacing: 2, cursor: "pointer", marginTop: 8, boxShadow: submitted ? "none" : `0 0 24px ${A.neon}40` }}>
          {submitted ? "✓ ENREGISTRÉ · STREAK +1" : "▸ VALIDER LE CHECK-IN"}
        </button>
      </div>

      <window.ArenaTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

function SliderRow({ label, sub, value, setValue, color, invert, last }) {
  const A = window.ARENA;
  const displayColor = invert ? (value <= 3 ? A.ok : value <= 6 ? A.amber : A.bad) : (value <= 3 ? A.bad : value <= 6 ? A.amber : A.ok);
  return (
    <div style={{ marginBottom: last ? 0 : 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          <span style={{ fontSize: 13, color: A.text, fontWeight: 600 }}>{label}</span>
          <span style={{ fontSize: 10, color: A.textMuted, marginLeft: 8, fontFamily: A.mono }}>· {sub}</span>
        </div>
        <span style={{ fontFamily: A.mono, fontSize: 18, fontWeight: 800, color: displayColor, fontVariantNumeric: "tabular-nums" }}>{value}<span style={{ fontSize: 10, color: A.textMuted }}>/10</span></span>
      </div>
      <window.SegScale value={value} setValue={setValue} color={color} />
    </div>
  );
}

function SymptomRow({ label, value, setValue, last }) {
  const A = window.ARENA;
  const c = value === 0 ? A.textFaint : value <= 3 ? A.ok : value <= 6 ? A.amber : A.bad;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: last ? "none" : `1px solid ${A.borderSoft}` }}>
      <span style={{ fontSize: 11, color: A.textDim, flex: "0 0 130px", fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, display: "flex", gap: 2 }}>
        {[...Array(10)].map((_, i) => {
          const filled = i < value;
          const segColor = i < 3 ? A.ok : i < 6 ? A.amber : A.bad;
          return (
            <button key={i} onClick={() => setValue(value === i + 1 ? 0 : i + 1)} style={{ flex: 1, height: 14, background: filled ? segColor : "transparent", border: filled ? "none" : `1px solid ${A.border}`, borderRadius: 2, cursor: "pointer", padding: 0 }} />
          );
        })}
      </div>
      <span style={{ fontFamily: A.mono, fontSize: 11, fontWeight: 700, color: c, width: 18, textAlign: "right" }}>{value}</span>
    </div>
  );
}
