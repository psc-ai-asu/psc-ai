// The main page for developer dashboard
'use client';

import NavigationBar from '../../components/NavigationBar';
import PlatformHeader from '../../components/PlatformHeader';
import Footer from '../../components/Footer';
import StatsRow from '../../components/StatsRow';
import SearchFilters from '../../components/SearchFilters';
import AgentList from '../../components/AgentList';
import AgentDetail from '../../components/AgentDetail';
import { useAgents } from './useAgents';

const STATUS_FILTERS = ['all', 'active', 'fired'];

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

// Styles for the modal overlay and form
function AgentFormModal({
  mode,
  formData,
  onChange,
  onSubmit,
  onClose,
  isSubmitting,
  error,
}) {
  const isEdit = mode === 'edit';

  return (
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
        onSubmit={onSubmit}
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
          <h3 style={{ margin: 0, color: 'var(--text)', fontFamily: 'monospace' }}>
            {isEdit ? 'Edit Agent' : 'Add Agent'}
          </h3>
          <button
            type="button"
            onClick={onClose}
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
            <input name="name" value={formData.name} onChange={onChange} style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={onChange}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={labelStyle}>Framework</label>
            <input name="framework" value={formData.framework} onChange={onChange} style={inputStyle} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)', fontFamily: 'monospace', fontSize: 12 }}>
            <input
              type="checkbox"
              name="public_metrics"
              checked={formData.public_metrics}
              onChange={onChange}
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
              {isSubmitting ? 'Saving…' : (isEdit ? 'Save Changes' : 'Save Agent')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function DeveloperPage() {
  const {
    agents,
    filtered,
    selectedAgent,
    user,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    selectedId,
    setSelectedId,
    showAddForm,
    showEditForm,
    formData,
    isSubmitting,
    isDeleting,
    error,
    openAddForm,
    resetFormState,
    handleInputChange,
    handleAddAgent,
    handleUpdateAgent,
    handleDeleteAgent,
    handleEditAgent,
  } = useAgents();

  // Ensures the user is authenticated
  // Change this to a proper redirect to the sign-in page.
  
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
      <PlatformHeader current="developer" />

      {/* Page Hero Details 
          Contains the title, subtitle, and "Add Agent" button. The button toggles the add agent modal.
          May need to change how fired agents are displayed in the future.
      */}
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
              onClick={openAddForm}
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
      {/* Handle Add/Edit Agents */}
      {(showAddForm || showEditForm) && (
        <AgentFormModal
          mode={showEditForm ? 'edit' : 'add'}
          formData={formData}
          onChange={handleInputChange}
          onSubmit={showEditForm ? handleUpdateAgent : handleAddAgent}
          onClose={resetFormState}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}

      {/* Details for Agent Browser Column */}
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
              status={STATUS_FILTERS}
            />
            <AgentList
              filtered={filtered}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
            />
          </div>
          <AgentDetail
            agent={selectedAgent}
            onEdit={handleEditAgent}
            onDelete={handleDeleteAgent}
            isDeleting={isDeleting}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
