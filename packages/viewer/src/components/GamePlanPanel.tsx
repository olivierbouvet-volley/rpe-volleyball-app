/**
 * @file GamePlanPanel.tsx
 * @description Plan de Match automatisé — analyse de l'équipe adverse par rotation
 *
 * Pour chaque rotation (P1-P6) de l'adversaire :
 *  - Distribution du passeur sur R# et R+ (bonne réception seulement)
 *  - Sélection du setter call (K0, K1, K8...) pour filtrer la distribution
 *  - Heatmap SVG des zones d'attaque (couleur ∝ fréquence)
 *  - Attaquants prioritaires par zone
 *  - Note coach éditable
 *  - Clic sur une zone → seek vidéo vers le premier timestamp
 */

import { useState, useMemo, useCallback } from 'react';
import { useMatchStore } from '../store/matchStore';
import { useVideoStore } from '../store/videoStore';
import { useGamePlanStore } from '../store/gamePlanStore';
import { useFilterStore, DEFAULT_CRITERIA } from '../store/filterStore';
import { useLayoutStore } from '../store/layoutStore';
import type { TeamSide, Match, Player } from '@volleyvision/data-model';
import {
  analyzeSetterDistribution,
  type ZoneDistribution,
  type SetterCallStat,
} from '../utils/setterAnalysis';
import {
  analyzeSetterDistributionMulti,
} from '../utils/multiMatchAnalysis';
import { GamePlanExportModal } from './GamePlanExportModal';
import type { GamePlanFocusClipProps } from '../remotion/GamePlanFocusClip';

// ── Coordonnées des zones sur le mini-terrain SVG (viewBox 0 0 180 126) ──
const ZONE_RECTS: Record<number, { x: number; y: number; w: number; h: number }> = {
  4: { x: 3,   y: 3,  w: 55, h: 55 },  // front left
  3: { x: 63,  y: 3,  w: 55, h: 55 },  // front center
  2: { x: 123, y: 3,  w: 55, h: 55 },  // front right
  5: { x: 3,   y: 68, w: 55, h: 55 },  // back left
  6: { x: 63,  y: 68, w: 55, h: 55 },  // back center
  1: { x: 123, y: 68, w: 55, h: 55 },  // back right
};
const PIPE_RECT = { x: 63, y: 83, w: 55, h: 25 }; // zone 8 (pipe, inside back center)

/** Couleur de fond d'une zone selon son pourcentage (0 → transparent, 60%+ → rouge foncé) */
function zoneHeatColor(pct: number): string {
  if (pct <= 0) return 'rgba(30,41,59,0.6)';
  // Interpolation du slate vers le rouge
  const intensity = Math.min(1, pct / 55);
  const r = Math.round(30  + intensity * (220 - 30));
  const g = Math.round(41  + intensity * (30  - 41));
  const b = Math.round(59  + intensity * (30  - 59));
  return `rgba(${r},${g},${b},0.85)`;
}

// ── Composant principal ──────────────────────────────────────────────────────

