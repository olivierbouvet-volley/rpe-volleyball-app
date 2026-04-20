import type { SetData } from '@volleyvision/data-model';

interface SetSelectorProps {
  sets: SetData[];
  selected: number | null;
  onChange: (setNumber: number | null) => void;
}

/**
 * Button group for filtering by set
 */
export function SetSelector({ sets, selected, onChange }: SetSelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => onChange(null)}
        className={`
          px-4 py-2 rounded font-medium transition-colors
          ${
            selected === null
              ? 'bg-primary-green text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }
        `}
      >
        MATCH
      </button>

      {sets.map((set) => (
        <button
          key={set.number}
          onClick={() => onChange(set.number)}
          className={`
            px-4 py-2 rounded font-medium transition-colors
            ${
              selected === set.number
                ? 'bg-primary-green text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }
          `}
        >
          Set {set.number}
        </button>
      ))}
    </div>
  );
}
