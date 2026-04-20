import { memo } from 'react';
import type { QualityPro } from '@volleyvision/data-model';

interface QualityBadgeProps {
  quality: QualityPro;
  count: number;
  size?: 'sm' | 'md' | 'lg';
}

const qualityColors: Record<QualityPro, string> = {
  '#': 'bg-quality-kill text-white',
  '+': 'bg-quality-positive text-white',
  '!': 'bg-quality-neutral text-slate-900',
  '-': 'bg-quality-negative text-white',
  '/': 'bg-quality-poor text-white',
  '=': 'bg-quality-error text-white',
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

/**
 * Display a colored badge for a quality code with count
 */
export const QualityBadge = memo(function QualityBadge({
  quality,
  count,
  size = 'sm',
}: QualityBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        rounded-full font-medium
        ${sizeClasses[size]}
        ${qualityColors[quality]}
      `}
      title={`Quality ${quality}: ${count}`}
    >
      {quality} {count}
    </span>
  );
});
