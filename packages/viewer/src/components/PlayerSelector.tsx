import type { Player } from '@volleyvision/data-model';

interface PlayerSelectorProps {
  homePlayers: Player[];
  awayPlayers: Player[];
  selected: string | null;
  onChange: (playerId: string | null) => void;
}

/**
 * Dropdown selector for filtering by player
 */
export function PlayerSelector({
  homePlayers,
  awayPlayers,
  selected,
  onChange,
}: PlayerSelectorProps) {
  return (
    <select
      value={selected || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="bg-slate-700 border border-slate-600 rounded px-4 py-2 text-slate-100 font-medium min-w-[200px] hover:bg-slate-600 transition-colors cursor-pointer"
    >
      <option value="">All Players</option>

      <optgroup label="Home Team" className="bg-slate-800">
        {homePlayers.map((player) => (
          <option key={player.id} value={player.id}>
            #{player.number} {player.firstName} {player.lastName}
          </option>
        ))}
      </optgroup>

      <optgroup label="Away Team" className="bg-slate-800">
        {awayPlayers.map((player) => (
          <option key={player.id} value={player.id}>
            #{player.number} {player.firstName} {player.lastName}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
