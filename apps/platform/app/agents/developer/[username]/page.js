import BuilderProfile from "./BuilderProfile";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function DeveloperProfilePage({ params }) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: builder, error } = await supabase
    .from("profiles")
    .select(`*, agents (*, reviews (*, reviewer:profiles!review_by ( username )))`)
    .eq("username", username)
    .single();

  if (error || !builder) {
    notFound();
  }

  return <BuilderProfile builder={builder} />;
}