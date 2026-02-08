/**
 * @file RotationView.tsx
 * @description Vue rotation avec terrains côte à côte et statistiques
 */

import { useMemo } from 'react';
import { useMatchStore } from '../store/matchStore';
import { useVideoStore } from '../store/videoStore';
import { CourtDiagram } from './CourtDiagram';
import {
  getPlayersForRotation,
  findCurrentRally,
  countPointsInRotation,
  calculateSideOutRate,
  countBreakPoints,
} from '../utils/rotationHelpers';
import type { TeamSide } from '@volleyvision/data-model';

/**
 * RotationView - Affiche les deux terrains avec les rotations actuelles
 *
 * Features:
 * - Deux terrains côte à côte (home / away)
 * - Synchronisation avec currentTime de la vidéo
 * - Stats par rotation (points, side-out %, break points)
 * - Détection automatique de la rotation depuis les rallies
 */
export function RotationView() {
  const { match } = useMatchStore();
  const { currentTime, offset } = useVideoStore();

  // Trouver le rally actuel en fonction du temps vidéo
  const currentRally = useMemo(() => {
    if (!match || currentTime === null) return null;
    return findCurrentRally(match, currentTime, offset);
  }, [match, currentTime, offset]);

  // Extraire les rotations home/away depuis le rally
  const homeRotation = currentRally?.rotation?.home ?? null;
  const awayRotation = currentRally?.rotation?.away ?? null;

  // Récupérer les joueurs pour chaque rotation
  const homePlayers = useMemo(() => {
    if (!match || !currentRally) return [];
    return getPlayersForRotation(match, 'home', currentRally);
  }, [match, currentRally]);

  const awayPlayers = useMemo(() => {
    if (!match || !currentRally) return [];
    return getPlayersForRotation(match, 'away', currentRally);
  }, [match, currentRally]);

  // Calcul des stats pour la rotation actuelle
  const homeStats = useMemo(() => {
    if (!match || !currentRally || homeRotation === null) return null;
    return {
      points: countPointsInRotation(match, 'home', currentRally.setNumber, homeRotation),
      sideOutRate: calculateSideOutRate(match, 'home', currentRally.setNumber, homeRotation),
      breakPoints: countBreakPoints(match, 'home', currentRally.setNumber, homeRotation),
    };
  }, [match, currentRally, homeRotation]);

  const awayStats = useMemo(() => {
    if (!match || !currentRally || awayRotation === null) return null;
    return {
      points: countPointsInRotation(match, 'away', currentRally.setNumber, awayRotation),
      sideOutRate: calculateSideOutRate(match, 'away', currentRally.setNumber, awayRotation),
      breakPoints: countBreakPoints(match, 'away', currentRally.setNumber, awayRotation),
    };
  }, [match, currentRally, awayRotation]);

  if (!match) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p>Aucun match chargé</p>
      </div>
    );
  }

  if (!currentRally) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p>⏸️ Lancez la vidéo pour voir les rotations</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec info rally */}
      <div className="bg-slate-800 rounded-lg p-3 text-center">
        <h3 className="text-sm font-semibold text-slate-200 mb-1">
          Set {currentRally.setNumber} • Rally {currentRally.rallyNumber}
        </h3>
        <p className="text-xs text-slate-400">
          Score: {match.homeTeam.name} {currentRally.homeScoreAfter} - {currentRally.awayScoreAfter}{' '}
          {match.awayTeam.name}
        </p>
      </div>

      {/* Terrains côte à côte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Terrain Home */}
        <div className="bg-slate-800 rounded-lg p-4">
          <CourtDiagram
            teamSide="home"
            teamName={match.homeTeam.name}
            players={homePlayers}
            size="medium"
          />

          {/* Stats home */}
          {homeStats && (
            <RotationStats
              teamSide="home"
              rotation={homeRotation!}
              stats={homeStats}
            />
          )}
        </div>

        {/* Terrain Away */}
        <div className="bg-slate-800 rounded-lg p-4">
          <CourtDiagram
            teamSide="away"
            teamName={match.awayTeam.name}
            players={awayPlayers}
            size="medium"
          />

          {/* Stats away */}
          {awayStats && (
            <RotationStats
              teamSide="away"
              rotation={awayRotation!}
              stats={awayStats}
            />
          )}
        </div>
      </div>

      {/* Légende */}
      <div className="bg-slate-800 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-slate-300 mb-2">📖 Légende</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-sky-500"></span>
            <span className="text-slate-400">Joueur</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-violet-500"></span>
            <span className="text-slate-400">Libéro</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">🏐</span>
            <span className="text-slate-400">Serveur (P1)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-amber-400"></span>
            <span className="text-slate-400">Position active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * RotationStats - Affiche les stats pour une rotation
 */
interface RotationStatsProps {
  teamSide: TeamSide;
  rotation: number;
  stats: {
    points: number;
    sideOutRate: number;
    breakPoints: number;
  };
}

function RotationStats({ teamSide, rotation, stats }: RotationStatsProps) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-700">
      <h4 className="text-xs font-semibold text-slate-300 mb-2">
        📊 Stats - Rotation {rotation}
      </h4>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-slate-900 rounded p-2 text-center">
          <div className="text-slate-400 mb-1">Points</div>
          <div className="text-lg font-bold text-white">{stats.points}</div>
        </div>
        <div className="bg-slate-900 rounded p-2 text-center">
          <div className="text-slate-400 mb-1">Side-Out</div>
          <div className="text-lg font-bold text-green-400">
            {stats.sideOutRate.toFixed(0)}%
          </div>
        </div>
        <div className="bg-slate-900 rounded p-2 text-center">
          <div className="text-slate-400 mb-1">Break Pts</div>
          <div className="text-lg font-bold text-amber-400">{stats.breakPoints}</div>
        </div>
      </div>
    </div>
  );
}
