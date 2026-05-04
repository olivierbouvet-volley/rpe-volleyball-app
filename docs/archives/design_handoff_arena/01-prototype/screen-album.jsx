/* global React */
const { useState: useStateAlbum, useRef: useRefAlbum } = React;

window.AlbumScreen = function AlbumScreen({ activeTab, setActiveTab }) {
  const A = window.ARENA;
  const [filter, setFilter] = useStateAlbum("all");
  const [open, setOpen] = useStateAlbum(null);
  const stickers = [
    { id: 1, n: "First Block", e: "🛡", r: "common", got: true },
    { id: 2, n: "Ace Master", e: "🎯", r: "rare", got: true },
    { id: 3, n: "Iron Will", e: "⚔", r: "rare", got: true },
    { id: 4, n: "Streak 7", e: "🔥", r: "common", got: true },
    { id: 5, n: "Streak 30", e: "💎", r: "legendary", got: false },
    { id: 6, n: "MVP", e: "👑", r: "legendary", got: true },
    { id: 7, n: "Power+", e: "🏋", r: "rare", got: true },
    { id: 8, n: "Squat 80", e: "🦵", r: "rare", got: false },
    { id: 9, n: "Comeback", e: "↻", r: "rare", got: true },
    { id: 10, n: "Spike", e: "💥", r: "rare", got: false },
    { id: 11, n: "Wall", e: "🧱", r: "common", got: true },
    { id: 12, n: "Setter", e: "🎪", r: "rare", got: false },
  ];
  const got = stickers.filter((s) => s.got).length;
  const filt = filter === "all" ? stickers : filter === "got" ? stickers.filter((s) => s.got) : stickers.filter((s) => !s.got);
  const rc = (r) => r === "legendary" ? A.pink : r === "rare" ? A.blue : A.neon;

  return (
    <div style={{ position: "absolute", inset: 0, background: A.bg, color: A.text, fontFamily: A.font, display: "flex", flexDirection: "column" }}>
      <window.StatusBar />
      <window.ArenaHeader section="COLLECTION_STATUS" title="Album"
        right={<div style={{ fontFamily: A.mono, fontSize: 10, color: A.neon, padding: "4px 8px", border: `1px solid ${A.neon}`, borderRadius: 4 }}>{got}/48</div>} />

      <div style={{ padding: "10px 16px 0" }}>
        <div style={{ display: "flex", gap: 2 }}>
          {[...Array(48)].map((_, i) => (
            <div key={i} style={{ flex: 1, height: 16, background: i < got ? (i < 6 ? A.neon : i < 9 ? A.blue : A.pink) : A.surface2, borderRadius: 1 }} />
          ))}
        </div>
        <div style={{ fontFamily: A.mono, fontSize: 9, color: A.textMuted, marginTop: 6, letterSpacing: 1 }}>UNLOCKED · {Math.round((got/48)*100)}% COMPLETE</div>
      </div>

      <div style={{ display: "flex", padding: "12px 16px 0", gap: 6 }}>
        {[{ k: "all", l: "ALL" }, { k: "got", l: "OBTENUS" }, { k: "missing", l: "MANQUANTS" }].map((t) => {
          const a = filter === t.k;
          return (
            <button key={t.k} onClick={() => setFilter(t.k)} style={{ flex: 1, padding: "7px 0", background: a ? A.neon : "transparent", color: a ? "#0A0E14" : A.textDim, border: a ? "none" : `1px solid ${A.border}`, borderRadius: 6, fontFamily: A.mono, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer" }}>{t.l}</button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 110px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {filt.map((s) => {
            const c = rc(s.r);
            const rLabel = s.r === "legendary" ? "LÉGEND." : s.r === "rare" ? "RARE" : "COMMUN";
            return (
              <button
                key={s.id}
                onClick={() => s.got && setOpen(s)}
                style={{
                  aspectRatio: "2.5 / 3.5",
                  background: s.got
                    ? `linear-gradient(160deg, #1A2230 0%, #0E131C 60%, #0B0F17 100%)`
                    : `linear-gradient(160deg, #11161F 0%, #0A0E14 100%)`,
                  border: `1.5px solid ${s.got ? c : A.border}`,
                  borderRadius: 8,
                  padding: 0,
                  position: "relative",
                  cursor: s.got ? "pointer" : "default",
                  color: A.text,
                  fontFamily: A.font,
                  overflow: "hidden",
                  boxShadow: s.got ? `0 4px 14px rgba(0,0,0,0.5), inset 0 0 0 1px ${c}25, inset 0 0 24px ${c}10` : "0 2px 6px rgba(0,0,0,0.4)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Coin haut-gauche : numéro de collection */}
                <div style={{ position: "absolute", top: 5, left: 6, fontFamily: A.mono, fontSize: 8, fontWeight: 800, color: s.got ? c : A.textFaint, letterSpacing: 0.5, lineHeight: 1, zIndex: 2 }}>
                  №{String(s.id).padStart(3, "0")}
                  <div style={{ fontSize: 7, color: A.textMuted, fontWeight: 600, marginTop: 1 }}>/048</div>
                </div>
                {/* Coin haut-droit : rareté */}
                <div style={{ position: "absolute", top: 5, right: 6, fontFamily: A.mono, fontSize: 7, fontWeight: 800, color: s.got ? c : A.textFaint, letterSpacing: 1, padding: "2px 4px", border: `1px solid ${(s.got ? c : A.border) + "80"}`, borderRadius: 2, zIndex: 2, background: "rgba(0,0,0,0.3)" }}>
                  {rLabel}
                </div>

                {/* Cadre intérieur (la fenêtre du visuel) */}
                <div style={{
                  position: "absolute",
                  inset: "26px 8px 38px 8px",
                  borderRadius: 4,
                  background: s.got
                    ? `radial-gradient(circle at 50% 35%, ${c}18 0%, ${c}05 50%, transparent 80%), linear-gradient(180deg, #0E131C 0%, #080B11 100%)`
                    : "linear-gradient(180deg, #0A0E14 0%, #060810 100%)",
                  border: `1px solid ${s.got ? c + "40" : A.borderSoft}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}>
                  {/* Halo derrière le glyph */}
                  {s.got && (
                    <div style={{ position: "absolute", width: "85%", height: "70%", borderRadius: "50%", background: `radial-gradient(circle, ${c}30 0%, transparent 65%)`, filter: "blur(8px)" }} />
                  )}
                  {/* Scanlines */}
                  {s.got && (
                    <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.025) 2px, rgba(255,255,255,0.025) 3px)" }} />
                  )}
                  {/* Glyph */}
                  <span style={{ fontSize: 38, position: "relative", filter: s.got ? `drop-shadow(0 0 8px ${c}80)` : "none" }}>
                    {s.got ? s.e : <span style={{ fontFamily: A.mono, fontSize: 28, color: A.textFaint, fontWeight: 900 }}>?</span>}
                  </span>
                </div>

                {/* Bandeau bas : nom + date */}
                <div style={{
                  position: "absolute",
                  bottom: 0, left: 0, right: 0,
                  height: 32,
                  background: s.got ? `linear-gradient(180deg, transparent 0%, ${c}10 30%, ${c}25 100%)` : "transparent",
                  borderTop: `1px solid ${s.got ? c + "40" : A.borderSoft}`,
                  padding: "4px 8px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: s.got ? A.text : A.textFaint,
                    letterSpacing: 0.2,
                    lineHeight: 1.1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textShadow: s.got ? "0 1px 2px rgba(0,0,0,0.6)" : "none",
                  }}>
                    {s.got ? s.n.toUpperCase() : "/// LOCKED"}
                  </div>
                  <div style={{ fontFamily: A.mono, fontSize: 7, color: s.got ? c : A.textMuted, letterSpacing: 1, marginTop: 1, fontWeight: 700 }}>
                    {s.got ? "▸ 18.OCT.25" : "▸ ——————"}
                  </div>
                </div>

                {/* Liseré coin (deck) */}
                {s.got && (
                  <>
                    <div style={{ position: "absolute", top: 0, left: 0, width: 14, height: 14, borderTop: `2px solid ${c}`, borderLeft: `2px solid ${c}`, borderTopLeftRadius: 8, pointerEvents: "none" }} />
                    <div style={{ position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderBottom: `2px solid ${c}`, borderRight: `2px solid ${c}`, borderBottomRightRadius: 8, pointerEvents: "none" }} />
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {open && <StickerModal sticker={open} color={rc(open.r)} onClose={() => setOpen(null)} />}

      <window.ArenaTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

function StickerModal({ sticker, color, onClose }) {
  const A = window.ARENA;
  const ref = useRefAlbum(null);
  const [xy, setXy] = useStateAlbum({ x: 50, y: 50, rx: 0, ry: 0 });

  function handleMove(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const t = e.touches ? e.touches[0] : e;
    const x = ((t.clientX - rect.left) / rect.width) * 100;
    const y = ((t.clientY - rect.top) / rect.height) * 100;
    const ry = ((x - 50) / 50) * 18;     // tilt left/right
    const rx = -((y - 50) / 50) * 18;    // tilt up/down
    setXy({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)), rx, ry });
  }
  function handleLeave() { setXy({ x: 50, y: 50, rx: 0, ry: 0 }); }

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(5,8,16,0.92)", backdropFilter: "blur(14px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, animation: "fadeIn 200ms ease" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes hueShift { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
      `}</style>

      {/* Halo derrière la carte */}
      <div style={{ position: "absolute", width: 380, height: 380, borderRadius: "50%", background: `radial-gradient(circle, ${color}55 0%, ${color}15 35%, transparent 65%)`, filter: "blur(40px)", pointerEvents: "none", animation: "scaleIn 400ms cubic-bezier(.2,.8,.2,1)" }} />

      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onTouchMove={handleMove}
        onTouchEnd={handleLeave}
        style={{
          width: 280, height: 380, borderRadius: 18, position: "relative",
          background: `linear-gradient(180deg, #161D2A 0%, #0E131C 100%)`,
          border: `1px solid ${color}80`,
          boxShadow: `0 30px 60px rgba(0,0,0,0.6), 0 0 60px ${color}40, inset 0 0 0 1px ${color}20`,
          transformStyle: "preserve-3d",
          transform: `perspective(900px) rotateX(${xy.rx}deg) rotateY(${xy.ry}deg) scale(1)`,
          transition: "transform 120ms ease-out",
          overflow: "hidden", cursor: "grab", animation: "scaleIn 400ms cubic-bezier(.2,.8,.2,1)",
        }}
      >
        {/* Couche 1 : iridescence holographique (réagit à xy) */}
        <div style={{
          position: "absolute", inset: 0,
          background: `conic-gradient(from ${xy.x * 3.6}deg at ${xy.x}% ${xy.y}%, ${color}00, ${color}88, #FF2E97aa, #00D9FFaa, #C8FF00aa, ${color}88, ${color}00)`,
          mixBlendMode: "color-dodge", opacity: 0.55, pointerEvents: "none",
        }} />

        {/* Couche 2 : bandes holo */}
        <div style={{
          position: "absolute", inset: 0,
          background: `repeating-linear-gradient(${xy.x + 105}deg, transparent 0px, rgba(255,255,255,0.06) 2px, transparent 4px, rgba(255,46,151,0.04) 6px, transparent 8px, rgba(0,217,255,0.04) 10px, transparent 12px)`,
          mixBlendMode: "screen", pointerEvents: "none",
        }} />

        {/* Couche 3 : bruit / noise */}
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.18, mixBlendMode: "overlay", pointerEvents: "none" }}>
          <filter id={`n${sticker.id}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter={`url(#n${sticker.id})`} />
        </svg>

        {/* Couche 4 : scanlines */}
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.025) 2px, rgba(255,255,255,0.025) 3px)", pointerEvents: "none" }} />

        {/* Couche 5 : lueur spéculaire suivant le doigt */}
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(circle 180px at ${xy.x}% ${xy.y}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 25%, transparent 55%)`,
          mixBlendMode: "soft-light", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(circle 90px at ${xy.x}% ${xy.y}%, rgba(255,255,255,0.5) 0%, transparent 60%)`,
          mixBlendMode: "overlay", pointerEvents: "none",
        }} />

        {/* CONTENU au-dessus */}
        <div style={{ position: "relative", zIndex: 2, height: "100%", padding: "20px 22px", display: "flex", flexDirection: "column", color: A.text }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: A.mono, fontSize: 9, color, letterSpacing: 2, fontWeight: 800, textShadow: `0 0 8px ${color}` }}>// {sticker.r.toUpperCase()}</div>
            <div style={{ fontFamily: A.mono, fontSize: 9, color: A.textMuted, letterSpacing: 1 }}>#{String(sticker.id).padStart(3, "0")}/048</div>
          </div>

          {/* zone icon avec halo iridescent */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`, filter: "blur(20px)" }} />
            <div style={{
              fontSize: 110, lineHeight: 1, position: "relative",
              filter: `drop-shadow(0 0 30px ${color}aa) drop-shadow(0 0 60px ${color}44)`,
              transform: `translateZ(40px) translateX(${(xy.x - 50) * 0.15}px) translateY(${(xy.y - 50) * 0.15}px)`,
            }}>{sticker.e}</div>
          </div>

          <div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.3, marginBottom: 4, textShadow: "0 2px 20px rgba(0,0,0,0.6)" }}>{sticker.n}</div>
            <div style={{ fontFamily: A.mono, fontSize: 10, color: A.textDim, letterSpacing: 1 }}>▸ DÉBLOQUÉ · 18.OCT.2025</div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color}30`, fontSize: 11, color: A.textDim, lineHeight: 1.4 }}>
              {sticker.r === "legendary" ? "Réussite exceptionnelle. Très peu de joueuses débloquent ce sticker." : sticker.r === "rare" ? "Performance rare et solide sur la durée." : "Une étape franchie."}
            </div>
          </div>
        </div>

        {/* bord brillant */}
        <div style={{ position: "absolute", inset: 0, borderRadius: 18, border: `1px solid rgba(255,255,255,0.08)`, pointerEvents: "none" }} />
      </div>

      <button onClick={onClose} style={{ position: "absolute", top: 24, right: 24, width: 36, height: 36, borderRadius: 999, background: "rgba(255,255,255,0.08)", border: `1px solid ${A.border}`, color: A.text, fontFamily: A.mono, fontSize: 14, cursor: "pointer", zIndex: 110 }}>✕</button>
      <div style={{ position: "absolute", bottom: 32, left: 0, right: 0, textAlign: "center", fontFamily: A.mono, fontSize: 9, color: A.textMuted, letterSpacing: 2, pointerEvents: "none" }}>▸ DÉPLACE LE CURSEUR POUR LE HOLOGRAMME</div>
    </div>
  );
}
