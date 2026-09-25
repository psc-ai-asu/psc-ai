// card for a single agent in the sidebar list

export default function AgentCard({ agent, selected, onClick }) {
  const scoreColor =
    agent.score >= 80 ? 'var(--green)' :
    agent.score >= 60 ? 'var(--amber)' : '#FF4D4D';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 10,
        cursor: 'pointer',
        background: selected ? 'var(--accent-soft)' : 'var(--surface)',
        transition: 'border-color 0.15s, background 0.15s',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text)',
          marginBottom: 3,
        }}>
          {agent.name}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          {agent.framework} · {agent.version}
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 18,
        fontWeight: 700,
        color: scoreColor,
        flexShrink: 0,
      }}>
        {agent.score}
      </div>
    </div>
  );
}
