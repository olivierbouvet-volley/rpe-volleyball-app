/**
 * @file RallyTimeline.tsx
 * @description Timeline affichant des rallies complets (pas des actions individuelles)
 */

import { useMemo } from 'react';
import type { Rally, Match, TeamSide } from '@volleyvision/data-model';
import { getSkillIcon, getSkillLabel, getQualityColorClass } from '../utils/timelineHelpers';

interface RallyTimelineProps {
  rallies: Rally[];
  match: Match;
  onRallyClick: (rally: Rally) => void;
  highlightTeam?: TeamSide;
  title?: string;
}

/**
 * RallyTimeline - Affiche une liste de rallies complets avec toutes leurs actions
 *
 * Contrairement à ActionTimeline qui affiche des actions individuelles,
 * ce composant groupe les actions par rally et affiche chaque rally comme une unité.
 */
export function RallyTimeline({
  rallies,
  match,
  onRallyClick,
  highlightTeam,
  title = 'Rallies'
}: RallyTimelineProps) {

  // Trier les rallies par ordre chronologique
  const sortedRallies = useMemo(() => {
    return [...rallies].sort((a, b) => {
      if (a.setNumber !== b.setNumber) {
        return a.setNumber - b.setNumber;
      }
      return a.rallyNumber - b.rallyNumber;
    });
  }, [rallies]);

  if (sortedRallies.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 text-center">
        <p className="text-slate-400 text-sm">Aucun rally trouvé pour cette sélection</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg">
      {/* En-tête */}
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            {title}
          </h3>
          <span className="text-xs text-slate-400">
            {sortedRallies.length} {sortedRallies.length > 1 ? 'rallies' : 'rally'}
          </span>
        </div>
      </div>

      {/* Liste des rallies */}
      <div className="max-h-96 overflow-y-auto">
        {sortedRallies.map((rally, index) => {
          const servingTeamName = rally.servingTeam === 'home'
            ? match.homeTeam.name
            : match.awayTeam.name;

          const winnerTeamName = rally.pointWinner === 'home'
            ? match.homeTeam.name
            : match.awayTeam.name;

          const isHighlightedTeamServing = highlightTeam && rally.servingTeam === highlightTeam;
          const isHighlightedTeamWinner = highlightTeam && rally.pointWinner === highlightTeam;

          return (
            <button
              key={`${rally.setNumber}-${rally.rallyNumber}`}
              onClick={() => onRallyClick(rally)}
              className="w-full p-3 border-b border-slate-700/50 hover:bg-slate-700/50 transition-colors text-left"
            >
              {/* En-tête du rally */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500">
                    #{index + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    Set {rally.setNumber} • Rally {rally.rallyNumber}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  {rally.homeScoreAfter}-{rally.awayScoreAfter}
                </div>
              </div>

              {/* Infos du rally */}
              <div className="flex items-center gap-2 mb-2 text-xs">
                {/* Badge serveur */}
                <span className={`px-2 py-0.5 rounded-full ${
                  isHighlightedTeamServing
                    ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-600/50'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  🏐 {servingTeamName}
                </span>

                {/* Badge gagnant */}
                <span className={`px-2 py-0.5 rounded-full ${
                  isHighlightedTeamWinner
                    ? 'bg-green-900/40 text-green-400 border border-green-600/50'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  ✓ {winnerTeamName}
                </span>

                {/* Nombre d'actions */}
                <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-400">
                  {rally.actions.length} {rally.actions.length > 1 ? 'actions' : 'action'}
                </span>
              </div>

              {/* Aperçu des actions */}
              <div className="flex flex-wrap gap-1">
                {rally.actions.slice(0, 8).map((action, i) => {
                  const actionTeam = action.player.id.startsWith('home') ? 'home' : 'away';
                  const isHighlightedTeamAction = highlightTeam && actionTeam === highlightTeam;

                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                        isHighlightedTeamAction
                          ? 'bg-blue-900/40 border border-blue-600/50'
                          : 'bg-slate-900/50'
                      }`}
                    >
                      <span className="text-xs">{getSkillIcon(action.skill)}</span>
                      <span className={getQualityColorClass(action.quality)}>
                        {action.quality}
                      </span>
                    </div>
                  );
                })}
                {rally.actions.length > 8 && (
                  <span className="text-xs text-slate-500 px-1.5 py-0.5">
                    +{rally.actions.length - 8}
                  </span>
                )}
              </div>

              {/* Timestamp vidéo */}
              {rally.videoTimestamp !== undefined && (
                <div className="mt-2 text-xs text-slate-500">
                  📹 {formatTime(rally.videoTimestamp)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Formate un temps en secondes au format MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
