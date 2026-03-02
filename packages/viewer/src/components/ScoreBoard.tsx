import { useState } from 'react';
import type { Match } from '@volleyvision/data-model';
import { formatDate } from '../utils/formatters';
import { useTeamColorStore, JERSEY_COLORS } from '../store/teamColorStore';

interface ScoreBoardProps {
  match: Match;
}

/**
 * Small inline color picker that shows a palette on click
 */
function JerseyColorPicker({
  color,
  onChange,
  label,
}: {
  color: string;
  onChange: (c: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={() => setOpen(!open)}
        className="w-6 h-6 rounded border-2 border-slate-500 hover:border-slate-300 transition-colors cursor-pointer"
        style={{ backgroundColor: color }}
        title={`Couleur maillot ${label}`}
        type="button"
      />
      {open && (
        <div className="absolute top-8 z-50 bg-slate-700 border border-slate-600 rounded-lg p-2 shadow-xl grid grid-cols-4 gap-1.5 min-w-[120px]">
          {JERSEY_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { onChange(c); setOpen(false); }}
              className={`w-6 h-6 rounded border-2 transition-transform hover:scale-125 ${
                c === color ? 'border-white scale-110' : 'border-slate-500'
              }`}
              style={{ backgroundColor: c }}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Display match information and scores
 */
export function ScoreBoard({ match }: ScoreBoardProps) {
  const { homeColor, awayColor, setHomeColor, setAwayColor } = useTeamColorStore();

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
          <div className="flex items-center justify-end gap-2 mb-2">
            <h3 className="text-xl font-semibold">{match.homeTeam.name}</h3>
            <JerseyColorPicker color={homeColor} onChange={setHomeColor} label={match.homeTeam.name} />
          </div>
          <div className="text-5xl font-bold" style={{ color: homeColor }}>
            {match.result.homeWins}
          </div>
        </div>

        {/* VS */}
        <div className="px-8 text-2xl font-bold text-slate-500">VS</div>

        {/* Away team */}
        <div className="text-left flex-1">
          <div className="flex items-center gap-2 mb-2">
            <JerseyColorPicker color={awayColor} onChange={setAwayColor} label={match.awayTeam.name} />
            <h3 className="text-xl font-semibold">{match.awayTeam.name}</h3>
          </div>
          <div className="text-5xl font-bold" style={{ color: awayColor }}>
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
                style={set.winner === 'home' ? { color: homeColor } : undefined}
                className={set.winner !== 'home' ? 'text-slate-300' : ''}
              >
                {set.homeScore}
              </span>
              <span className="text-slate-500 mx-1">-</span>
              <span
                style={set.winner === 'away' ? { color: awayColor } : undefined}
                className={set.winner !== 'away' ? 'text-slate-300' : ''}
              >
                {set.awayScore}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
