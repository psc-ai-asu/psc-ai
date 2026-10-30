import AgentProfile from "./AgentProfile";
import { createClient } from "@/lib/supabase/server";
import { summarizeSession, toRun } from "@/lib/otel/display";
import { notFound } from "next/navigation";

export default async function AgentPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: agent, error } = await supabase
    .from("agents")
    .select(`*, developer:profiles!developed_by ( username ), reviews (*, reviewer:profiles!review_by ( username ))`)
    .eq("id", id)
    .single();

  if (error || !agent) {
    notFound();
  }

  // RLS decides what comes back: runs for agents with public metrics, or for
  // the agent's owner; prompts (root_prompt) only for the reviewer who sent
  // the session and the owner.
  const sessionIds = (agent.reviews ?? []).map((r) => r.session_id).filter(Boolean);
  const { data: runs } = sessionIds.length
    ? await supabase.from("trace_run_summaries").select("*").in("session_id", sessionIds).order("started_at")
    : { data: [] };

  // Session id → its runs and totals, for each session this viewer can see.
  const sessions = {};
  for (const sessionId of sessionIds) {
    const own = (runs ?? []).filter((run) => run.session_id === sessionId);
    if (own.length) sessions[sessionId] = summarizeSession(own.map(toRun));
  }

  return <AgentProfile agent={agent} sessions={sessions} />;
}
