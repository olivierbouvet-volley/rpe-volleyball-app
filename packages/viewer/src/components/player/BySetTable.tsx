import type { Match, PlayerMatchStats } from '@volleyvision/data-model';
import { formatEfficiency } from '../../utils/formatters';
import { getEfficiencyColor } from '../../utils/shareHelpers';

interface BySetTableProps {
  stats: PlayerMatchStats;
  sets: Match['sets'];
  onActionsClick?: (setNumber: number) => void;
}

/**
 * Performance table showing stats by set
 */
export function BySetTable({ stats, sets, onActionsClick }: BySetTableProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3 text-slate-200">Performance par set</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3 text-slate-400 font-medium">Set</th>
              <th className="text-left py-2 px-3 text-slate-400 font-medium">Score</th>
              <th className="text-right py-2 px-3 text-slate-400 font-medium">Actions</th>
              <th className="text-right py-2 px-3 text-slate-400 font-medium">Kills</th>
              <th className="text-right py-2 px-3 text-slate-400 font-medium">Erreurs</th>
              <th className="text-right py-2 px-3 text-slate-400 font-medium">Eff %</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((set) => {
              const setStats = stats.bySet[set.number];

              if (!setStats) {
                return null;
              }

              return (
                <tr key={set.number} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="py-2 px-3 font-medium text-slate-200">
                    Set {set.number}
                  </td>
                  <td className="py-2 px-3 text-slate-300">
                    {set.homeScore}-{set.awayScore}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-300">
                    {onActionsClick ? (
                      <button
                        onClick={() => onActionsClick(set.number)}
                        className="hover:text-primary-blue transition-colors underline cursor-pointer"
                      >
                        {setStats.totalActions}
                      </button>
                    ) : (
                      setStats.totalActions
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-300">
                    {setStats.kills}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-300">
                    {setStats.errors}
                  </td>
                  <td className={`py-2 px-3 text-right font-semibold ${getEfficiencyColor(setStats.efficiency)}`}>
                    {formatEfficiency(setStats.efficiency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
