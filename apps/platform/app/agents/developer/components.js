export function ScoreBar({ value, max = 5 }) {
  const pct = (value / max) * 100;
  const color = value >= 4 ? "bg-emerald-400" : value >= 3 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-stone-400 w-6 text-right">{value}</span>
    </div>
  );
};

export function MetricTile({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-lg p-3 border ${highlight ? "border-amber-500/30 bg-amber-500/5" : "border-stone-700/50 bg-stone-800/50"}`}>
      <div className={`text-xl font-mono font-semibold tracking-tight ${highlight ? "text-amber-400" : "text-stone-100"}`}>{value}</div>
      <div className="text-xs text-stone-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-stone-600 mt-0.5">{sub}</div>}
    </div>
  );
};

export function ScoreBadge({ score }) {
  const color = score >= 4 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
              : score >= 3 ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
              : "text-rose-400 bg-rose-400/10 border-rose-400/20";

  return (
    <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded border ${color}`}>
      {score.toFixed(1)}
    </span>
  );
};