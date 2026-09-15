// The main page for developer dashboard

'use client';

import { useState } from 'react';
import PlatformHeader from '../../components/PlatformHeader';
import Footer from '../../components/Footer';
import StatsRow from '../../components/StatsRow';
import SearchFilters from '../../components/SearchFilters';
import AgentList from '../../components/AgentList';
import AgentDetail from '../../components/AgentDetail';

//placeholder stats
const activeCount = 1;
const firedCount = 3;
const avgScore = 82;
const totalReviews = 145;

//placeholder filters
const status = ['all', 'active', 'fired'];

//placeholder agents
const AGENTS = [
  {
    id: "agt-001",
    name: "TestAgent01",
    version: "v2.3.1",
    framework: "LangChain",
    status: "active",
    score: 87,
    tags: [],
    reviews: 142,
    metrics: {
      goalCompletion: 91,
      latencyMs: 2340,
      costPerRun: 0.043,
      pathEfficiency: 84,
    },
  },
  {
    id: "agt-002",
    name: "TestAgent02",
    version: "v2.3.1",
    framework: "LangChain",
    status: "active",
    score: 40,
    tags: [],
    reviews: 142,
    metrics: {
      goalCompletion: 34,
      latencyMs: 5024,
      costPerRun: 0.432,
      pathEfficiency: 20,
    },
  },
];

export default function DeveloperPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  //filter agents by search and status
  const filtered = AGENTS.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || filterStatus === 'all'
      ? true
      : a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });
  const selectedAgent = AGENTS.find((a) => a.id === selectedId) ?? null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <PlatformHeader current="developer" />

      {/* page hero */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-raised)',
        padding: '48px 0 36px',
      }}>
        <div className="container">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--accent-soft)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 20,
            padding: '5px 14px',
            marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Developer View</span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '-0.5px',
            color: 'var(--text)',
            marginBottom: 10,
            lineHeight: 1.2,
          }}>
            Agent Performance Reviews
          </h1>
          <p style={{
            fontSize: 15,
            color: 'var(--text-muted)',
            fontWeight: 300,
            marginBottom: 32,
          }}>
            Monitor, evaluate, and manage your agents.
          </p>
          <StatsRow
            activeCount={activeCount}
            firedCount={firedCount}
            avgScore={avgScore}
            totalReviews={totalReviews}
          />
        </div>
      </div>

      {/* agent browser */}
      <div className="app-page">
        <div className="developer-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SearchFilters
              search={search}
              setSearch={setSearch}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              status={status}
            />
            <AgentList
              filtered={filtered}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
            />
          </div>
          <AgentDetail agent={selectedAgent} />
        </div>
      </div>
      <Footer />
    </div>
  );
}
