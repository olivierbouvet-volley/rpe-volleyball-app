import { memo } from 'react';
import type { Match } from '@volleyvision/data-model';
import { formatDate } from '../utils/formatters';

interface ScoreBoardProps {
  match: Match;
}

/**
 * Display match information and scores
 */
export const ScoreBoard = memo(function ScoreBoard({ match }: ScoreBoardProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-lg">
      {/* Competition and date */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-primary-green mb-1">
          {match.competition}
        </h2>
        <p className="text-slate-400">
          {formatDate(match.date)}
          {match.venue && ` • ${match.venue}`}
        </p>
      </div>

      {/* Team scores */}
      <div className="flex justify-between items-center mb-6">
        {/* Home team */}
        <div className="text-right flex-1">
          <h3 className="text-xl font-semibold mb-2">{match.homeTeam.name}</h3>
          <div className="text-5xl font-bold text-primary-green">
            {match.result.homeWins}
          </div>
        </div>

        {/* VS */}
        <div className="px-8 text-2xl font-bold text-slate-500">VS</div>

        {/* Away team */}
        <div className="text-left flex-1">
          <h3 className="text-xl font-semibold mb-2">{match.awayTeam.name}</h3>
          <div className="text-5xl font-bold text-primary-blue">
            {match.result.awayWins}
          </div>
        </div>
      </div>

      {/* Set scores */}
      <div className="flex gap-2 justify-center flex-wrap">
        {match.sets.map((set) => (
          <div
            key={set.number}
            className="bg-slate-700 rounded px-4 py-2 min-w-[100px] text-center"
          >
            <div className="text-xs text-slate-400 mb-1">Set {set.number}</div>
            <div className="text-lg font-semibold">
              <span
                className={
                  set.winner === 'home' ? 'text-primary-green' : 'text-slate-300'
                }
              >
                {set.homeScore}
              </span>
              <span className="text-slate-500 mx-1">-</span>
              <span
                className={
                  set.winner === 'away' ? 'text-primary-blue' : 'text-slate-300'
                }
              >
                {set.awayScore}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
