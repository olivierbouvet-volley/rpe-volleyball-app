/**
 * @file CourtDiagram.tsx
 * @description SVG volleyball court diagram showing 6 zones and player positions
 */

import type { TeamSide } from '@volleyvision/data-model';

interface PlayerPosition {
  position: 1 | 2 | 3 | 4 | 5 | 6; // P1 = serveur, P2-P6 = autres positions
  playerId: string;
  playerName: string;
  isLibero?: boolean;
}

interface CourtDiagramProps {
  /** Côté de l'équipe à afficher ('home' ou 'away') */
  teamSide: TeamSide;
  /** Nom de l'équipe */
  teamName: string;
  /** Positions des joueurs sur le terrain */
  players: PlayerPosition[];
  /** Highlight une position spécifique (ex: P4 pour une attaque) */
  highlightPosition?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Taille du diagramme (par défaut: 'medium') */
  size?: 'small' | 'medium' | 'large';
  /** Mode compact pour affichage côte à côte */
  compact?: boolean;
}

/**
 * Coordonnées des zones sur le terrain (viewBox: 360×240)
 *
 * Terrain vue du dessus:
 *    P4  P3  P2
 *    ──────────  (net)
 *    P5  P6  P1
 *
 * Zone mapping (numérotation DataVolley):
 * - Avant (proche du filet): P4, P3, P2
 * - Arrière (fond du court): P5, P6, P1
 */
const ZONE_COORDS = {
  // Ligne avant (y = 60)
  4: { x: 60, y: 60, label: 'P4' },   // Avant-gauche
  3: { x: 180, y: 60, label: 'P3' },  // Avant-centre
  2: { x: 300, y: 60, label: 'P2' },  // Avant-droite

  // Ligne arrière (y = 180)
  5: { x: 60, y: 180, label: 'P5' },  // Arrière-gauche
  6: { x: 180, y: 180, label: 'P6' }, // Arrière-centre
  1: { x: 300, y: 180, label: 'P1' }, // Arrière-droite (serveur)
};

const SIZE_CONFIGS = {
  small: { width: 240, height: 160, fontSize: 10, playerRadius: 18 },
  medium: { width: 360, height: 240, fontSize: 12, playerRadius: 24 },
  large: { width: 480, height: 320, fontSize: 14, playerRadius: 30 },
};

/**
 * CourtDiagram - Affiche le terrain de volley avec les positions des joueurs
 *
 * Features:
 * - Vue du dessus en SVG
 * - 6 zones numérotées (P1-P6)
 * - Affichage du nom des joueurs
 * - Highlight position active
 * - Badge Libero
 * - Responsive sizes
 */
export function CourtDiagram({
  teamSide,
  teamName,
  players,
  highlightPosition,
  size = 'medium',
  compact = false,
}: CourtDiagramProps) {
  const config = SIZE_CONFIGS[size];
  const viewBox = `0 0 ${config.width} ${config.height}`;

  // Ajuster les coordonnées selon la taille
  const scale = config.width / 360;
  const getScaledCoord = (pos: number) => ({
    x: ZONE_COORDS[pos as keyof typeof ZONE_COORDS].x * scale,
    y: ZONE_COORDS[pos as keyof typeof ZONE_COORDS].y * scale,
    label: ZONE_COORDS[pos as keyof typeof ZONE_COORDS].label,
  });

  return (
    <div className="flex flex-col items-center">
      {/* En-tête */}
      {!compact && (
        <div className="mb-2 text-center">
          <h3 className="text-sm font-semibold text-slate-200">{teamName}</h3>
          <p className="text-xs text-slate-400">
            {teamSide === 'home' ? '🏠 Domicile' : '✈️ Extérieur'}
          </p>
        </div>
      )}

      {/* SVG Court */}
      <svg
        viewBox={viewBox}
        className="w-full"
        style={{ maxWidth: `${config.width}px` }}
      >
        {/* Background */}
        <rect
          x="0"
          y="0"
          width={config.width}
          height={config.height}
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="2"
        />

        {/* Ligne de filet (horizontale au milieu) */}
        <line
          x1="0"
          y1={config.height / 2}
          x2={config.width}
          y2={config.height / 2}
          stroke="#94a3b8"
          strokeWidth="3"
          strokeDasharray="8,4"
        />

        {/* Ligne des 3 mètres (zone d'attaque) */}
        <line
          x1="0"
          y1={config.height * 0.65}
          x2={config.width}
          y2={config.height * 0.65}
          stroke="#64748b"
          strokeWidth="1"
          strokeDasharray="4,4"
        />

        {/* Zones et joueurs */}
        {([1, 2, 3, 4, 5, 6] as const).map((position) => {
          const coords = getScaledCoord(position);
          const player = players.find((p) => p.position === position);
          const isHighlighted = highlightPosition === position;

          return (
            <g key={position}>
              {/* Zone background (highlight si active) */}
              {isHighlighted && (
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r={config.playerRadius + 8}
                  fill="#fbbf24"
                  opacity="0.2"
                />
              )}

              {/* Cercle joueur */}
              <circle
                cx={coords.x}
                cy={coords.y}
                r={config.playerRadius}
                fill={player?.isLibero ? '#8b5cf6' : '#0ea5e9'}
                stroke={isHighlighted ? '#fbbf24' : '#e2e8f0'}
                strokeWidth={isHighlighted ? '3' : '2'}
                opacity={player ? '1' : '0.3'}
              />

              {/* Position label (P1, P2...) */}
              <text
                x={coords.x}
                y={coords.y - config.playerRadius - 8}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={config.fontSize - 2}
                fontWeight="bold"
              >
                {coords.label}
              </text>

              {/* Nom du joueur */}
              {player && (
                <>
                  <text
                    x={coords.x}
                    y={coords.y}
                    textAnchor="middle"
                    fill="white"
                    fontSize={config.fontSize}
                    fontWeight="600"
                    dominantBaseline="middle"
                  >
                    {truncateName(player.playerName, 8)}
                  </text>

                  {/* Badge Libero */}
                  {player.isLibero && (
                    <text
                      x={coords.x}
                      y={coords.y + config.playerRadius + 12}
                      textAnchor="middle"
                      fill="#a78bfa"
                      fontSize={config.fontSize - 3}
                      fontWeight="bold"
                    >
                      L
                    </text>
                  )}
                </>
              )}

              {/* Icône serveur pour P1 */}
              {position === 1 && player && (
                <text
                  x={coords.x + config.playerRadius - 6}
                  y={coords.y - config.playerRadius + 10}
                  fontSize={config.fontSize + 2}
                >
                  🏐
                </text>
              )}
            </g>
          );
        })}

        {/* Label "FILET" */}
        <text
          x={config.width / 2}
          y={config.height / 2 - 8}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={config.fontSize - 2}
          fontWeight="bold"
        >
          FILET
        </text>
      </svg>

      {/* Légende compacte */}
      {compact && (
        <div className="mt-1 text-xs text-slate-400 text-center">
          {teamName}
        </div>
      )}
    </div>
  );
}

/**
 * Tronque un nom pour l'affichage (ex: "Alexandre" → "Alex.")
 */
function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 1) + '.';
}
