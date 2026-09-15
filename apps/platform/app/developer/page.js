// The main page for developer dashboard
"use client";

import { supabase } from '../lib/supabaseClient';
import { useState , useEffect } from "react";
import { Avatar, StatCard } from "../../components/dev-components/UI";
import AgentCard from "../../components/dev-components/AgentCard";
import { fetchProfile, fetchAgents, insertAgent, updateAgent } from "../../components/dev-components/data";
import EditBioModal from "../../components/dev-components/EditProfile";
import RegisterAgentModal from "../../components/RegisterAgentModal";
import Footer from "@/components/Footer";
import PlatformHeader from "@/components/PlatformHeader";

export default function BuilderDashboard() {
  const [profile, setProfile] = useState(null);
  const [agents, setAgents] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFramework, setFilterFramework] = useState("all");
  const [search, setSearch] = useState(""); 
  const [showEditBio, setShowEditBio] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  //refresh agent list after a new agent is registered
  const handleAgentRegistered = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await fetchAgents(user.id);
    setAgents(data ?? []);
  };

  // Load profile from user.id
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: profileData }, { data: agentsData }] = await Promise.all([
        fetchProfile(user.id),
        fetchAgents(user.id),
      ]);
      setProfile(profileData);
      setAgents(agentsData ?? []);
    };
    load();
  }, []);

  // Not sure how we want to handle firing agents
  const handleFire = async (agentId) => {
    await updateAgent(agentId, { status: "fired" });
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, status: "fired" } : a))
    );
  };

  // Handling bio changes
  const handleBioSave = (newBio) => {
    setProfile((prev) => ({ ...prev, bio: newBio }));
  };

  // Derived state
  const frameworks = ["all", ...new Set(agents.map((a) => a.framework))];
  const statuses = ["all", "active", "draft", "fired"];
  const filtered = agents.filter((a) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterFramework !== "all" && a.framework !== filterFramework) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q) ||
        (a.tags || []).some((t) => t.includes(q))
      );
    }
    return true;
  });

  const activeCount = agents.filter((a) => a.status === "active").length;
  const totalReviews = agents.reduce((s, a) => s + (a.review_count || 0), 0);
  
  return (
    <div className="app-shell">
      <PlatformHeader current="developer" />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 64px" }}>

        {/* Profile Header */}
        <div
          style={{
            background: "var(--bg-raised)", border: "var(--border)",
            borderRadius: 14, padding: "24px 28px", marginBottom: 24,
            display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap",
          }}>
        <div
          onClick={() => setShowEditBio(true)}
          style={{ cursor: "pointer", position: "relative" }}
          title="Edit bio">
          <Avatar name={profile?.username?.charAt(0).toUpperCase()}/>
            <div style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0,
              transition: "opacity 0.15s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
              onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
            >
          <span style={{ fontSize: 11, color: "var(--text)", fontFamily: "var(--font-sans)", fontWeight: 500 }}>
            Edit
          </span>
        </div>
        </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: -0.4 }}>
              {profile?.full_name}
            </h1>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>@{profile?.username}</div>
            {profile?.email && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                Email: {profile?.email}
              </div>
            )}
            {profile?.bio && (
              <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, maxWidth: 480 }}>
                {profile?.bio}
              </p>
            )}
          </div>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(2,1fr)", 
            gap: 12, 
            minWidth: 200
            }}>
              <StatCard 
                label="Agents"    
                value={agents.length}     
                sub={`${activeCount} active`} 
              />
              <StatCard 
              label="Reviews"   
              value={totalReviews}      
              sub="all time" 
              />
          </div>
        </div>

        {/* Agents Section */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
              Registered agents{" "}
              <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>
                {filtered.length} of {agents.length}
              </span>
            </h2>
            <button
              onClick={() => setShowRegister(true)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "8px 14px", fontSize: 12, fontWeight: 600,
                fontFamily: "var(--font-sans)",
                color: "var(--text)", background: "var(--accent)", border: "none",
                borderRadius: 8, cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Register agent
            </button>
          </div>

          {/* Filter bar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
            <input
              placeholder="Search by name, description, or tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: 180, padding: "7px 11px", fontSize: 12,
                fontFamily: "var(--font-sans)", color: "var(--text)",
                background: "var(--bg-raised)", border: "var(--border)",
                borderRadius: 8, outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  style={{
                    padding: "5px 11px", fontSize: 11,
                    fontFamily: "var(--font-sans)", fontWeight: 500,
                    borderRadius: 7,
                    border: `1px solid ${filterStatus === s ? "var(--accent)" : "var(--border)"}`,
                    background: filterStatus === s ? "var(--accentDim)" : "var(--bg-raised)",
                    color: filterStatus === s ? "var(--accent)" : "var(--text-muted)",
                    cursor: "pointer", textTransform: "capitalize",
                  }}
                >
                  {s === "all" ? "All statuses" : s}
                </button>
              ))}
            </div>
            <select
              value={filterFramework}
              onChange={(e) => setFilterFramework(e.target.value)}
              style={{
                padding: "5px 10px", fontSize: 11,
                fontFamily: "var(--font-sans)",
                color: "var(--text-muted)", background: "var(--bg-raised)",
                border: "var(--border)", borderRadius: 7, cursor: "pointer", outline: "none",
              }}
            >
              {frameworks.map((f) => (
                <option key={f} value={f}>{f === "all" ? "All frameworks" : f}</option>
              ))}
            </select>
          </div>

          {/* Agent grid*/}
          {filtered.length === 0 ? (
            <div style={{
              background: "var(--bg-raised)", 
              border: "1.5px solidvar(--border)",
              borderRadius: 12, 
              padding: "44px 24px", 
              textAlign: "center",
              margin: "40px auto",
            }}>
            <div style={{ 
              fontSize: 14, 
              fontWeight: 600, 
              color: "var(--text)", 
              marginBottom: 5 
            }}>
              {agents.length === 0 ? "No agents yet" : "No agents match filters"}
            </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18, alignItems: "center" }}>
                {agents.length === 0
                  ? "Register your first agent to start collecting performance reviews."
                  : "Try adjusting the search or filters."}
              </div>
              {agents.length === 0 && (
                <button
                  onClick={() => setShowRegister(true)}
                  style={{
                    padding: "9px 18px", fontSize: 12, fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                    color: "var(--text)", background: "var(--accent)", border: "none",
                    borderRadius: 8, cursor: "pointer",
                  }}
                >
                  Register first agent
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {filtered.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onFire={handleFire}
                  //onViewReviews={handleViewReviews}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      {showEditBio && (
        <EditBioModal
          currentBio={profile?.bio}
          onClose={() => setShowEditBio(false)}
          onSave={handleBioSave}
        />
      )}
      {/* register agent modal */}
      {showRegister && (
        <RegisterAgentModal
          onClose={() => setShowRegister(false)}
          onSuccess={handleAgentRegistered}
        />
      )}
      <Footer />
    </div>
  );
  
}
