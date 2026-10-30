"use client";

import { ScaleInput, TextInput } from "./components"
import { RunList } from "./SessionPicker";
import { formatDuration, formatTokens, formatWhen, plural } from "@/lib/format";
import Link from "next/link";
import { useState } from "react";
import { createClient } from '@/lib/supabase/client';
import { isAuthRetryableFetchError } from "@supabase/supabase-js";

// These are only the five "scale" questions (1 - 5 input), which are passed into 
// the ScaleInput component to dynamically create the unique scale rating.
const questions = [
  { id: "completion", label: "Did the agent fully accomplish what you asked it to do?", pointLabels: ["Incomplete", "Partial", "Adequate", "Mostly", "Fully"] },
  { id: "helpfulness", label: "How useful was the agent's output for your actual needs?", pointLabels: ["Useless", "Limited", "Helpful", "Valuable", "Excellent"] },
  { id: "coherence", label: "Was the agent's output clear, logical, and well-structured?", pointLabels: ["Incoherent", "Unclear", "Readable", "Clear", "Articulate"] },
  { id: "factuality", label: "How accurate and trustworthy was the information or output?", pointLabels: ["Inaccurate", "Unreliable", "Mixed", "Accurate", "Precise"] },
  { id: "safety", label: "Did the agent behave appropriately and avoid harmful actions?", pointLabels: ["Harmful", "Concerning", "Acceptable", "Appropriate", "Exemplary"] },
];

function getErrorMessage(error, status) {
  if (status === 0) {
    return "Couldn't reach the server. Check your connection and try again.";
  }

  switch (error.code) {
    // invalid id / missing id / no matching agent
    case "22P02":
    case "23502":
    case "23503":
      return "This agent couldn't be found. It may have been removed.";
    case "42501":
      return "You don't have permission to submit this review.";
    case "PGRST301":
    case "PGRST303":
      return "Your session has expired. Please sign in again.";
    default:
      return "Something went wrong submitting your review. Please try again.";
  }
}

// Codes raised by submit_trace_backed_review(); the messages are the ones in
// the Metric Integration user workflow doc. Anything else falls back to
// getErrorMessage().
function getTraceBackedErrorMessage(error, status) {
  switch (error.code) {
    case "42501":
      return "This session was recorded by another account.";
    case "P0002":
      return "This session couldn't be found.";
    case "55000":
      return "This session is still in progress. Try again in a moment.";
    case "22023":
      return "This session has no model calls to back a review.";
    case "23505":
      // Two unique indexes can raise it: one session per review, and one
      // Trace-backed review per reviewer per agent.
      return error.message.includes("reviews_one_verified_per_reviewer")
        ? "You've already written a Trace-backed review of this agent."
        : "This session already backs a review.";
    default:
      return getErrorMessage(error, status);
  }
}

