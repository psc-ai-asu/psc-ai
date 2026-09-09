// presentational pieces for the Agent Directory — scoped to this page only

import Link from "next/link";

export function ScoreBadge({ score }) {
  if (score == null) {
    return (
      <span className="text-xs font-mono font-medium px-2 py-0.5 rounded border text-stone-500 bg-stone-800/50 border-stone-700/50">
        No reviews
      </span>
    );
  }
  const color = score >= 4 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
              : score >= 3 ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
              : "text-rose-400 bg-rose-400/10 border-rose-400/20";
  return (
    <span className={`text-xs font-mono font-medium px-2 py-0.5 rounded border ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

export function AgentListItem({ agent }) {
  return (
    <Link
      href={`/agents/${agent.id}`}
      className="block w-full text-left p-4 rounded-lg border border-stone-800 hover:border-stone-700 bg-stone-900/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-stone-100 truncate">{agent.name}</div>
          <div className="text-xs text-stone-500 mt-0.5">
            {agent.framework} · by {agent.developerUsername}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <ScoreBadge score={agent.avgScore} />
          <div className="text-xs text-stone-600 mt-1">{agent.reviewCount} review{agent.reviewCount === 1 ? "" : "s"}</div>
        </div>
      </div>
    </Link>
  );
}

export function SearchFilterBar({ search, setSearch, developerFilter, setDeveloperFilter, developers }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <input
        placeholder="Search agents or developers…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 outline-none focus:border-violet-500/50"
      />
      <select
        value={developerFilter}
        onChange={(e) => setDeveloperFilter(e.target.value)}
        className="bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-sm text-stone-300 outline-none focus:border-violet-500/50"
      >
        <option value="all">All developers</option>
        {developers.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </div>
  );
}
