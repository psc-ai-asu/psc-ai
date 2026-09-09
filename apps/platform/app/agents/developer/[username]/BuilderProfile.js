"use client";

import { useState } from "react";
import Link from 'next/link';

import { ScoreBar, MetricTile, ScoreBadge } from "../components";

function flattenReviews(builder) {
  if (!builder?.agents) return [];
  return builder.agents.flatMap((agent) => {
    if (!agent.reviews?.length) {
      return [{
        id: `empty-${agent.id}`,
        agentName: agent.name,
        agentId: agent.id,
        framework: agent.framework,
        publicMetrics: agent.public_metrics,
        isEmpty: true,
      }];
    }
    return agent.reviews.map((review) => ({
      ...review,
      metrics: review.metrics?.[0] ?? null,
      reviewedBy: review.reviewer?.username ?? "Unknown",
      agentName: agent.name,
      agentId: agent.id,
      framework: agent.framework,
      publicMetrics: agent.public_metrics,
    }));
  });
}

function groupedReviews(reviews) {
  const order = [];
  const groups = {};
  reviews.forEach((r) => {
    if (!groups[r.agentName]) {
      groups[r.agentName] = [];
      order.push(r.agentName);
    }
    groups[r.agentName].push(r);
  });
  order.forEach((name) =>
    groups[name].sort((a, b) => new Date(b.date) - new Date(a.date))
  );
  return order.flatMap((name) => groups[name]);
}

function showAgentLabel(reviews, index) {
  if (index === 0) return true;
  return reviews[index].agentName !== reviews[index - 1].agentName;
}