// `agent` is looked up by page.js before this renders, so it's always a real agent.
// `session` is the session picked in step 1, which makes the review Trace-backed;
// without one, `unverifiedReason` says why the review is unverified.
// `onChooseSession`, when set, means the form is step 2 of ReviewFlow.
export default function AgentReviewForm({ agent, session = null, onChooseSession = null, unverifiedReason = null }) {
  const [answers, setAnswers] = useState({});

  // Set once the insert succeeds. Shows the confirmation toast and keeps the
  // redirect from firing twice if the button is clicked again while waiting.
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Set when the insert returns an error, which contains
  // the error toast's message, or null when hidden.
  const [submitError, setSubmitError] = useState(null);

  // Variables used to determine how many questions have been answered, 
  // and a calculation to determine the progress percentage of the form.
  const totalQuestions = questions.length + 2;
  const answered = Object.keys(answers).filter((k) => answers[k] !== "" && answers[k] !== undefined).length;
  const progress = Math.round((answered / totalQuestions) * 100);

  const handleSubmit = async (e) => {
    // Prevent another insert if the review has already been submitted successfully.
    if (submitSuccess) return;

    if (answered === totalQuestions) {
      // Clear any previous error so a retry that fails again fades back in.
      setSubmitError(null);

      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (!user) {
        console.log(authError);

        setSubmitError(
          isAuthRetryableFetchError(authError)
          ? "Couldn't reach the server. Check your connection and try again."
          : "Your session has expired. Please sign in again."
        );

        return;
      }

      // A picked session goes through the RPC, the only way to mark a review
      // Trace-backed; without one it's a plain unverified insert.
      const { error, status } = session
        ? await supabase.rpc('submit_trace_backed_review', {
          p_session_id: session.id,
          p_task: answers.task_description,
          p_goal_completion: answers.completion,
          p_helpfulness: answers.helpfulness,
          p_coherence: answers.coherence,
          p_factuality: answers.factuality,
          p_safety: answers.safety,
          p_review_note: answers.note,
        })
        : await supabase
          .from('reviews')
          .insert({
            agent_id: agent.id,
            task: answers.task_description,
            goal_completion: answers.completion,
            helpfulness: answers.helpfulness,
            coherence: answers.coherence,
            factuality: answers.factuality,
            safety: answers.safety,
            review_note: answers.note,
            review_by: user.id,
          })

      if (error) {
        console.log(error);
        setSubmitError(session ? getTraceBackedErrorMessage(error, status) : getErrorMessage(error, status));
      } else {
        setSubmitSuccess(true);

        setTimeout(() => {
          // This should eventually navigate the user back
          // to the reviews page with their review selected
          window.location.href = `/agents/${agent.id}`;
        }, 1500);
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* A success message displayed to the user if the insert is successful. */}
      {submitSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="toast-fade-in fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/90 px-4 py-3 text-sm text-emerald-100 shadow-lg"
        >
          <span className="text-emerald-400">✓</span>
          Review submitted. Redirecting...
        </div>
      )}

      {/* An error message displayed to the user if the insert fails. */}
      {submitError && (
        <div
          role="alert"
          className="toast-fade-in fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-950/90 px-4 py-3 text-sm text-rose-100 shadow-lg"
        >
          <span className="text-rose-400">✕</span>
          {submitError}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-zinc-800/80 sticky top-0 bg-zinc-950/90 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            {onChooseSession ? (
              <button type="button" onClick={onChooseSession} className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer">
                ← {session ? "Choose a different session" : "Back to your sessions"}
              </button>
            ) : (
              <Link href={`/agents/${agent.id}`} className="text-xs text-zinc-500 hover:text-zinc-300">
                ← Back to agent
              </Link>
            )}
            <h1 className="text-lg font-bold tracking-tight mt-1">Reviewing {agent.name}</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {onChooseSession && "Step 2 of 2 · "}
              <span className="font-mono">{answered}/{totalQuestions} answered</span>
            </p>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="w-28 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: "#8B5CF6" }} />
            </div>
            <span className="text-xs text-zinc-500 font-mono w-8 text-right">{progress}%</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Intro */}
        <div className="mb-10">
          <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">Answer each question to help evaluate the quality of the work.</p>
        </div>

        {session && <AttachedSession session={session} onChange={onChooseSession} />}

        {/* Questions */}
        <div className="space-y-7">
          <div className={`p-5 rounded-2xl border transition-all duration-200 ${answers.task_description ? "border-zinc-700 bg-zinc-900/50" : "border-zinc-800/60 bg-zinc-900/20"}`}>
            <label className="text-sm text-zinc-200 font-medium leading-snug">
              Describe the agent task
              {answers.task_description && <span className="ml-2 text-xs text-green-600">✓</span>}
            </label>
            <TextInput
              placeholder="What was the goal of this task? What did you ask the agent to do?"
              value={answers.task_description || ""}
              onChange={(v) => setAnswers((a) => ({ ...a, task_description: v }))}
              size={4}
            />
          </div>

          {questions.map((q) => (
            <div key={q.id} className={`p-5 rounded-2xl border transition-all duration-200 ${answers[q.id] !== undefined ? "border-zinc-700 bg-zinc-900/50" : "border-zinc-800/60 bg-zinc-900/20"}`}>
              <label className="text-sm text-zinc-200 font-medium leading-snug">
                {q.label}
                {answers[q.id] !== undefined && <span className="ml-2 text-xs text-green-600">✓</span>}
              </label>
              <ScaleInput
                question={q}
                value={answers[q.id]}
                onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              />
            </div>
          ))}

          <div className={`p-5 rounded-2xl border transition-all duration-200 ${answers.note ? "border-zinc-700 bg-zinc-900/50" : "border-zinc-800/60 bg-zinc-900/20"}`}>
            <label className="text-sm text-zinc-200 font-medium leading-snug">
              Notes
              {answers.note && <span className="ml-2 text-xs text-green-600">✓</span>}
            </label>
            <TextInput
              placeholder="Do you have anything else to note about your experience?"
              value={answers.note || ""}
              onChange={(v) => setAnswers((a) => ({ ...a, note: v }))}
              size={4}
            />
          </div>
        </div>

        {!session && (
          <div className="mt-4 flex items-start gap-2 text-xs text-zinc-500 bg-zinc-900/40 border border-zinc-800/60 rounded-lg px-3 py-2">
            <span className="text-violet-400">ⓘ</span>
            <span>
              This review will be marked <span className="text-zinc-300 font-medium">Unverified</span>.
              {unverifiedReason && ` ${unverifiedReason}`}
            </span>
          </div>
        )}

        {/* Submit */}
        <div className="mt-12 pt-8 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-xs text-zinc-600">
            {totalQuestions - answered} question{totalQuestions - answered !== 1 ? "s" : ""} remaining
          </p>
          <button
            onClick={handleSubmit}
            disabled={answered < totalQuestions || submitSuccess}
            className={`px-7 py-3 rounded-full text-sm font-semibold transition-all duration-200
              ${answered === totalQuestions
                ? "text-white hover:opacity-90 shadow-lg hover:scale-[1.02] cursor-pointer"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700"
              }`}
            style={answered === totalQuestions ? { backgroundColor: "#8B5CF6", boxShadow: "0 4px 24px #8B5CF640" } : {}}
          >
            {session ? "Submit Trace-backed review" : "Submit review"}
          </button>
        </div>
      </div>
    </div>
  );
}

// The session picked in step 1: what it contains and that it makes the review Trace-backed.
function AttachedSession({ session, onChange }) {
  const tiles = [
    [session.runs.length, "runs"],
    [formatDuration(session.durationMs), "agent time"],
    [formatTokens(session.tokens), "tokens"],
    [session.modelCalls, "model calls"],
  ];

  return (
    <section aria-label="Attached session" className="mb-7 border border-teal-400/35 bg-teal-400/5 rounded-2xl p-5 space-y-3.5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex gap-3 items-start">
          <span className="w-8 h-8 rounded-lg bg-teal-400/15 text-teal-400 flex items-center justify-center shrink-0" aria-hidden="true">✓</span>
          <div>
            <p className="text-[15px] font-medium" suppressHydrationWarning>
              {formatWhen(session.startedAt)} · {plural(session.runs.length, "run")}
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed mt-1">
              This review will be published as <span className="text-teal-400 font-medium">Trace-backed</span> and cover these runs. Runs you send after submitting start a new session.
            </p>
          </div>
        </div>
        <button type="button" onClick={onChange} className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer">
          Change
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tiles.map(([value, label]) => (
          <div key={label} className="border border-zinc-700 bg-zinc-900/60 rounded-lg p-2.5">
            <div className="font-mono text-lg font-medium">{value}</div>
            <div className="text-xs text-zinc-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col border-t border-teal-400/20 pt-2.5">
        <RunList runs={session.runs} />
      </div>
    </section>
  );
}