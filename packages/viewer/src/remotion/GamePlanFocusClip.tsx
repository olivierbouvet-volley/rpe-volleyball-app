/**
 * @file GamePlanFocusClip.tsx
 * @description Composition Remotion — Animation "snack content" 5 secondes
 *
 * Affiche la distribution d'attaque d'une rotation adverse sur fond sombre :
 *  - Frame 0-30  : intro statique (titre + terrain mini)
 *  - Frame 30-90 : montée animée des pourcentages
 *  - Frame 90+   : zoom spring sur la cible principale + dimming des autres
 *  - Frame 105   : badge d'alerte tactique
 *
 * Usage avec le <Player> de Remotion :
 *   <Player component={GamePlanFocusClip} inputProps={props} ... />
 */

import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AttackTarget {
  /** Nom du joueur + zone. Ex : "Chone (Z4)" */
  name: string;
  /** Pourcentage d'attaques dans cette zone (0-100) */
  percent: number;
  /** Note tactique optionnelle. Ex : "GRANDE DIAG / TIP" */
  warning?: string;
}

export interface GamePlanFocusClipProps {
  /** Équipe analysée */
  teamName: string;
  /** Numéro de rotation (P1-P6) */
  rotation: number;
  /** Cible principale (zone la plus dangereuse) */
  mainTarget: AttackTarget;
  /** 2ème cible */
  secondTarget: AttackTarget;
  /** 3ème cible */
  thirdTarget: AttackTarget;
  /** Note coach (optionnelle) */
  coachNote?: string;
}

// ── Helpers visuels ────────────────────────────────────────────────────────────

