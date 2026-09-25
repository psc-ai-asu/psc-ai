// displays a row of key performance stats

export default function StatsRow({ activeCount, firedCount, avgScore, totalReviews }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <StatChip label="Active Agents" value={activeCount} sub="total" valueColor="var(--green)" />
      <StatChip label="Agents Fired"  value={firedCount}  sub="total" valueColor="var(--amber)" />
      <StatChip
        label="Avg Score"
        value={avgScore}
        sub="composite"
        valueColor={avgScore >= 80 ? 'var(--green)' : 'var(--amber)'}
      />
      <StatChip label="Total Reviews" value={totalReviews} sub="all time" valueColor="var(--text)" />
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
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: 'var(--text-muted)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-sans)',
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
          fontFamily: 'var(--font-mono)',
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
