import AgentCard from './AgentCard';

//scrollable list of agent cards with empty state

export default function AgentList({ filtered, selectedId, setSelectedId }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {filtered.map((a) => (
        <AgentCard
          key={a.id}
          agent={a}
          selected={selectedId === a.id}
          onClick={() => setSelectedId(a.id)}
        />
      ))}
      {filtered.length === 0 && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--text-dim)',
          textAlign: 'center',
          padding: '30px 0',
          border: '1px dashed var(--border)',
          borderRadius: 10,
        }}>
          No agents match filters
        </div>
      )}
    </div>
  );
}
