"use client";

import { useState } from "react";
import Link from "next/link";
import PlatformHeader from "@/components/PlatformHeader";

import { formatDuration, formatTokens, plural } from "@/lib/format";
import { ScoreBar, ScoreBadge, TRACE_BACKED_EXPLANATION, VerificationBadge } from "./components";
import TraceView from "./TraceView";

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'});
}

function mapReview(review) {
  return {
    ...review,
    reviewedBy: review.reviewer?.username ?? "Unknown",
    rawDate: review.date,
    date: formatDate(review.date),
  };
}

// `sessions` maps a session id to its runs and totals (see page.js); it's
// empty when this viewer can't see the agent's traces.
export default function AgentProfile({ agent, sessions }) {
  const allReviews = (agent.reviews ?? [])
    .map(mapReview)
    .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

  const [selected, setSelected] = useState(allReviews[0] ?? null);
  const [tab, setTab] = useState("experience");
  const [search, setSearch] = useState("");
  // Below md the list and the detail don't fit side by side, so only one shows at a time
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const filtered = allReviews.filter((r) =>
    r.reviewedBy.toLowerCase().includes(search.toLowerCase())
  );

  // The session behind the selected review, when it's Trace-backed and visible to this viewer.
  const session = selected?.session_id ? sessions[selected.session_id] : null;
  const prompts = session?.runs.filter((run) => run.prompt) ?? [];

  const experienceFields = [
    { key: "goal_completion", label: "Goal Completion" },
    { key: "helpfulness", label: "Helpfulness" },
    { key: "coherence", label: "Coherence" },
    { key: "factuality", label: "Factuality" },
    { key: "safety", label: "Safety" },
  ];

  return (
    <div className="app-shell h-screen flex flex-col" style={{ height: "100dvh", minHeight: 0 }}>
      <PlatformHeader current="agents" />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className={`${mobileDetailOpen ? "hidden" : "flex"} md:flex w-full md:w-72 md:border-r border-stone-800 flex-col overflow-hidden flex-shrink-0`}>
          <div className="px-4 pt-4 pb-3 border-b border-stone-800">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-stone-100 leading-tight">{agent.name}</h1>
                <p className="text-xs text-stone-500 font-mono mt-0.5">{agent.framework}</p>
              </div>
              <Link
                href={`/review?agent=${agent.id}`}
                className="text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 px-2.5 py-1 rounded-md transition-colors flex-shrink-0"
              >
                + Review
              </Link>
            </div>
            {agent.description && (
              <p className="text-sm text-stone-400 leading-relaxed mb-2">{agent.description}</p>
            )}
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-500">
                by {agent.developer?.username ? (
                  <span className="text-stone-300">{agent.developer.username}</span>
                ) : "unknown"}
              </span>
              <span className="text-xs text-stone-700">·</span>
              <span className="text-xs text-stone-500">{allReviews.length} review{allReviews.length === 1 ? "" : "s"}</span>
            </div>
          </div>

          <div className="px-3 pt-3 pb-2 border-b border-stone-800">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search reviewers..."
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

          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
                <svg className="w-6 h-6 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
                <p className="text-xs text-stone-600">
                  {allReviews.length === 0 ? "No reviews yet" : "No reviews match your search"}
                </p>
                {search && (
                  <button onClick={() => setSearch("")} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setSelected(r); setTab("experience"); setMobileDetailOpen(true); }}
                  className={`w-full text-left px-4 py-3 border-b border-stone-800/40 transition-colors hover:bg-stone-900 ${
                    selected?.id === r.id
                      ? "bg-stone-900 border-l-2 border-l-violet-500"
                      : "border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-stone-300 block [overflow-wrap:anywhere]">{r.reviewedBy}</span>
                      <span className="text-xs font-mono text-stone-600">{r.date}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <ScoreBadge score={r.overall_score} />
                      <VerificationBadge status={r.verification_status} />
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {selected ? (
          <main className={`${mobileDetailOpen ? "flex" : "hidden"} md:flex flex-1 min-w-0 flex-col overflow-hidden`}>
            <div className="px-6 py-4 border-b border-stone-800 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <button
                  onClick={() => setMobileDetailOpen(false)}
                  className="md:hidden block text-xs text-stone-500 hover:text-stone-300 transition-colors py-1 mb-1"
                >
                  ← All {agent.name} reviews
                </button>
                <h2 className="text-lg font-semibold text-stone-100 mb-1 [overflow-wrap:anywhere]">
                  Review by <span className="text-violet-300">{selected.reviewedBy}</span>
                </h2>
                <p className="text-xs text-stone-500 flex flex-wrap items-center gap-2">
                  <span className="font-mono">{selected.date}</span>
                  <VerificationBadge status={selected.verification_status} />
                  {selected.verification_status === "verified" && (
                    <span className="text-stone-600">{TRACE_BACKED_EXPLANATION}</span>
                  )}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-2xl font-mono font-semibold text-stone-100">{selected.overall_score?.toFixed(1)}</div>
                <div className="text-xs text-stone-600">overall</div>
              </div>
            </div>

            {session && (
              <div className="px-6 py-3 border-b border-stone-800 bg-stone-900 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-400">
                <span className="text-[11px] font-medium uppercase tracking-widest text-teal-400">Session</span>
                <span><span className="font-mono text-stone-100">{session.runs.length}</span> {session.runs.length === 1 ? "run" : "runs"}</span>
                <span><span className="font-mono text-stone-100">{formatDuration(session.durationMs)}</span> agent time</span>
                <span><span className="font-mono text-stone-100">{session.modelCalls}</span> model calls</span>
                <span>
                  <span className="font-mono text-stone-100">{session.toolCalls}</span> tool calls
                  {session.failedToolCalls > 0 && <> · <span className="text-amber-400">{session.failedToolCalls} returned errors</span></>}
                </span>
                <span><span className="font-mono text-stone-100">{formatTokens(session.tokens)}</span> tokens</span>
              </div>
            )}

            <div className="px-6 py-4 border-b border-stone-800">
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
                    {t === "metrics" && session && (
                      <span className="ml-1.5 font-mono text-[11px] text-teal-400">{plural(session.runs.length, "run")}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === "experience" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:h-full">
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

                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-medium text-stone-500 uppercase tracking-widest mb-3">Agent task</p>
                      <div className="bg-stone-900 border border-stone-700/50 rounded-lg px-4 py-3">
                        <p className="text-sm text-stone-300 leading-relaxed">{selected.task}</p>
                      </div>
                    </div>

                    {prompts.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-stone-500 uppercase tracking-widest mb-3 flex flex-wrap items-center gap-2">
                          What the agent was asked
                          <span className="normal-case tracking-normal font-normal text-stone-600">
                            🔒 from the trace · only you and the agent owner see this
                          </span>
                        </p>
                        <div className="bg-stone-900 border border-stone-700/50 rounded-lg">
                          {session.runs.map((run, i) => run.prompt && (
                            <div key={run.id} className="px-4 py-2.5 border-b border-stone-800 last:border-b-0 grid grid-cols-[52px_1fr_auto] gap-3 items-baseline">
                              <span className="text-[11px] font-mono text-violet-400">Run {i + 1}</span>
                              <span className="text-sm text-stone-300 leading-relaxed">{run.prompt}</span>
                              <span className="text-xs font-mono text-stone-600">{formatDuration(run.durationMs)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
              ) : session ? (
                <TraceView key={selected.session_id} session={session} />
              ) : !agent.public_metrics && selected.session_id ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                  <svg className="w-6 h-6 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z" />
                  </svg>
                  <p className="text-sm text-stone-400">Metrics are private</p>
                  <p className="text-xs text-stone-600">This builder has chosen not to release metrics for this agent.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
                  <svg className="w-6 h-6 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
                  </svg>
                  <p className="text-sm text-stone-400">No trace data</p>
                  <p className="text-xs text-stone-600">This review doesn’t have an attached execution trace.</p>
                </div>
              )}
            </div>
          </main>
        ) : (
          <main className="hidden md:flex flex-1 items-center justify-center">
            <p className="text-sm text-stone-600 italic">No review selected</p>
          </main>
        )}
      </div>
    </div>
  );
}
