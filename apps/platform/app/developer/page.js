// The main page for developer dashboard

'use client';

import { useEffect, useState } from 'react';
import NavigationBar from '../../components/NavigationBar';
import StatsRow from '../../components/StatsRow';
import SearchFilters from '../../components/SearchFilters';
import AgentList from '../../components/AgentList';
import AgentDetail from '../../components/AgentDetail';
import { addAgentAction, getAgentsAction } from '../actions';
import { createClient } from '../lib/supabaseClient';

const EMPTY_FORM = {
  name: '',
  description: '',
  framework: 'Custom',
  public_metrics: false,
};

//placeholder filters
const status = ['all', 'active', 'fired'];

export default function DeveloperPage() {
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadUserAndAgents() {
      const supabase = createClient();
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        setUser(null);
        setAgents([]);
        setSelectedId(null);
        return;
      }

      setUser(currentUser);

      try {
        const data = await getAgentsAction();
        setAgents(Array.isArray(data) ? data : []);
        setSelectedId((current) => current ?? data?.[0]?.id ?? null);
      } catch (err) {
        console.error('Unable to load agents from Supabase:', err);
        setAgents([]);
        setSelectedId(null);
      }
    }

    loadUserAndAgents();
  }, []);

  //filter agents by search and status
  const filtered = agents.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || filterStatus === 'all'
      ? true
      : a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });
  const selectedAgent = agents.find((a) => a.id === selectedId) ?? null;

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddAgent = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const newAgent = await addAgentAction(formData);

      setAgents((current) => [newAgent, ...current]);
      setSelectedId(newAgent.id);
      setFormData(EMPTY_FORM);
      setShowAddForm(false);
    } catch (err) {
      setError(err.message || 'Could not add agent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <NavigationBar />
        <div className="container" style={{ padding: '48px 40px', color: 'var(--text)' }}>
          <h2 style={{ marginBottom: 12 }}>Sign in to view your agents</h2>
          <p style={{ color: 'var(--text-muted)' }}>Your agents are scoped to the authenticated Supabase user.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <NavigationBar />

      {/* page hero */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-raised)',
        padding: '48px 0 36px',
      }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
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
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Developer View</span>
              </div>
              <h1 style={{
                fontFamily: "'Inter', sans-serif",
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
                marginBottom: 0,
              }}>
                Monitor, evaluate, and manage your agents.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm((current) => !current)}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 16px',
                fontFamily: 'monospace',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {showAddForm ? 'Close' : 'Add Agent'}
            </button>
          </div>
          <div style={{ marginTop: 32 }}>
            <StatsRow
              activeCount={agents.filter((agent) => agent.status === 'active').length}
              firedCount={agents.filter((agent) => agent.status === 'fired').length}
            />
          </div>
        </div>
      </div>

      {showAddForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: 20,
        }}>
          <form
            onSubmit={handleAddAgent}
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: 'var(--text)', fontFamily: 'monospace' }}>Add Agent</h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input name="name" value={formData.name} onChange={handleInputChange} style={inputStyle} required />
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={labelStyle}>Framework</label>
                <input name="framework" value={formData.framework} onChange={handleInputChange} style={inputStyle} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)', fontFamily: 'monospace', fontSize: 12 }}>
                <input
                  type="checkbox"
                  name="public_metrics"
                  checked={formData.public_metrics}
                  onChange={handleInputChange}
                  style={{ accentColor: 'var(--accent)' }}
                />
                Public metrics
              </label>

              {error && (
                <div style={{ color: '#FF4D4D', fontFamily: 'monospace', fontSize: 12 }}>{error}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={isSubmitting} style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                }}>
                  {isSubmitting ? 'Saving…' : 'Save Agent'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* agent browser */}
      <div className="container" style={{ padding: '32px 40px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: 20,
          alignItems: 'start',
        }}>
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
    </div>
  );
}

const labelStyle = {
  display: 'block',
  marginBottom: 6,
  color: 'var(--text-muted)',
  fontFamily: 'monospace',
  fontSize: 11,
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '8px 10px',
  fontFamily: 'monospace',
  fontSize: 12,
  color: 'var(--text)',
  outline: 'none',
};