import type { FilteredAction } from '../../utils/filterEngine';
import { getSkillIcon, getSkillLabel, getQualityColorClass } from '../../utils/timelineHelpers';

interface HighlightRowProps {
  index: number;
  item: FilteredAction;
  onClick: () => void;
}

/**
 * Clickable video highlight row for player highlights list
 */
export function HighlightRow({ index, item, onClick }: HighlightRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded hover:bg-slate-700 transition-colors flex items-center gap-3"
    >
      <span className="w-8 text-right font-mono text-slate-500 text-sm">
        {index + 1}
      </span>
      <span className={`${getQualityColorClass(item.action.quality)} px-2 py-0.5 rounded font-bold text-sm`}>
        {item.action.quality}
      </span>
      <span className="text-lg">{getSkillIcon(item.action.skill)}</span>
      <span className="text-sm text-slate-300">{getSkillLabel(item.action.skill)}</span>
      <span className="text-xs text-slate-500 ml-auto">
        {item.matchTime}
      </span>
    </button>
  );
}
