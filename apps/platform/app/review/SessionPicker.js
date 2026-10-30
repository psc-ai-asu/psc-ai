"use client";

import Link from "next/link";
import { formatDuration, formatTime, formatTokens, formatWhen, plural } from "@/lib/format";

// Why a session can't back a review, shown under "Not available".
const UNAVAILABLE = {
  in_progress: () => "a run is still in progress. You can review this session once it finishes.",
  reviewed: (s) => `${plural(s.runs.length, "run")} · already backs one of your reviews`,
  no_model_calls: (s) => `${plural(s.runs.length, "run")} · no model calls to back a review`,
};

function sessionStats(session) {
  return `${plural(session.runs.length, "run")} · ${formatDuration(session.durationMs)} · ${formatTokens(session.tokens)} tokens`;
}

// One line per run: its number, the user's prompt and how long it took.
export function RunList({ runs }) {
  return runs.map((run, i) => (
    <span key={run.id} className="grid grid-cols-[3rem_1fr_auto] gap-2.5 items-baseline py-1 text-xs">
      <span className="font-mono text-violet-400">Run {i + 1}</span>
      <span className={`truncate ${run.prompt ? "text-zinc-300" : "text-zinc-600 italic"}`}>
        {run.prompt ?? "Prompt not recorded"}
      </span>
      <span className="font-mono text-zinc-500">{formatDuration(run.durationMs)}</span>
    </span>
  ));
}

export default function SessionPicker({ agent, sessions, pickedId, onPick, onContinue, onSkip }) {
  const ready = sessions.filter((s) => s.status === "ready");
  const unavailable = sessions.filter((s) => s.status !== "ready");
  const picked = ready.find((s) => s.id === pickedId);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800/80 sticky top-0 bg-zinc-950/90 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <Link href={`/agents/${agent.id}`} className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Back to agent
          </Link>
          <h1 className="text-lg font-bold tracking-tight mt-1">Reviewing {agent.name}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Step 1 of 2 · choose the session your review is about</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h2 className="text-[15px] font-semibold">Your recent sessions with this agent</h2>
          <p className="text-xs text-zinc-400 leading-relaxed mt-1 max-w-lg">
            A session is one conversation and keeps collecting runs until you review it. Prompts are visible only to you and the agent&apos;s developer.
          </p>
        </div>

        {ready.length > 0 && (
          <div role="radiogroup" aria-label="Sessions" className="space-y-2.5">
            {ready.map((session) => {
              const on = session.id === pickedId;
              return (
                <button
                  key={session.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onPick(session.id)}
                  className={`w-full text-left rounded-xl border px-4 py-3.5 flex flex-col gap-2.5 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400
                    ${on ? "border-violet-500 bg-violet-500/10" : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"}`}
                >
                  <span className="flex items-center gap-2.5 flex-wrap">
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${on ? "border-violet-400" : "border-zinc-500"}`}>
                      {on && <span className="w-2 h-2 rounded-full bg-violet-400" />}
                    </span>
                    <span className="text-sm font-medium" suppressHydrationWarning>{formatWhen(session.startedAt)}</span>
                    <span className="text-xs font-mono text-zinc-400">{sessionStats(session)}</span>
                    <span className="ml-auto text-[11px] font-mono text-zinc-500" suppressHydrationWarning>
                      last activity {formatTime(session.lastActivityAt)}
                    </span>
                  </span>
                  <span className="flex flex-col border-t border-zinc-800 pt-1.5 pl-6">
                    <RunList runs={session.runs} />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {unavailable.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium tracking-widest uppercase text-zinc-500">Not available</p>
            {unavailable.map((session) => (
              <div key={session.id} className="border border-dashed border-zinc-700 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-zinc-500">
                <span aria-hidden="true">{session.status === "reviewed" ? "✓" : "◷"}</span>
                <span suppressHydrationWarning>
                  {formatWhen(session.startedAt)} · {UNAVAILABLE[session.status](session)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="border border-teal-400/35 bg-teal-400/5 rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[13px] text-zinc-300 leading-relaxed" suppressHydrationWarning>
            {picked
              ? <>Attaching {plural(picked.runs.length, "run")} from {formatWhen(picked.startedAt).replace(/^\w/, (c) => c.toLowerCase())}. This review will be <span className="text-teal-400 font-medium">Trace-backed</span>.</>
              : "None of your sessions can back a review yet."}
          </p>
          <button
            type="button"
            onClick={onContinue}
            disabled={!picked}
            className={`min-h-11 px-5 py-3 rounded-full text-sm font-semibold transition-all duration-200
              ${picked ? "text-white bg-violet-600 hover:opacity-90 cursor-pointer" : "bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700"}`}
          >
            Continue to questions →
          </button>
        </div>

        <p className="text-xs text-zinc-500">
          Didn&apos;t run the agent?{" "}
          <button type="button" onClick={onSkip} className="text-violet-400 hover:text-violet-300 cursor-pointer">
            Write an unverified review instead
          </button>
          .
        </p>
      </div>
    </div>
  );
}
