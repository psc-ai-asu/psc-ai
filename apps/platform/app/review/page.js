"use client";

import { ScaleInput, TextInput } from "./components"
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { createClient } from '@/lib/supabase/client';

// These are only the five "scale" questions (1 - 5 input), which are passed into 
// the ScaleInput component to dynamically create the unique scale rating.
const questions = [
  { id: "completion", label: "Did the agent fully accomplish what you asked it to do?", pointLabels: ["Incomplete", "Partial", "Adequate", "Mostly", "Fully"] },
  { id: "helpfulness", label: "How useful was the agent's output for your actual needs?", pointLabels: ["Useless", "Limited", "Helpful", "Valuable", "Excellent"] },
  { id: "coherence", label: "Was the agent's output clear, logical, and well-structured?", pointLabels: ["Incoherent", "Unclear", "Readable", "Clear", "Articulate"] },
  { id: "factuality", label: "How accurate and trustworthy was the information or output?", pointLabels: ["Inaccurate", "Unreliable", "Mixed", "Accurate", "Precise"] },
  { id: "safety", label: "Did the agent behave appropriately and avoid harmful actions?", pointLabels: ["Harmful", "Concerning", "Acceptable", "Appropriate", "Exemplary"] },
];

function AgentReviewForm() {
  const searchParams = useSearchParams();
  const agent = searchParams.get("agent");
  const [answers, setAnswers] = useState({});

  // Set once the insert succeeds. Shows the confirmation toast and keeps the
  // redirect from firing twice if the button is clicked again while waiting.
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Set when the insert returns an error. Shows the error toast.
  const [submitError, setSubmitError] = useState(false);

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
      setSubmitError(false);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('reviews')
        .insert({
          agent_id: agent,
          task: answers.task_description,
          goal_completion: answers.completion,
          helpfulness: answers.helpfulness,
          coherence: answers.coherence,
          factuality: answers.factuality,
          safety: answers.safety,
          review_note: answers.note,
          review_by: user.id,
          verification_status: 'unverified'
        })

      if (error) {
        console.log(error);
        setSubmitError(true);
      } else {
        setSubmitSuccess(true);

        setTimeout(() => {
          // This should eventually navigate the user back
          // to the reviews page with their review selected
          window.location.href = `/agents/${agent}`;
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
          Something went wrong submitting your review. Please try again.
        </div>
      )}

      {/* Header */}
      <div className="border-b border-zinc-800/80 sticky top-0 bg-zinc-950/90 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Agent Review</h1>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{answered}/{totalQuestions} answered</p>
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
          <p className="text-zinc-400 text-sm leading-relaxed max-w-lg">Answer each question to help evaluate the quality of the agent's work.</p>
        </div>

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

        <div className="mt-4 flex items-start gap-2 text-xs text-zinc-500 bg-zinc-900/40 border border-zinc-800/60 rounded-lg px-3 py-2">
          <span className="text-violet-400">ⓘ</span>
          <span>This review will be marked <span className="text-zinc-300 font-medium">Unverified</span>. Verified reviews backed by execution traces are coming soon.</span>
        </div>

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
            Submit review
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={null}>
      <AgentReviewForm />
    </Suspense>
  );
}