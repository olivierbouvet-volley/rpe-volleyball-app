import type { QualityDistribution } from '@volleyvision/data-model';

interface AttackComboTableProps {
  combos: Record<string, QualityDistribution>;
  attackCombinations?: Record<string, string>;
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
 * Attack performance table by combo code
 */
export function AttackComboTable({ combos, attackCombinations }: AttackComboTableProps) {
  // Convert to array and sort by total descending
  const comboEntries = Object.entries(combos)
    .map(([code, dist]) => ({
      code,
      distribution: dist,
      total: Object.values(dist).reduce((sum, count) => sum + count, 0),
    }))
    .filter(entry => entry.total > 0)
    .sort((a, b) => b.total - a.total);

  if (comboEntries.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3 text-slate-200">Attaques par combinaison</h3>

      <div className="space-y-2">
        {comboEntries.map(({ code, distribution, total }) => {
          const description = attackCombinations?.[code] || '';
          const qualities = ['#', '+', '!', '-', '/', '='] as const;
          const segments = qualities
            .map(q => ({
              quality: q,
              count: distribution[q] || 0,
              percentage: ((distribution[q] || 0) / total) * 100,
            }))
            .filter(s => s.count > 0);

          return (
            <div key={code} className="bg-slate-900/50 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-mono font-bold text-slate-200">{code}</span>
                  {description && (
                    <span className="ml-2 text-sm text-slate-400">{description}</span>
                  )}
                </div>
                <span className="text-sm text-slate-400">Total: {total}</span>
              </div>

              {/* Stacked quality bar */}
              <div className="flex h-6 rounded overflow-hidden">
                {segments.map(({ quality, count, percentage }) => (
                  <div
                    key={quality}
                    className={`${getQualityBgClass(quality)} flex items-center justify-center text-xs font-bold text-white`}
                    style={{ width: `${percentage}%` }}
                    title={`${quality}: ${count}`}
                  >
                    {percentage > 12 && `${quality} ${count}`}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
