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
const FRAMEWORK_OPTIONS = ['LangChain', 'CrewAI', 'AutoGen', 'OpenAI Swarm', 'Custom'];
const FRAMEWORK_COLORS = {
  LangChain: '#1AA260',
  CrewAI: '#7C3AED',
  AutoGen: '#0EA5E9',
  'OpenAI Swarm': '#F59E0B',
  Custom: '#94A3B8',
};

const labelStyle = {
  display: 'block',
  marginBottom: 8,
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '10px 12px',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--text)',
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
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
  const frameworkColor = FRAMEWORK_COLORS[formData.framework || 'Custom'] || '#94A3B8';

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
          maxWidth: 520,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 16px 40px rgba(0,0,0,0.38)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              {isEdit ? 'Edit agent' : 'Add agent'}
            </div>
            <h3 style={{ margin: 0, color: 'var(--text)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em' }}>
              {isEdit ? 'Update agent' : 'Create agent'}
            </h3>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={onChange}
              style={inputStyle}
              required
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={onChange}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div>
            <label style={labelStyle}>Framework</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                name="framework"
                value={formData.framework || 'Custom'}
                onChange={onChange}
                style={{ ...inputStyle, appearance: 'none', paddingRight: 32 }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              >
                {FRAMEWORK_OPTIONS.map((framework) => (
                  <option key={framework} value={framework}>
                    {framework}
                  </option>
                ))}
              </select>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 90,
                padding: '7px 10px',
                borderRadius: 999,
                border: `1px solid ${frameworkColor}66`,
                background: `${frameworkColor}1A`,
                color: frameworkColor,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}>
                {formData.framework || 'Custom'}
              </span>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            <input
              type="checkbox"
              name="public_metrics"
              checked={formData.public_metrics}
              onChange={onChange}
              style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
            />
            Public metrics
          </label>

          {error && (
            <div style={{ color: '#FF6B6B', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{error}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 14px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}>
              {isSubmitting ? 'Saving…' : (isEdit ? 'Save changes' : 'Save agent')}
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <PlatformHeader current="developer" />

      {/* Page Hero Details 
          Contains the title, subtitle, and "Add Agent" button. The button toggles the add agent modal.
          May need to change how fired agents are displayed in the future.
      */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        padding: '48px 0 36px',
      }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: '-0.5px',
                color: 'var(--text)',
                marginBottom: 10,
                lineHeight: 1.2,
              }}>
                Agent performance reviews
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
                borderRadius: 10,
                padding: '10px 16px',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 10px 24px rgba(139, 92, 246, 0.25)',
              }}
            >
              {showAddForm ? 'Close' : 'Add agent'}
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
          gridTemplateColumns: '320px minmax(0, 1fr)',
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
