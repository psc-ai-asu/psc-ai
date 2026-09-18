// detailed view of a selected agent

'use client';

export default function AgentDetail({ agent }) {
  if (!agent) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 320,
        background: 'var(--surface)',
        border: '1px dashed var(--border)',
        borderRadius: 16,
        fontFamily: 'monospace',
        fontSize: 12,
        color: 'var(--text-dim)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        Select an agent to inspect
      </div>
    );
  }

  const statusColor = agent.status === 'active' ? 'var(--green)' : '#FF4D4D';
  const formattedDate = agent.created_at
    ? new Date(agent.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Unknown';

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '28px',
    }}>
      {/* header section */}
      <div style={{
        marginBottom: 28,
        paddingBottom: 20,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: 'monospace',
          fontSize: 10,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          Agent Details
        </div>
        <h2 style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--text)',
          letterSpacing: '-0.5px',
          margin: '0 0 14px 0',
        }}>
          {agent.name}
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10,
            fontFamily: 'monospace',
            color: statusColor,
            padding: '4px 10px',
            border: `1px solid ${statusColor}`,
            borderRadius: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 700,
          }}>
            {agent.status}
          </span>
          <span style={{
            fontSize: 10,
            fontFamily: 'monospace',
            color: 'var(--accent)',
            padding: '4px 10px',
            border: '1px solid rgba(139,92,246,0.4)',
            borderRadius: 4,
            background: 'var(--accent-soft)',
          }}>
            {agent.framework}
          </span>
          <span style={{
            fontSize: 10,
            fontFamily: 'monospace',
            color: 'var(--text-muted)',
            padding: '4px 10px',
            border: '1px solid var(--border)',
            borderRadius: 4,
          }}>
            {formattedDate}
          </span>
        </div>
      </div>

      {/* description section */}
      {agent.description && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 10,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            Description
          </div>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--text)',
            margin: 0,
            padding: '12px 14px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}>
            {agent.description}
          </p>
        </div>
      )}

      {/* metadata section */}
      <div>
        <div style={{
          fontFamily: 'monospace',
          fontSize: 10,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          Metadata
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <InfoCard label="Agent ID" value={agent.id} />
          <InfoCard label="Framework" value={agent.framework} />
          <InfoCard label="Status" value={agent.status} />
          <InfoCard label="Public Metrics" value={agent.public_metrics ? 'Enabled' : 'Disabled'} />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 12px',
    }}>
      <div style={{
        fontFamily: 'monospace',
        fontSize: 8,
        color: 'var(--text-muted)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
    </div>
  );
}
