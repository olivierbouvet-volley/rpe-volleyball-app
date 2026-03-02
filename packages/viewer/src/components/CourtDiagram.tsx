/**
 * @file CourtDiagram.tsx
 * @description SVG volleyball court diagram (Vue 2D) - Terrain carré avec filet en haut
 */

import type { TeamSide } from '@volleyvision/data-model';

export interface PlayerPosition {
  position: 1 | 2 | 3 | 4 | 5 | 6;
  playerId: string;
  playerName: string;
  playerNumber: number;
  isLibero?: boolean;
  isSetter?: boolean;
}

export interface ServerInfo {
  playerName: string;
  playerNumber: number;
  position: number;
}

interface CourtDiagramProps {
  teamSide: TeamSide;
  teamName: string;
  players: PlayerPosition[];
  server?: ServerInfo;
  highlightPosition?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: 'small' | 'medium' | 'large';
  compact?: boolean;
  flipped?: boolean;
}

const ZONE_COORDS = {
  4: { x: 60, y: 80, label: '4' },
  3: { x: 160, y: 80, label: '3' },
  2: { x: 260, y: 80, label: '2' },
  5: { x: 60, y: 240, label: '5' },
  6: { x: 160, y: 240, label: '6' },
  1: { x: 260, y: 240, label: '1' },
};

const SIZE_CONFIGS = {
  small: { width: 200, playerRadius: 16, fontSize: 9 },
  medium: { width: 320, playerRadius: 24, fontSize: 11 },
  large: { width: 400, playerRadius: 30, fontSize: 13 },
};

export function CourtDiagram({
  teamSide,
  teamName,
  players,
  server,
  highlightPosition,
  size = 'medium',
  compact = false,
  flipped = false,
}: CourtDiagramProps) {
  const config = SIZE_CONFIGS[size];
  const viewBox = `0 0 ${config.width} ${config.width}`;
  const scale = config.width / 320;

  const getScaledCoord = (pos: number) => ({
    x: ZONE_COORDS[pos as keyof typeof ZONE_COORDS].x * scale,
    y: ZONE_COORDS[pos as keyof typeof ZONE_COORDS].y * scale,
    label: ZONE_COORDS[pos as keyof typeof ZONE_COORDS].label,
  });

  return (
    <div className="flex flex-col items-center">
      {!compact && (
        <div className="mb-2 text-center">
          <h3 className="text-sm font-semibold text-slate-200">{teamName}</h3>
          <p className="text-xs text-slate-400">
            {teamSide === 'home' ? '🏠 Domicile' : '✈️ Extérieur'}
          </p>
        </div>
      )}

      <svg
        viewBox={viewBox}
        className="w-full"
        style={{ maxWidth: `${config.width}px`, transform: flipped ? 'scaleY(-1)' : undefined }}
      >
        <rect
          x={scale * 10}
          y={scale * 30}
          width={scale * 300}
          height={scale * 280}
          fill="#0f766e"
          stroke="#475569"
          strokeWidth={scale * 2}
          opacity="0.3"
        />

        <rect
          x={scale * 10}
          y={scale * 28}
          width={scale * 300}
          height={scale * 4}
          fill="#ef4444"
          opacity="0.9"
        />
        <text
          x={scale * 160}
          y={scale * 20}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={config.fontSize}
          fontWeight="bold"
        >
          FILET
        </text>

        <line
          x1={scale * 10}
          y1={scale * 155}
          x2={scale * 310}
          y2={scale * 155}
          stroke="#64748b"
          strokeWidth={scale * 1.5}
          strokeDasharray={`${scale * 6},${scale * 4}`}
        />

        {([4, 3, 2, 5, 6, 1] as const).map((position) => {
          const coords = getScaledCoord(position);
          const player = players.find((p) => p.position === position);
          const isHighlighted = highlightPosition === position;

          return (
            <g key={position}>
              {isHighlighted && (
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r={config.playerRadius * scale + 8}
                  fill="#fbbf24"
                  opacity="0.2"
                />
              )}

              {player?.isSetter && (
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r={config.playerRadius * scale + 6}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={scale * 3}
                  opacity="0.9"
                />
              )}

              <circle
                cx={coords.x}
                cy={coords.y}
                r={config.playerRadius * scale}
                fill={player?.isLibero ? '#8b5cf6' : '#eab308'}
                stroke={isHighlighted ? '#fbbf24' : '#e2e8f0'}
                strokeWidth={isHighlighted ? scale * 3 : scale * 2}
                opacity={player ? '1' : '0.3'}
              />

              <text
                x={coords.x}
                y={coords.y - config.playerRadius * scale - scale * 10}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={config.fontSize * scale}
                fontWeight="bold"
              >
                {coords.label}
              </text>

              {player && (
                <>
                  <text
                    x={coords.x}
                    y={coords.y}
                    textAnchor="middle"
                    fill="white"
                    fontSize={config.fontSize * scale * 1.3}
                    fontWeight="700"
                    dominantBaseline="middle"
                  >
                    {player.playerNumber}
                  </text>
                  <text
                    x={coords.x}
                    y={coords.y + config.playerRadius * scale + scale * 12}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize={config.fontSize * scale * 0.8}
                    fontWeight="500"
                  >
                    {player.isLibero ? 'LIBERO' : truncateName(player.playerName, 8)}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {server && (
        <div className="mt-3 flex items-center gap-2 bg-yellow-900/30 rounded-lg px-3 py-2 border border-yellow-600/50">
          <span className="text-2xl">🏐</span>
          <div className="text-sm">
            <div className="font-semibold text-yellow-400">
              #{server.playerNumber} {truncateName(server.playerName, 12)}
            </div>
            <div className="text-xs text-slate-400">Service (P{server.position})</div>
          </div>
        </div>
      )}

      {compact && (
        <div className="mt-1 text-xs text-slate-400 text-center">
          {teamName}
        </div>
      )}
    </div>
  );
}

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 1) + '.';
}