/** Court SVG inline miniature (vue de face, 3 zones avant) */
function MiniCourtSVG({ mainZone, secondZone, thirdZone }: {
  mainZone: number;
  secondZone: number;
  thirdZone: number;
}) {
  const zoneColor = (zone: number, main: number, second: number) => {
    if (zone === main)   return '#fc8181';  // Rouge — danger
    if (zone === second) return '#f6ad55';  // Orange — attention
    return '#4a5568';                        // Gris — normal
  };

  const zones = [4, 3, 2]; // Front left, center, right

  return (
    <svg viewBox="0 0 180 80" style={{ width: 280, height: 110 }}>
      {/* Fond terrain */}
      <rect x="2" y="2" width="176" height="76" rx="4" fill="#2d3748" stroke="#4a5568" strokeWidth="1" />

      {/* Filet */}
      <line x1="2" y1="76" x2="178" y2="76" stroke="#e2e8f0" strokeWidth="3" />

      {/* Zones avant */}
      {zones.map((zone, i) => {
        const x = 3 + i * 58;
        const color = zoneColor(zone, mainZone, secondZone);
        return (
          <g key={zone}>
            <rect x={x} y="3" width="56" height="72" rx="3" fill={color} opacity={0.7} />
            <text
              x={x + 28} y="44"
              textAnchor="middle"
              fill="white"
              fontSize="20"
              fontWeight="bold"
            >
              Z{zone}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────

export const GamePlanFocusClip: React.FC<GamePlanFocusClipProps> = ({
  teamName = 'Adversaire',
  rotation = 1,
  mainTarget   = { name: 'Chone (Z4)', percent: 58, warning: 'GRANDE DIAG' },
  secondTarget = { name: 'Raux (Z3)',  percent: 25 },
  thirdTarget  = { name: 'Morgado (Z2)', percent: 17 },
  coachNote,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ────────────────────────────────────────────────────────────────

  // Frame 0-30 : titre apparaît
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Frame 30-90 : montée des pourcentages
  const progressPercent = interpolate(frame, [30, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Frame 90-110 : assombrissement des cibles secondaires
  const opacityOthers = interpolate(frame, [90, 110], [1, 0.25], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Frame 90+ : zoom spring sur le danger principal
  const zoomSpring = spring({
    frame: frame - 90,
    fps,
    config: { damping: 12, mass: 0.5 },
  });
  const finalScale = interpolate(zoomSpring, [0, 1], [1, 1.35]);

  // Zone numérique extraite du nom (ex: "Chone (Z4)" → 4)
  const extractZone = (name: string) => {
    const match = name.match(/Z(\d)/);
    return match ? parseInt(match[1]) : 0;
  };
  const mainZone   = extractZone(mainTarget.name);
  const secondZone = extractZone(secondTarget.name);
  const thirdZone  = extractZone(thirdTarget.name);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0c1a2e 100%)',
      color: 'white',
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
      overflow: 'hidden',
    }}>

      {/* ── Grille de fond (décoration) ── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* ── Header : titre ── */}
      <div style={{
        position: 'absolute', top: 80, left: 0, right: 0, textAlign: 'center',
        opacity: titleOpacity,
      }}>
        {/* Badge équipe */}
        <div style={{
          display: 'inline-block',
          backgroundColor: 'rgba(99,102,241,0.2)',
          border: '1px solid rgba(99,102,241,0.6)',
          borderRadius: 8, padding: '6px 20px',
          fontSize: 22, fontWeight: 600, color: '#a5b4fc',
          marginBottom: 12,
        }}>
          {teamName}
        </div>
        {/* Rotation */}
        <h1 style={{
          fontSize: 64, fontWeight: 900, margin: 0,
          background: 'linear-gradient(135deg, #e2e8f0, #94a3b8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: -2,
        }}>
          ROTATION P{rotation}
        </h1>
        <p style={{ fontSize: 22, color: '#64748b', margin: '8px 0 0', letterSpacing: 2, textTransform: 'uppercase' }}>
          Analyse distribution R# + R+
        </p>
      </div>

      {/* ── Mini terrain SVG ── */}
      <div style={{
        position: 'absolute', top: 300, left: '50%',
        transform: 'translateX(-50%)',
        opacity: titleOpacity,
      }}>
        <MiniCourtSVG mainZone={mainZone} secondZone={secondZone} thirdZone={thirdZone} />
      </div>

      {/* ── Ligne de séparation (filet stylisé) ── */}
      <div style={{
        position: 'absolute', bottom: '38%', width: '100%', height: 4,
        background: 'linear-gradient(90deg, transparent, rgba(226,232,240,0.4) 20%, rgba(226,232,240,0.8) 50%, rgba(226,232,240,0.4) 80%, transparent)',
        boxShadow: '0 -8px 24px rgba(255,255,255,0.08)',
      }} />
      <div style={{
        position: 'absolute', bottom: 'calc(38% + 6px)', left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 14, color: 'rgba(226,232,240,0.3)', letterSpacing: 4, textTransform: 'uppercase',
      }}>
        FILET
      </div>

      {/* ── 3 cibles (vue frontale) ── */}
      <div style={{
        position: 'absolute', bottom: '42%', left: 0, right: 0,
        display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end',
        padding: '0 80px',
      }}>

        {/* Cible 3 — tertiaire (gauche) */}
        <div style={{ textAlign: 'center', opacity: opacityOthers }}>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
            {thirdTarget.name}
          </div>
          <div style={{ fontSize: 64, fontWeight: 900, color: '#64748b', lineHeight: 1 }}>
            {Math.round(thirdTarget.percent * progressPercent)}
            <span style={{ fontSize: 28, fontWeight: 600 }}>%</span>
          </div>
        </div>

        {/* Cible 2 — secondaire (centre) */}
        <div style={{ textAlign: 'center', opacity: opacityOthers }}>
          <div style={{ fontSize: 16, color: '#f6ad55', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            {secondTarget.name}
          </div>
          <div style={{ fontSize: 72, fontWeight: 900, color: '#f6ad55', lineHeight: 1 }}>
            {Math.round(secondTarget.percent * progressPercent)}
            <span style={{ fontSize: 32, fontWeight: 600 }}>%</span>
          </div>
        </div>

        {/* ── Cible principale — danger (droite, zoom spring) ── */}
        <div style={{
          textAlign: 'center',
          transform: `scale(${finalScale})`,
          transformOrigin: 'center bottom',
        }}>
          {/* Halo rouge derrière */}
          <div style={{
            position: 'absolute', inset: -40, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(239,68,68,0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{
            fontSize: 18, color: '#fc8181', marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700,
          }}>
            {mainTarget.name}
          </div>
          <div style={{
            fontSize: 96, fontWeight: 900, color: '#fc8181', lineHeight: 1,
            textShadow: '0 0 30px rgba(252,129,129,0.6)',
          }}>
            {Math.round(mainTarget.percent * progressPercent)}
            <span style={{ fontSize: 48, fontWeight: 600 }}>%</span>
          </div>

          {/* Badge "DANGER #1" */}
          <div style={{
            display: 'inline-block',
            backgroundColor: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: 6,
            padding: '4px 14px',
            fontSize: 13,
            color: '#fca5a5',
            marginTop: 8,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            DANGER #1
          </div>

          {/* Alerte tactique (apparaît à frame 105 = 3.5 sec) */}
          <Sequence from={105}>
            <div style={{
              marginTop: 20,
              backgroundColor: '#dc2626',
              color: 'white',
              padding: '12px 24px',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 20,
              letterSpacing: 1,
              boxShadow: '0 0 24px rgba(220,38,38,0.7)',
              whiteSpace: 'nowrap',
            }}>
              ⚠️ {mainTarget.warning ?? 'SURVEILLER'}
            </div>
          </Sequence>
        </div>
      </div>

      {/* ── Note coach (bas de l'écran) ── */}
      {coachNote && (
        <Sequence from={60}>
          <div style={{
            position: 'absolute', bottom: 60, left: 80, right: 80,
            backgroundColor: 'rgba(15,23,42,0.8)',
            border: '1px solid rgba(71,85,105,0.5)',
            borderRadius: 12, padding: '14px 24px',
            fontSize: 18, color: '#94a3b8', fontStyle: 'italic',
            opacity: interpolate(frame, [60, 80], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}>
            💬 {coachNote}
          </div>
        </Sequence>
      )}

      {/* ── Branding VolleyVision ── */}
      <div style={{
        position: 'absolute', top: 30, right: 40,
        fontSize: 18, fontWeight: 800, letterSpacing: -0.5,
        opacity: 0.4,
      }}>
        <span style={{ color: '#22c55e' }}>Volley</span>
        <span style={{ color: '#3b82f6' }}>Vision</span>
      </div>

    </AbsoluteFill>
  );
};
