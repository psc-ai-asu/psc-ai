import Link from "next/link";
import ReviewFlow from "./ReviewFlow";
import { createClient } from "@/lib/supabase/server";
import { summarizeSession, toRun } from "@/lib/otel/display";

// How many of the reviewer's most recent sessions the picker offers.
const RECENT_SESSIONS = 10;

export default async function ReviewPage({ searchParams }) {
  const { agent: agentId } = await searchParams;

  if (!agentId) {
    return <AgentUnavailable message="No agent selected." />;
  }

  // A malformed id comes back as an error and an unknown id as null,
  // so both land in the same "couldn't be found" message below.
  const supabase = await createClient();
  const { data: agent } = await supabase
    .from("agents")
    .select("id, name")
    .eq("id", agentId)
    .maybeSingle();

  if (!agent) {
    return <AgentUnavailable message="This agent couldn't be found. It may have been removed." />;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <ReviewFlow agent={agent} sessions={[]} hasTraceBackedReview={false} />;
  }

  const [sessions, hasTraceBackedReview] = await Promise.all([
    loadSessions(supabase, agent.id, user.id),
    loadHasTraceBackedReview(supabase, agent.id, user.id),
  ]);

  return <ReviewFlow agent={agent} sessions={sessions} hasTraceBackedReview={hasTraceBackedReview} />;
}

/**
 * The reviewer's recent sessions with this agent, newest first, each with its
 * runs and a status: "ready" can back a review; "in_progress", "reviewed" and
 * "no_model_calls" can't (the same checks submit_trace_backed_review() makes).
 */
async function loadSessions(supabase, agentId, userId) {
  const { data: sessions } = await supabase
    .from("trace_sessions")
    .select("id, last_span_at, reviewed_at")
    .eq("agent_id", agentId)
    .eq("submitted_by", userId)
    .order("last_span_at", { ascending: false })
    .limit(RECENT_SESSIONS);

  if (!sessions?.length) return [];

  const { data: runs } = await supabase
    .from("trace_run_summaries")
    .select("*")
    .in("session_id", sessions.map((s) => s.id))
    .order("started_at");

  return sessions.map((session) => {
    const summary = summarizeSession((runs ?? []).filter((run) => run.session_id === session.id).map(toRun));

    let status = "ready";
    if (session.reviewed_at) status = "reviewed";
    else if (summary.runs.length === 0 || summary.runs.some((run) => !run.finished)) status = "in_progress";
    else if (summary.modelCalls === 0) status = "no_model_calls";

    return {
      ...summary,
      id: session.id,
      startedAt: summary.startedAt ?? session.last_span_at,
      lastActivityAt: session.last_span_at,
      status,
    };
  });
}

// A reviewer gets one Trace-backed review per agent (reviews_one_verified_per_reviewer).
async function loadHasTraceBackedReview(supabase, agentId, userId) {
  const { count } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .eq("review_by", userId)
    .eq("verification_status", "verified");
  return count > 0;
}

function AgentUnavailable({ message }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <p className="text-sm text-zinc-400">
        {message} <Link href="/agents" className="text-violet-400 hover:text-violet-300">Browse agents</Link>
      </p>
    </div>
  );
}
