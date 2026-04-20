interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  onClick?: () => void;
}

/**
 * Simple metric display card for key statistics
 */
export function MetricCard({ label, value, icon, color, onClick }: MetricCardProps) {
  const content = (
    <>
      <span className="text-xl">{icon}</span>
      <span className={`text-2xl font-bold ${color || 'text-white'}`}>
        {value}
      </span>
      <span className="text-xs text-slate-400">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="bg-slate-800 hover:bg-slate-700 rounded-lg p-2 flex flex-col items-center gap-1 transition-colors cursor-pointer"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-2 flex flex-col items-center gap-1">
      {content}
    </div>
  );
}
