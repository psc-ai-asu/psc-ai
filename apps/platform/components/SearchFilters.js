// search input and status filter buttons for the agent browser

export default function SearchFilters({ search, setSearch, filterStatus, setFilterStatus, status }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        placeholder="Search agents or tags…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '10px 14px',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          color: 'var(--text)',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
        onBlur={(e)  => e.target.style.borderColor = 'var(--border)'}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        {status.map((s) => {
          const active = filterStatus === s;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                padding: '4px 12px',
                borderRadius: 6,
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: active ? 'var(--accent-soft)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                transition: 'all 0.15s',
              }}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
