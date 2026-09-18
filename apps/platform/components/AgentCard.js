// card for a single agent in the sidebar list

export default function AgentCard({ agent, selected, onClick }) {
  const statusColor = agent.status === 'active' ? 'var(--green)' : '#FF4D4D';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 16px',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 10,
        cursor: 'pointer',
        background: selected ? 'var(--accent-soft)' : 'var(--surface)',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      onMouseEnter={(e) => !selected && (e.currentTarget.style.background = 'var(--bg-raised)')}
      onMouseLeave={(e) => !selected && (e.currentTarget.style.background = 'var(--surface)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {agent.name}
          </div>
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 8,
            fontFamily: 'monospace',
            color: statusColor,
            padding: '2px 6px',
            border: `1px solid ${statusColor}`,
            borderRadius: 3,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 700,
          }}>
            {agent.status}
          </span>
        </div>
      </div>
      <div style={{
        fontFamily: 'monospace',
        fontSize: 11,
        color: 'var(--text-muted)',
      }}>
        {agent.framework}
      </div>
    </div>
  );
}