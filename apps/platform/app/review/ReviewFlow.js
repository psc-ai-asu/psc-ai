"use client";

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
    return <AgentReviewForm agent={agent} unverifiedReason="To write a Trace-backed review, run the agent with tracing turned on, then come back here." />;
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
