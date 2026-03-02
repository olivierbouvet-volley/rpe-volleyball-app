import type { Skill, QualityDistribution } from '@volleyvision/data-model';
import { getSkillIcon, getSkillLabel } from '../../utils/timelineHelpers';
import { formatEfficiency } from '../../utils/formatters';
import { getEfficiencyColor } from '../../utils/shareHelpers';

interface SkillCardProps {
  skill: Skill;
  distribution: QualityDistribution;
  efficiency: number;
  onClick?: () => void;
}

/**
 * Get background color class for quality segments
 */
function getQualityBgClass(quality: string): string {
  const colors: Record<string, string> = {
    '#': 'bg-green-500',
    '+': 'bg-blue-500',
    '!': 'bg-yellow-500',
    '-': 'bg-orange-500',
    '/': 'bg-red-400',
    '=': 'bg-red-600',
  };
  return colors[quality] || 'bg-slate-600';
}

/**
 * Horizontal skill card with stacked quality bar
 */
export function SkillCard({ skill, distribution, efficiency, onClick }: SkillCardProps) {
  // Use the total field from distribution
  const total = distribution.total;

  if (total === 0) {
    return null; // Don't render if no data
  }

  const qualities = ['#', '+', '!', '-', '/', '='] as const;
  const segments = qualities
    .map(q => ({
      quality: q,
      count: distribution[q] || 0,
      percentage: ((distribution[q] || 0) / total) * 100,
    }))
    .filter(s => s.count > 0);

  return (
    <button
      onClick={onClick}
      className="w-full bg-slate-800 rounded-lg p-2 flex items-center gap-2 hover:bg-slate-700 transition-colors text-left"
      disabled={!onClick}
    >
      {/* Skill icon and label */}
      <div className="flex items-center gap-1.5 min-w-[100px]">
        <span className="text-lg">{getSkillIcon(skill)}</span>
        <span className="text-xs font-medium text-slate-200">
          {getSkillLabel(skill)}
        </span>
      </div>

      {/* Stacked quality bar */}
      <div className="flex-1 min-w-0">
        <div className="flex h-5 rounded overflow-hidden">
          {segments.map(({ quality, percentage }) => (
            <div
              key={quality}
              className={`${getQualityBgClass(quality)} flex items-center justify-center text-xs font-bold text-white`}
              style={{ width: `${percentage}%` }}
              title={`${quality}: ${distribution[quality]}`}
            >
              {percentage > 15 && quality}
            </div>
          ))}
        </div>
        <div className="mt-0.5 text-[10px] text-slate-400">
          Total: {total}
        </div>
      </div>

      {/* Efficiency percentage */}
      <div className="text-right min-w-[50px]">
        <div className={`text-xl font-bold ${getEfficiencyColor(efficiency)}`}>
          {formatEfficiency(efficiency)}
        </div>
      </div>
    </button>
  );
}
