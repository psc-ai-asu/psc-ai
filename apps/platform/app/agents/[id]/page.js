import AgentProfile from "./AgentProfile";
import { createClient } from "@/lib/supabase/server";
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

  return <AgentProfile agent={agent} />;
}
