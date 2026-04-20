import { memo } from 'react';
import type { Match, PlayerMatchStats, Skill, QualityPro } from '@volleyvision/data-model';
import { QualityBadge } from './QualityBadge';
import { formatEfficiency, getPlayerName, getPlayerNumber } from '../utils/formatters';

interface StatsTableProps {
  stats: PlayerMatchStats[];
  match: Match;
  onPlayerClick?: (playerId: string) => void;
}

const skills: Skill[] = ['serve', 'receive', 'set', 'attack', 'block', 'dig'];

const skillLabels: Record<Skill, string> = {
  serve: 'Serve',
  receive: 'Reception',
  set: 'Set',
  attack: 'Attack',
  block: 'Block',
  dig: 'Dig',
  freeball: 'Freeball',
};

/**
 * Display player statistics table with quality distributions
 */
export const StatsTable = memo(function StatsTable({ stats, match, onPlayerClick }: StatsTableProps) {
  if (stats.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p className="text-lg">No statistics available</p>
        <p className="text-sm mt-2">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="min-w-[800px] w-full border-collapse">
        <thead>
          <tr className="bg-slate-800 border-b border-slate-700">
            <th className="sticky left-0 bg-slate-800 px-4 py-3 text-left font-semibold text-sm">
              Player
            </th>
            {skills.map((skill) => (
              <th
                key={skill}
                className="px-4 py-3 text-center font-semibold text-sm border-l border-slate-700"
              >
                {skillLabels[skill]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((playerStats) => {
            const playerName = getPlayerName(playerStats.playerId, match);
            const playerNumber = getPlayerNumber(playerStats.playerId, match);

            return (
              <tr
                key={playerStats.playerId}
                className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
              >
                {/* Player name column */}
                <td className="sticky left-0 bg-slate-900 hover:bg-slate-800/50 px-4 py-3">
                  {onPlayerClick ? (
                    <button
                      onClick={() => onPlayerClick(playerStats.playerId)}
                      className="text-left w-full hover:text-primary-blue transition-colors flex items-center gap-2 group"
                    >
                      <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">👤</span>
                      <div>
                        <div className="font-medium">{playerName}</div>
                        <div className="text-sm text-slate-400">#{playerNumber}</div>
                      </div>
                    </button>
                  ) : (
                    <div>
                      <div className="font-medium">{playerName}</div>
                      <div className="text-sm text-slate-400">#{playerNumber}</div>
                    </div>
                  )}
                </td>

                {/* Skill columns */}
                {skills.map((skill) => {
                  const dist = playerStats.bySkill[skill];

                  if (!dist || dist.total === 0) {
                    return (
                      <td
                        key={skill}
                        className="px-4 py-3 text-center text-slate-500 border-l border-slate-700"
                      >
                        —
                      </td>
                    );
                  }

                  // Pour réception/défense : taux positif (# + +) / total
                  // Pour attaque/service : efficacité (# - erreurs) / total
                  const usePositiveRate = skill === 'receive' || skill === 'dig';

                  const efficiency = usePositiveRate
                    ? (dist['#'] + dist['+']) / dist.total
                    : (dist['#'] - (dist['/'] + dist['='])) / dist.total;

                  const efficiencyColor =
                    efficiency > 0.5
                      ? 'text-quality-kill'
                      : efficiency > 0.3
                      ? 'text-quality-positive'
                      : efficiency > 0
                      ? 'text-quality-neutral'
                      : 'text-quality-error';

                  return (
                    <td
                      key={skill}
                      className="px-4 py-3 border-l border-slate-700"
                    >
                      <div className="flex flex-col items-center gap-2">
                        {/* Total actions */}
                        <div className="text-sm font-medium">{dist.total}</div>

                        {/* Efficiency */}
                        <div className={`text-sm font-semibold ${efficiencyColor}`}>
                          {formatEfficiency(efficiency)}
                        </div>

                        {/* Quality distribution */}
                        <div className="flex gap-1 flex-wrap justify-center">
                          {(['#', '+', '!', '-', '/', '='] as QualityPro[]).map((q) => {
                            const count = dist[q];
                            if (count === 0) return null;
                            return (
                              <QualityBadge
                                key={q}
                                quality={q}
                                count={count}
                                size="sm"
                              />
                            );
                          })}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
