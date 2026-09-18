// displays a row of key stats

export default function StatsRow({ activeCount, firedCount }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <StatChip label="Active Agents" value={activeCount} sub="running" valueColor="var(--green)" />
      <StatChip label="Total Agents"  value={activeCount + firedCount}  sub="all time" valueColor="var(--text)" />
    </div>
  );
}

function StatChip({ label, value, sub, valueColor }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '14px 20px',
      minWidth: 130,
      flex: 1,
      transition: 'border-color 0.2s',
    }}>
      <div style={{
        fontFamily: 'monospace',
        fontSize: 9,
        color: 'var(--text-muted)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 26,
        fontWeight: 700,
        color: valueColor,
        letterSpacing: '-0.5px',
        lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontFamily: 'monospace',
          fontSize: 10,
          color: 'var(--text-dim)',
          marginTop: 6,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}