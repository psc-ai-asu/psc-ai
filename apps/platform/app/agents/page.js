"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import PlatformHeader from "@/components/PlatformHeader";
import { AgentListItem, SearchFilterBar } from "./components";

function mapAgent(row) {
  const reviewCount = row.reviews?.length ?? 0;
  const avgScore = reviewCount
    ? row.reviews.reduce((sum, r) => sum + Number(r.overall_score), 0) / reviewCount
    : null;

  return {
    id: row.id,
    name: row.name,
    framework: row.framework,
    developerUsername: row.developer?.username ?? "unknown",
    reviewCount,
    avgScore,
  };
}

export default function AgentDirectoryPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [developerFilter, setDeveloperFilter] = useState("all");

  useEffect(() => {
    async function fetchAgents() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("agents")
        .select("*, developer:profiles!developed_by(username), reviews(overall_score)");

      if (error) {
        console.error(error);
      } else {
        setAgents(data.map(mapAgent));
      }
      setLoading(false);
    }

    fetchAgents();
  }, []);

  const developers = [...new Set(agents.map((a) => a.developerUsername))].sort();

  const filtered = agents.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch = a.name.toLowerCase().includes(q) || a.developerUsername.toLowerCase().includes(q);
    const matchesDeveloper = developerFilter === "all" || a.developerUsername === developerFilter;
    return matchesSearch && matchesDeveloper;
  });

  return (
    <div className="app-shell h-screen flex flex-col">
      <PlatformHeader current="agents" />

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-stone-100 mb-1">Agent Directory</h1>
            <p className="text-sm text-stone-500">Browse agents onboarded to the platform. Select one to see its reviews, or filter by developer.</p>
          </div>

          <SearchFilterBar
            search={search}
            setSearch={setSearch}
            developerFilter={developerFilter}
            setDeveloperFilter={setDeveloperFilter}
            developers={developers}
          />

          {loading ? (
            <p className="text-sm text-stone-600 mt-8">Loading agents…</p>
          ) : (
            <div className="mt-6 space-y-3">
              {filtered.length === 0 && (
                <p className="text-sm text-stone-600">No agents match your filters.</p>
              )}
              {filtered.map((agent) => (
                <AgentListItem key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