export default function BuilderProfile({ builder }) {
  const allReviews = flattenReviews(builder);

  const [selected, setSelected] = useState(allReviews[0] ?? null);
  const [tab, setTab] = useState("experience");
  const [search, setSearch] = useState("");

  const filtered = (() => {
    const base = allReviews.filter((r) =>
      r.agentName.toLowerCase().includes(search.toLowerCase())
    );
    return groupedReviews(base);
  })();

  const experienceFields = [
    { key: "goal_completion", label: "Goal Completion" },
    { key: "helpfulness", label: "Helpfulness" },
    { key: "coherence", label: "Coherence" },
    { key: "factuality", label: "Factuality" },
    { key: "safety", label: "Safety" },
  ];

  return (
    <div className="h-screen bg-stone-950 text-stone-200 font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tracking-wide text-stone-300">ReviewMyAgent</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
        {/* Sidebar */}
        <aside className="w-72 border-r border-stone-800 flex flex-col overflow-hidden flex-shrink-0">

          {/* Builder profile */}
          <div className="px-4 pt-4 pb-3 border-b border-stone-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-violet-300">
                  {builder.username[0].toUpperCase() ?? "?"}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-200">{builder.username}</p>
                <p className="text-xs text-stone-600 font-mono">@{builder.username}</p>
              </div>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed mb-2">{builder.bio}</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-600">{builder.agents?.length ?? 0} Agents</span>
              <span className="text-xs text-stone-700">·</span>
              <span className="text-xs text-stone-600">
                Since {new Date(builder.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 pt-3 pb-2 border-b border-stone-800">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search agents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700/50 rounded-md pl-8 pr-7 py-1.5 text-xs text-stone-300 placeholder-stone-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400 transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Review list */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
                <svg className="w-6 h-6 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
                <p className="text-xs text-stone-600">No reviews match your filters</p>
                <button onClick={() => setSearch("")} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                  Clear filters
                </button>
              </div>
            ) : (
              filtered.map((r, i) => (
                <div key={r.id}>
                  {showAgentLabel(filtered, i) && (
                    <div className={`px-4 py-2 flex items-center justify-between gap-2 bg-stone-800/50`}>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-stone-300">{r.agentName}</span>
                        <span className="text-xs font-mono text-stone-500">{r.framework}</span>
                      </div>
                      <Link
                        href={`/review?agent=${r.agentId}`}
                        className="text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 px-2.5 py-1 rounded-md transition-colors flex-shrink-0"
                      >
                        + Review
                      </Link>
                    </div>
                  )}
                  <button
                    onClick={() => { if (!r.isEmpty) { setSelected(r); setTab("experience"); } }}
                    className={`w-full text-left px-4 py-3 border-b border-stone-800/40 transition-colors ${
                      r.isEmpty
                        ? "cursor-default"
                        : "hover:bg-stone-900"
                    } ${
                      selected?.id === r.id && !r.isEmpty
                        ? "bg-stone-900 border-l-2 border-l-violet-500"
                        : "border-l-2 border-l-transparent"
                    }`}
                  >
                    {r.isEmpty ? (
                      <p className="text-xs text-stone-600 italic">No reviews yet</p>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-sm text-stone-300 truncate block">{r.reviewedBy}</span>
                          <span className="text-xs font-mono text-stone-600">{r.date}</span>
                        </div>
                        <ScoreBadge score={r.overall_score} />
                      </div>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Detail panel */}
        {selected && !selected.isEmpty ? (
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-800 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold text-stone-100 mb-0.5">{selected.agentName}</h1>
                <p className="text-xs text-stone-500 mb-2">Review by {selected.reviewedBy} · {selected.date}</p>
                <span className="text-xs text-stone-600 font-mono">{selected.framework}</span>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-2xl font-mono font-semibold text-stone-100">{selected.overall_score?.toFixed(1)}</div>
                <div className="text-xs text-stone-600">overall</div>
              </div>
            </div>

            {/* Tab toggle */}
            <div className="px-6 pt-4 pb-0 border-b border-stone-800">
              <div className="flex w-fit bg-stone-900 border border-stone-700/50 rounded-lg p-0.5">
                {["experience", "metrics"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                      tab === t ? "bg-stone-700 text-stone-100 shadow-sm" : "text-stone-500 hover:text-stone-300"
                    }`}
                  >
                    {t === "experience" ? "Experience" : "Metrics"}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === "experience" ? (
                <div className="grid grid-cols-2 gap-6 h-full">
                  {/* Left column — rubric scores */}
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-medium text-stone-500 uppercase tracking-widest mb-3">Rubric scores</p>
                      <div className="space-y-3">
                        {experienceFields.map(({ key, label }) => (
                          <div key={key} className="grid grid-cols-[120px_1fr] items-center gap-3">
                            <span className="text-sm text-stone-400">{label}</span>
                            <ScoreBar value={selected[key]} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right column — agent task + reviewer note */}
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-medium text-stone-500 uppercase tracking-widest mb-3">Agent task</p>
                      <div className="bg-stone-900 border border-stone-700/50 rounded-lg px-4 py-3">
                        <p className="text-sm text-stone-300 leading-relaxed">{selected.task}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-stone-500 uppercase tracking-widest mb-3">Reviewer note</p>
                      <div className="bg-stone-900 border border-stone-700/50 rounded-lg px-4 py-3">
                        <p className={`text-sm leading-relaxed ${selected.review_note ? "text-stone-300" : "text-stone-500 italic"}`}>
                          {selected.review_note ?? "The reviewer did not leave a note."}
                        </p>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-800">
                          <div className="w-5 h-5 rounded-full bg-stone-700 flex items-center justify-center">
                            <span className="text-xs text-stone-400">{selected.reviewedBy?.[0]}</span>
                          </div>
                          <span className="text-xs text-stone-500">{selected.reviewedBy}</span>
                          <span className="text-xs text-stone-700 ml-auto font-mono">{selected.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : !selected.publicMetrics ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                  <svg className="w-6 h-6 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z" />
                  </svg>
                  <p className="text-sm text-stone-400">Metrics are private</p>
                  <p className="text-xs text-stone-600">This builder has chosen not to release metrics for this agent.</p>
                </div>
              ) : !selected.metrics ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                  <svg className="w-6 h-6 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
                  </svg>
                  <p className="text-sm text-stone-400">No trace data yet</p>
                  <p className="text-xs text-stone-600">This review doesn't have an attached execution trace.</p>
                </div>
              ) : (
                <div className="space-y-6 max-w-xl">
                  <div>
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-widest mb-3">Performance</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <MetricTile label="Latency" value={`${(selected.metrics?.latency / 1000).toFixed(2)}s`} highlight={selected.metrics?.latency > 5000} />
                      <MetricTile label="Cost" value={`$${selected.metrics?.cost?.toFixed(3)}`} />
                      <MetricTile label="Path efficiency" value={`${Math.round(selected.metrics?.path_efficiency * 100)}%`} highlight={selected.metrics?.path_efficiency < 0.7} />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-widest mb-3">Trace breakdown</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <MetricTile label="Tool calls" value={selected.metrics?.tool_calls} />
                      <MetricTile label="Errors" value={selected.metrics?.errors} highlight={selected.metrics?.errors > 0} />
                      <MetricTile label="Context tokens" value={selected.metrics?.context_tokens?.toLocaleString()} sub="input" />
                      <MetricTile label="Completion tokens" value={selected.metrics?.completion_tokens?.toLocaleString()} sub="output" />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-widest mb-3">Token usage</p>
                    <div className="bg-stone-900 border border-stone-700/50 rounded-lg px-4 py-3 space-y-2">
                      {[
                        { label: "Context (input)", value: selected.metrics?.context_tokens, color: "bg-violet-500" },
                        { label: "Completion (output)", value: selected.metrics?.completion_tokens, color: "bg-teal-500" },
                      ].map(({ label, value, color }) => {
                        const total = (selected.metrics?.context_tokens ?? 0) + (selected.metrics?.completion_tokens ?? 0);
                        return (
                          <div key={label}>
                            <div className="flex justify-between text-xs text-stone-500 mb-1">
                              <span>{label}</span>
                              <span className="font-mono">{value?.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                              <div className={`h-full ${color} rounded-full`} style={{ width: `${total ? (value / total) * 100 : 0}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-stone-700 font-mono border border-stone-800 rounded px-3 py-2 bg-stone-900/50">
                    <span className="text-stone-600">trace_id</span>
                    <span>·</span>
                    <span>rev_{selected.id?.toString().padStart(4, "0")}_{selected.date?.replace(/\s/g, "").toLowerCase()}</span>
                  </div>
                </div>
              )}
            </div>
          </main>
        ): (
          <main className="flex-1 flex items-center justify-center">
            <p className="text-sm text-stone-600 italic">No review selected</p>
          </main>
        )}
      </div>
    </div>
  );
}