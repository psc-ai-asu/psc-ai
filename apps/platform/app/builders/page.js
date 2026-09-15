"use client";

import { useState, useEffect } from "react";
import { supabase } from '../lib/supabaseClient';
import Link from "next/link";
import PlatformHeader from "@/components/PlatformHeader";

export default function BuilderDirectory() {
  const [builders, setBuilders] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchBuilders() {
      // This query only returns the profiles that have registered agents.
      const { data, error } = await supabase
        .from("profiles")
        .select("*, agents!inner(id)");

      if (error) { 
        console.error(error); 
      } else {
        setBuilders(data);
      }
    }

    fetchBuilders()
  }, []);

  const filtered = builders.filter((d) =>
    d.username.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="app-shell h-screen flex flex-col">
      <PlatformHeader current="builders" />

      {/* Page content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-2xl mx-auto px-6 py-10">

          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-stone-100 mb-1">Agent Builders</h1>
            <p className="text-sm text-stone-500">Browse agents built and registered by the community. Click a builder to see their agents and reviews.</p>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search builders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-stone-900 border border-stone-700/50 rounded-lg pl-9 pr-8 py-2.5 text-sm text-stone-300 placeholder-stone-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Result count */}
          <p className="text-xs text-stone-600 mb-4 font-mono">
            {filtered.length} of {builders.length} builders
          </p>

          {/* Developer list */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <svg className="w-6 h-6 text-stone-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              <p className="text-sm text-stone-600">No builders match your search</p>
              <button
                onClick={() => setSearch("")}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((dev) => (
                <Link
                  key={dev.username}
                  href={`/builders/${dev.username}`}
                  className="block bg-stone-900 border border-stone-700/50 rounded-lg px-4 py-4 hover:border-stone-600 hover:bg-stone-800/60 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-medium text-violet-300">{dev.username[0].toUpperCase()}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-stone-200">{dev.username}</span>
                        <span className="text-xs text-stone-600 font-mono">@{dev.username}</span>
                      </div>
                      <p className="text-xs text-stone-500 leading-relaxed mb-2">{dev.bio}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-stone-600">Since {formatDate(dev.created_at)}</span>
                      </div>
                    </div>

                    {/* Chevron */}
                    <svg className="w-4 h-4 text-stone-600 group-hover:text-stone-400 transition-colors flex-shrink-0 mt-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