export function GamePlanPanel() {
  const { match } = useMatchStore();
  const { seekTo, offset } = useVideoStore();
  const gamePlan = useGamePlanStore();

  const [enemySide, setEnemySide] = useState<TeamSide>('away');
  /** Notes coach par rotation (P1=1...P6=6) */
  const [coachNotes, setCoachNotes] = useState<Record<number, string>>({});
  /** Afficher/masquer le panneau de verrou joueuses */
  const [lockOpen, setLockOpen] = useState(false);
  /** Props à passer au modal d'export Remotion (null = modal fermé) */
  const [exportProps, setExportProps] = useState<GamePlanFocusClipProps | null>(null);

  const handleNoteChange = useCallback((rotation: number, note: string) => {
    setCoachNotes(prev => ({ ...prev, [rotation]: note }));
  }, []);

  // ── Mode multi-matchs ────────────────────────────────────────────────────
  const isMulti = gamePlan.isMultiMatch;

  if (!match && !isMulti) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 p-6">
        <div className="text-center">
          <p className="text-2xl mb-2">🗓</p>
          <p className="font-semibold">Plan de Match</p>
          <p className="text-sm mt-1">Chargez un fichier DVW pour commencer</p>
        </div>
      </div>
    );
  }

  // Données d'équipe affichées dans le header
  const enemyTeamName = isMulti
    ? (gamePlan.studiedTeamName ?? '—')
    : (enemySide === 'home' ? match!.homeTeam.name : match!.awayTeam.name);

  const lockCount = gamePlan.lockedPlayerNumbers.length;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-900">
      {/* ── Modal export Remotion ── */}
      {exportProps && (
        <GamePlanExportModal
          props={exportProps}
          onClose={() => setExportProps(null)}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col shrink-0 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🗓</span>
            <span className="font-bold text-sm text-white">Plan de Match</span>
            {isMulti && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-900 border border-indigo-700 text-indigo-300">
                {gamePlan.matches.length} matchs
              </span>
            )}
          </div>

          {/* Sélecteur équipe */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Adversaire :</span>
            {isMulti ? (
              <select
                value={gamePlan.studiedTeamName ?? ''}
                onChange={e => gamePlan.setStudiedTeam(e.target.value)}
                className="bg-slate-700 text-slate-200 rounded px-2 py-1 text-xs border border-slate-600"
              >
                {gamePlan.detectedTeams.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            ) : (
              <select
                value={enemySide}
                onChange={e => setEnemySide(e.target.value as TeamSide)}
                className="bg-slate-700 text-slate-200 rounded px-2 py-1 text-xs border border-slate-600"
              >
                <option value="home">{match!.homeTeam.name}</option>
                <option value="away">{match!.awayTeam.name}</option>
              </select>
            )}
          </div>
        </div>

        {/* ── Panneau verrou joueuses (multi-matchs uniquement) ── */}
        {isMulti && (
          <div className="px-3 pb-2">
            <button
              onClick={() => setLockOpen(o => !o)}
              className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                lockCount > 0
                  ? 'text-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{lockCount > 0 ? '🔒' : '🔓'}</span>
              <span>Verrou joueuses</span>
              {lockCount > 0 && (
                <span className="px-1 py-0.5 rounded bg-amber-900/50 border border-amber-700/50 text-amber-300 text-[10px]">
                  {lockCount}/6
                </span>
              )}
              <span className="text-slate-500 ml-0.5">{lockOpen ? '▲' : '▼'}</span>
            </button>

            {lockOpen && (
              <div className="mt-2">
                <p className="text-slate-500 text-[10px] mb-1.5">
                  Sélectionne jusqu'à 6 joueuses · seuls les rallyes où elles sont
                  toutes sur le terrain seront analysés
                </p>
                <div className="flex flex-wrap gap-1">
                  {gamePlan.allPlayersForStudiedTeam.map(p => {
                    const locked = gamePlan.lockedPlayerNumbers.includes(p.number);
                    const maxReached = lockCount >= 6 && !locked;
                    return (
                      <button
                        key={p.number}
                        onClick={() => gamePlan.togglePlayerLock(p.number)}
                        disabled={maxReached}
                        title={`${p.firstName} ${p.lastName}${p.position ? ` · ${p.position}` : ''}`}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                          locked
                            ? 'bg-amber-800 border-amber-500 text-amber-100'
                            : maxReached
                              ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
                              : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        #{p.number}
                        <span className="font-normal ml-0.5 opacity-75">
                          {p.lastName.slice(0, 5).toUpperCase()}
                        </span>
                      </button>
                    );
                  })}
                  {lockCount > 0 && (
                    <button
                      onClick={gamePlan.clearLock}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-400 hover:text-red-400 border border-slate-600"
                    >
                      ✕ effacer
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Grille 2×3 des rotations ── */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map(rot => (
            <RotationCard
              key={rot}
              rotation={rot}
              /* Single-match */
              match={isMulti ? undefined : match ?? undefined}
              enemySide={isMulti ? undefined : enemySide}
              /* Multi-match */
              matches={isMulti ? gamePlan.matches : undefined}
              studiedTeamName={isMulti ? gamePlan.studiedTeamName ?? undefined : undefined}
              lockedPlayerNumbers={isMulti ? gamePlan.lockedPlayerNumbers : undefined}
              /* Commun */
              enemyTeamName={enemyTeamName}
              coachNote={coachNotes[rot] ?? ''}
              onNoteChange={(note) => handleNoteChange(rot, note)}
              onSeek={(seconds) => seekTo(seconds + offset)}
              onExport={setExportProps}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── RotationCard ─────────────────────────────────────────────────────────────

interface RotationCardProps {
  rotation: number;
  /** Mode single-match */
  match?: Match;
  enemySide?: TeamSide;
  /** Mode multi-matchs */
  matches?: Match[];
  studiedTeamName?: string;
  lockedPlayerNumbers?: number[];
  /** Commun */
  enemyTeamName: string;
  coachNote: string;
  onNoteChange: (note: string) => void;
  onSeek: (seconds: number) => void;
  /** Ouvre le modal Remotion avec les données de cette rotation */
  onExport: (props: GamePlanFocusClipProps) => void;
  /** Active setter calls sélectionnés au moment du clic (pour filtrer la playlist) */
  activeCalls?: string[];
}

function RotationCard({
  rotation,
  match, enemySide,
  matches, studiedTeamName, lockedPlayerNumbers,
  enemyTeamName, coachNote, onNoteChange, onSeek, onExport,
}: RotationCardProps) {
  const isMulti = !!(matches && studiedTeamName);

  /** Setter calls sélectionnés. [] = tous */
  const [activeCalls, setActiveCalls] = useState<string[]>([]);
  /** Playlist vidéo de la zone sélectionnée */
  const [zonePlaylist, setZonePlaylist] = useState<{
    timestamps: number[];
    currentIdx: number;
    zoneId: number;
  } | null>(null);

  const handleZoneClick = useCallback((zd: ZoneDistribution) => {
    const ts = zd.videoSecondsList ?? [];
    if (ts.length === 0) return;
    setZonePlaylist({ timestamps: ts, currentIdx: 0, zoneId: zd.zone });
    onSeek(ts[0]);

    // En mode single-match uniquement : pousser les critères dans filterStore
    // pour afficher la playlist globale sous la vidéo
    if (!isMulti && enemySide) {
      const { setCriteria, isPlaylistMode, togglePlaylistMode, setPlaylistIndex, requestPlaylistSwitch } = useFilterStore.getState();
      setCriteria({
        ...DEFAULT_CRITERIA,
        teamSide: enemySide,
        skills: ['attack'],
        endZones: [zd.zone],
        rotations: [rotation],
        ...(activeCalls.length > 0 ? { setterCalls: activeCalls } : {}),
        hasVideoTimestamp: true,
      });
      // Toujours remettre l'index à 0 pour que PlaylistPlayer seek sur le premier clip
      setPlaylistIndex(0);
      if (!isPlaylistMode) {
        togglePlaylistMode();
      }
      requestPlaylistSwitch();
      useLayoutStore.getState().requestSelectTab('tab-timeline');
    }
  }, [onSeek, isMulti, enemySide, rotation, activeCalls]);

  const goToPrevClip = useCallback(() => {
    if (!zonePlaylist || zonePlaylist.currentIdx <= 0) return;
    const idx = zonePlaylist.currentIdx - 1;
    setZonePlaylist((p) => p && { ...p, currentIdx: idx });
    onSeek(zonePlaylist.timestamps[idx]);
  }, [zonePlaylist, onSeek]);

  const goToNextClip = useCallback(() => {
    if (!zonePlaylist || zonePlaylist.currentIdx >= zonePlaylist.timestamps.length - 1) return;
    const idx = zonePlaylist.currentIdx + 1;
    setZonePlaylist((p) => p && { ...p, currentIdx: idx });
    onSeek(zonePlaylist.timestamps[idx]);
  }, [zonePlaylist, onSeek]);

  // ── Analyse DVW : R#+R+ pour cette rotation ──
  const baseData = useMemo(() => {
    if (isMulti) {
      return analyzeSetterDistributionMulti(matches!, studiedTeamName!, {
        rotationFilter: rotation,
        receptionQualityFilters: ['#', '+'],
        lockedPlayerNumbers: lockedPlayerNumbers?.length ? lockedPlayerNumbers : undefined,
      });
    }
    if (match && enemySide) {
      return analyzeSetterDistribution(match, {
        teamSide: enemySide,
        rotationFilter: rotation,
        receptionQualityFilters: ['#', '+'],
      });
    }
    return null;
  }, [isMulti, matches, studiedTeamName, match, enemySide, rotation, lockedPlayerNumbers]);

  // ── Table de recherche joueuses (numéro → nom) ──────────────────────────
  const playerLookup = useMemo((): Map<number, string> => {
    const map = new Map<number, string>();
    if (isMulti && matches && studiedTeamName) {
      for (const m of matches) {
        const team =
          m.homeTeam.name === studiedTeamName ? m.homeTeam :
          m.awayTeam.name === studiedTeamName ? m.awayTeam : null;
        if (team) {
          for (const p of team.players) {
            if (!map.has(p.number)) map.set(p.number, p.lastName);
          }
        }
      }
    } else if (match && enemySide) {
      const team = enemySide === 'home' ? match.homeTeam : match.awayTeam;
      for (const p of team.players) map.set(p.number, p.lastName);
    }
    return map;
  }, [isMulti, matches, studiedTeamName, match, enemySide]);

  // ── Zones affichées : filtré par setter call si sélection, sinon global ──
  const displayZones: Map<number, ZoneDistribution> = useMemo(() => {
    if (!baseData) return new Map();
    if (activeCalls.length === 0) return baseData.byZone;

    const merged = new Map<number, ZoneDistribution>();
    for (const code of activeCalls) {
      const zoneDists = baseData.bySetterCall.get(code) ?? [];
      for (const zd of zoneDists) {
        const existing = merged.get(zd.zone);
        if (!existing) {
          merged.set(zd.zone, { ...zd });
        } else {
          merged.set(zd.zone, mergeZoneDists(existing, zd));
        }
      }
    }
    const total = Array.from(merged.values()).reduce((s, z) => s + z.count, 0);
    for (const [zone, zd] of merged) {
      merged.set(zone, {
        ...zd,
        percentage: total > 0 ? Math.round((zd.count / total) * 100) : 0,
      });
    }
    return merged;
  }, [baseData, activeCalls]);

  const toggleCall = useCallback((code: string) => {
    setActiveCalls(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  }, []);

  const totalAttacks = Array.from(displayZones.values()).reduce((s, z) => s + z.count, 0);
  const topZone = Array.from(displayZones.values()).sort((a, b) => b.count - a.count)[0];

  const zoneLabel = (zone: number) => `Z${zone}`;

  const topPlayerName = (zd: ZoneDistribution): string => {
    const entry = Object.entries(zd.playerBreakdown).sort(([, a], [, b]) => b.count - a.count)[0];
    return entry ? entry[0].split(' ').slice(1).join(' ') || entry[0] : '';
  };

  const buildExportProps = useCallback((): GamePlanFocusClipProps | null => {
    const sortedZones = Array.from(displayZones.values()).sort((a, b) => b.count - a.count);
    if (sortedZones.length === 0) return null;
    const [z1, z2, z3] = sortedZones;
    const mainTopPlayer = z1 ? topPlayerName(z1) : '';
    return {
      teamName: enemyTeamName,
      rotation,
      mainTarget: {
        name: `${mainTopPlayer ? mainTopPlayer + ' ' : ''}(${zoneLabel(z1.zone)})`,
        percent: z1.percentage,
        warning: coachNote.trim() || undefined,
      },
      secondTarget: z2
        ? { name: `${topPlayerName(z2)} (${zoneLabel(z2.zone)})`, percent: z2.percentage }
        : { name: '—', percent: 0 },
      thirdTarget: z3
        ? { name: `${topPlayerName(z3)} (${zoneLabel(z3.zone)})`, percent: z3.percentage }
        : { name: '—', percent: 0 },
      coachNote: coachNote.trim() || undefined,
    };
  }, [displayZones, enemyTeamName, rotation, coachNote]);

  if (!baseData || baseData.totalSets === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-3 min-h-[200px] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-slate-300 text-sm">P{rotation}</span>
          <span className="text-slate-600 text-xs">0 att.</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">
          Pas de données
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-2.5 flex flex-col gap-1.5">
      {/* Titre + total + indicateur verrou */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="font-bold text-white text-sm">P{rotation}</span>
          {isMulti && (lockedPlayerNumbers?.length ?? 0) > 0 && (
            <span className="text-amber-400 text-[10px]" title="Verrou joueuses actif">🔒</span>
          )}
          {isMulti && (
            <span className="text-slate-600 text-[10px]">{(matches?.length ?? 1)}m</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-xs">
            {totalAttacks} <span className="text-slate-600">att.</span>
          </span>
          <button
            onClick={() => {
              const p = buildExportProps();
              if (p) onExport(p);
            }}
            disabled={totalAttacks === 0}
            title="Créer un snack content vidéo"
            className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 hover:bg-indigo-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            🎥
          </button>
        </div>
      </div>

      {/* ── Setter call chips ── */}
      {baseData.availableSetterCalls.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {baseData.availableSetterCalls.slice(0, 6).map(call => (
            <SetterCallChip
              key={call.code}
              call={call}
              active={activeCalls.includes(call.code)}
              onToggle={toggleCall}
            />
          ))}
          {activeCalls.length > 0 && (
            <button
              onClick={() => setActiveCalls([])}
              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-400 hover:text-white"
              title="Effacer la sélection"
            >
              ✕ tout
            </button>
          )}
        </div>
      )}

      {/* ── Mini heatmap SVG ── */}
      <MiniCourtHeatmap
        zones={displayZones}
        playerLookup={playerLookup}
        match={match}
        enemySide={enemySide}
        matches={matches}
        studiedTeamName={studiedTeamName}
        rotation={rotation}
        onZoneClick={handleZoneClick}
      />

      {/* ── Playlist zone ── */}
      {zonePlaylist && (
        <div className="flex items-center gap-1 bg-slate-900/80 rounded-lg px-2 py-1 border border-slate-700">
          <button
            onClick={goToPrevClip}
            disabled={zonePlaylist.currentIdx <= 0}
            className="p-0.5 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Clip précédent"
          >◀</button>
          <span className="flex-1 text-center text-[11px] font-mono tabular-nums" style={{ color: 'var(--brand-blue)' }}>
            {['','Z1 AR-D','Z2 AV-D','Z3 AV-C','Z4 AV-G','Z5 AR-G','Z6 AR-C','','Pipe'][zonePlaylist.zoneId] ?? `Z${zonePlaylist.zoneId}`}
            &nbsp;{zonePlaylist.currentIdx + 1}/{zonePlaylist.timestamps.length}
          </span>
          <button
            onClick={goToNextClip}
            disabled={zonePlaylist.currentIdx >= zonePlaylist.timestamps.length - 1}
            className="p-0.5 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Clip suivant"
          >▶</button>
          <button
            onClick={() => setZonePlaylist(null)}
            className="ml-1 text-slate-500 hover:text-slate-300 text-[10px] transition-colors"
            title="Fermer la playlist"
          >✕</button>
        </div>
      )}

      {/* ── Danger principal ── */}
      {topZone && topZone.count > 0 && (
        <TopThreatBadge zone={topZone} playerLookup={playerLookup} />
      )}

      {/* ── Note coach ── */}
      <textarea
        value={coachNote}
        onChange={e => onNoteChange(e.target.value)}
        className="w-full bg-slate-900/80 text-slate-300 text-[11px] rounded px-2 py-1 outline-none focus:ring-1 focus:ring-sky-600 resize-none placeholder-slate-600"
        placeholder="Note coach..."
        rows={2}
      />
    </div>
  );
}

// ── Chip setter call ─────────────────────────────────────────────────────────

function SetterCallChip({ call, active, onToggle }: {
  call: SetterCallStat;
  active: boolean;
  onToggle: (code: string) => void;
}) {
  const isGoodRec = call.code === 'K0' || call.code === 'K1';
  return (
    <button
      onClick={() => onToggle(call.code)}
      title={call.description}
      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all border ${
        active
          ? isGoodRec
            ? 'bg-green-700 border-green-500 text-green-100'
            : 'bg-sky-700 border-sky-500 text-sky-100'
          : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-400'
      }`}
    >
      {call.code}<span className="text-[9px] font-normal ml-0.5 opacity-75">:{call.count}</span>
    </button>
  );
}

// ── Mini terrain heatmap ─────────────────────────────────────────────────────

function MiniCourtHeatmap({ zones, playerLookup, match, enemySide, matches, studiedTeamName, rotation, onZoneClick }: {
  zones: Map<number, ZoneDistribution>;
  /** Map numéro joueur → nom (pré-computé par RotationCard) */
  playerLookup: Map<number, string>;
  /** Mode single-match */
  match?: Match;
  enemySide?: TeamSide;
  /** Mode multi-matchs */
  matches?: Match[];
  studiedTeamName?: string;
  rotation: number;
  onZoneClick: (zone: ZoneDistribution) => void;
}) {
  // Positions des joueurs dans cette rotation (premier rally trouvé)
  const playerPositions = useMemo(() => {
    const positions: Record<number, number | null> = { 1:null,2:null,3:null,4:null,5:null,6:null };

    const searchInMatch = (m: Match, side: TeamSide) => {
      for (const set of m.sets) {
        for (const rally of set.rallies) {
          const rot = side === 'home' ? rally.rotation?.home : rally.rotation?.away;
          if (rot !== rotation) continue;
          const pos = side === 'home' ? rally.positions?.home : rally.positions?.away;
          if (!pos) continue;
          for (let p = 1; p <= 6; p++) {
            const key = `P${p}` as 'P1'|'P2'|'P3'|'P4'|'P5'|'P6';
            positions[p] = pos[key] ?? null;
          }
          return true;
        }
      }
      return false;
    };

    if (match && enemySide) {
      searchInMatch(match, enemySide);
    } else if (matches && studiedTeamName) {
      for (const m of matches) {
        const side: TeamSide | null =
          m.homeTeam.name === studiedTeamName ? 'home' :
          m.awayTeam.name === studiedTeamName ? 'away' : null;
        if (side && searchInMatch(m, side)) break;
      }
    }
    return positions;
  }, [match, enemySide, matches, studiedTeamName, rotation]);

  function playerName(num: number | null): string {
    if (num === null) return '?';
    const name = playerLookup.get(num);
    return name ? name.slice(0, 5).toUpperCase() : `#${num}`;
  }

  return (
    <svg viewBox="0 0 181 126" className="w-full rounded-lg" style={{ maxHeight: 140 }}>
      {/* Fond terrain */}
      <rect x="1" y="1" width="179" height="124" rx="5" fill="#0f172a" stroke="#334155" strokeWidth="1" />

      {/* Filet */}
      <line x1="1" y1="62" x2="180" y2="62" stroke="#475569" strokeWidth="2" strokeDasharray="5 3" />
      <text x="90" y="60" textAnchor="middle" fill="#334155" fontSize="7" fontWeight="bold">FILET</text>

      {/* Zones heatmap */}
      {[1,2,3,4,5,6].map(zone => {
        const rect = ZONE_RECTS[zone];
        const zd = zones.get(zone);
        const pct = zd?.percentage ?? 0;
        const hasVideo = (zd?.videoSecondsList?.length ?? 0) > 0;
        return (
          <g key={zone}>
            <rect
              x={rect.x} y={rect.y} width={rect.w} height={rect.h}
              rx="3"
              fill={zoneHeatColor(pct)}
              stroke={pct > 25 ? '#ef4444' : '#334155'}
              strokeWidth={pct > 25 ? 1.5 : 0.5}
              className={hasVideo ? 'cursor-pointer' : ''}
              onClick={() => zd && hasVideo && onZoneClick(zd)}
            />
            {/* Numéro de zone */}
            <text x={rect.x + 5} y={rect.y + 11} fill="#64748b" fontSize="8" fontWeight="bold">{zone}</text>
            {/* % */}
            {pct > 0 && (
              <text
                x={rect.x + rect.w / 2}
                y={rect.y + rect.h / 2 - 4}
                textAnchor="middle"
                fill={pct > 30 ? '#fff' : '#94a3b8'}
                fontSize="11"
                fontWeight="bold"
              >
                {pct}%
              </text>
            )}
            {/* Numéro du joueur à ce poste */}
            {playerPositions[zone] !== null && (
              <text
                x={rect.x + rect.w / 2}
                y={rect.y + rect.h / 2 + 9}
                textAnchor="middle"
                fill={pct > 30 ? '#fde68a' : '#64748b'}
                fontSize="7"
              >
                {playerName(playerPositions[zone])}
              </text>
            )}
            {/* Nombre brut */}
            {(zd?.count ?? 0) > 0 && (
              <text
                x={rect.x + rect.w - 4}
                y={rect.y + rect.h - 4}
                textAnchor="end"
                fill="#475569"
                fontSize="7"
              >
                {zd!.count}
              </text>
            )}
          </g>
        );
      })}

      {/* Zone Pipe (zone 8) si présente */}
      {(() => {
        const zd = zones.get(8);
        if (!zd || zd.count === 0) return null;
        const hasPipeVideo = (zd.videoSecondsList?.length ?? 0) > 0;
        return (
          <g>
            <rect
              x={PIPE_RECT.x} y={PIPE_RECT.y} width={PIPE_RECT.w} height={PIPE_RECT.h}
              rx="3"
              fill={zoneHeatColor(zd.percentage)}
              stroke="#7c3aed"
              strokeWidth="1"
              strokeDasharray="3 2"
              className={hasPipeVideo ? 'cursor-pointer' : ''}
              onClick={() => hasPipeVideo && onZoneClick(zd)}
            />
            <text
              x={PIPE_RECT.x + PIPE_RECT.w / 2}
              y={PIPE_RECT.y + PIPE_RECT.h / 2 + 4}
              textAnchor="middle"
              fill="#c4b5fd"
              fontSize="7"
              fontWeight="bold"
            >
              PIPE {zd.percentage}%
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

// ── Badge danger principal ───────────────────────────────────────────────────

function TopThreatBadge({ zone, playerLookup }: {
  zone: ZoneDistribution;
  playerLookup: Map<number, string>;
}) {
  // Top attaquant dans cette zone
  const topPlayer = Object.entries(zone.playerBreakdown)
    .sort(([, a], [, b]) => b.count - a.count)[0];

  const topCombo = Object.entries(zone.comboBreakdown)
    .sort(([, a], [, b]) => b - a)[0];

  const zoneName = ['', 'Z1 AR-D', 'Z2 AV-D', 'Z3 AV-C', 'Z4 AV-G', 'Z5 AR-G', 'Z6 AR-C', '', 'Pipe'][zone.zone] ?? `Z${zone.zone}`;

  // Résoudre le nom du joueur depuis le playerLookup
  const resolvePlayerDisplay = (rawKey: string): string => {
    // rawKey format: "#7 NOM" — on extrait le numéro
    const m = rawKey.match(/^#(\d+)/);
    if (m) {
      const num = parseInt(m[1], 10);
      const name = playerLookup.get(num);
      if (name) return name.split(' ').slice(-1)[0]; // Juste le nom de famille
    }
    return rawKey.split(' ').slice(-1)[0];
  };

  return (
    <div className="flex items-center gap-1.5 bg-red-950/50 border border-red-900 rounded-lg px-2 py-1">
      <span className="text-red-400 text-[10px]">⚡</span>
      <span className="text-red-300 text-[10px] font-bold">{zoneName}</span>
      <span className="text-red-400 text-[10px]">{zone.percentage}%</span>
      {topPlayer && (
        <span className="text-slate-400 text-[10px] truncate">
          · {resolvePlayerDisplay(topPlayer[0])} ({Math.round((topPlayer[1].kills / Math.max(1, topPlayer[1].count)) * 100)}% eff)
        </span>
      )}
      {topCombo && (
        <span className="text-slate-500 text-[10px] ml-auto shrink-0">{topCombo[0]}</span>
      )}
    </div>
  );
}

// ── Helper : fusionner deux ZoneDistribution ─────────────────────────────────

function mergeZoneDists(a: ZoneDistribution, b: ZoneDistribution): ZoneDistribution {
  const comboBreakdown = { ...a.comboBreakdown };
  for (const [k, v] of Object.entries(b.comboBreakdown)) {
    comboBreakdown[k] = (comboBreakdown[k] ?? 0) + v;
  }
  const playerBreakdown = { ...a.playerBreakdown };
  for (const [k, v] of Object.entries(b.playerBreakdown)) {
    if (playerBreakdown[k]) {
      playerBreakdown[k] = {
        count:  playerBreakdown[k].count  + v.count,
        kills:  playerBreakdown[k].kills  + v.kills,
        errors: playerBreakdown[k].errors + v.errors,
      };
    } else {
      playerBreakdown[k] = { ...v };
    }
  }
  const count  = a.count + b.count;
  const kills  = a.attackKills  + b.attackKills;
  const errors = a.attackErrors + b.attackErrors;
  return {
    zone: a.zone,
    count,
    percentage: 0, // recalculé par l'appelant
    attackEfficiency: count > 0 ? (kills - errors) / count : 0,
    attackKills:  kills,
    attackErrors: errors,
    attackTotal:  count,
    comboBreakdown,
    playerBreakdown,
    videoSecondsList: [...(a.videoSecondsList ?? []), ...(b.videoSecondsList ?? [])],
  };
}
