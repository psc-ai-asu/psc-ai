"use client";

import Link from "next/link";
import { useState } from "react";
import AgentReviewForm from "./AgentReviewForm";
import SessionPicker from "./SessionPicker";

// Step 1 picks one of the reviewer's sessions, which makes the review
// Trace-backed; step 2 is the questions. With no sessions to offer, or a
// Trace-backed review of this agent already written, it goes straight to an
// unverified review.
export default function ReviewFlow({ agent, sessions, hasTraceBackedReview }) {
  const [step, setStep] = useState("pick");
  const [pickedId, setPickedId] = useState(() => sessions.find((s) => s.status === "ready")?.id ?? null);

  if (hasTraceBackedReview) {
    return <AgentReviewForm agent={agent} unverifiedReason="You've already written a Trace-backed review of this agent." />;
  }
  if (sessions.length === 0) {
    // New tab, so a half-written review isn't lost.
    const reason = (
      <>
        To write a Trace-backed review,{" "}
        <Link href="/review/trace-tokens" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">
          create a personal trace token
        </Link>
        , run the agent with it, then come back here.
      </>
    );
    return <AgentReviewForm agent={agent} unverifiedReason={reason} />;
  }

  if (step === "pick") {
    return (
      <SessionPicker
        agent={agent}
        sessions={sessions}
        pickedId={pickedId}
        onPick={setPickedId}
        onContinue={() => setStep("trace-backed")}
        onSkip={() => setStep("unverified")}
      />
    );
  }

  return (
    <AgentReviewForm
      agent={agent}
      session={step === "trace-backed" ? sessions.find((s) => s.id === pickedId) : null}
      onChooseSession={() => setStep("pick")}
    />
  );
}
