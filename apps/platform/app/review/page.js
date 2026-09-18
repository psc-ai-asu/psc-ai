import Link from "next/link";
import AgentReviewForm from "./AgentReviewForm";
import { createClient } from "@/lib/supabase/server";

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

  return <AgentReviewForm agent={agent} />;
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
