// detailed view of a selected agent with metrics

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
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--text-dim)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        Select an agent to inspect
      </div>
    );
  }

  const scoreColor =
    agent.score >= 80 ? 'var(--green)' :
    agent.score >= 60 ? 'var(--amber)' : '#FF4D4D';

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '28px 28px',
    }}>
      {/* header row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--text-muted)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            Agent Inspector · {agent.id}
          </div>
          <h2 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-0.4px',
            margin: 0,
            marginBottom: 10,
          }}>
            {agent.name}
          </h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <StatusPill status={agent.status} />
            <FrameworkTag framework={agent.framework} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              padding: '2px 8px',
              border: '1px solid var(--border)',
              borderRadius: 4,
            }}>
              {agent.version}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            Composite Score
          </div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 40,
            fontWeight: 700,
            color: scoreColor,
            letterSpacing: '-1px',
            lineHeight: 1,
          }}>
            {agent.score}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-muted)',
            marginTop: 4,
          }}>
            {agent.reviews} reviews
          </div>
        </div>
      </div>

      {/* runtime metrics */}
      <div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 14,
        }}>
          Runtime Metrics
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <MetricBar label="Goal Completion"  value={agent.metrics.goalCompletion}  max={100}   unit="%" />
          <MetricBar label="Path Efficiency"  value={agent.metrics.pathEfficiency}   max={100}   unit="%" />
          <MetricBar label="Latency"          value={agent.metrics.latencyMs}        max={10000} unit=" ms" invert />
          <MetricBar label="Cost / Run"       value={Math.round(agent.metrics.costPerRun * 100)} max={100} unit="¢" invert />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const color = status === 'active' ? 'var(--green)' : '#FF4D4D';
  return (
    <span style={{
      fontSize: 10,
      fontFamily: 'var(--font-mono)',
      color,
      padding: '2px 8px',
      border: `1px solid ${color}`,
      borderRadius: 4,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    }}>
      {status}
    </span>
  );
}

function FrameworkTag({ framework }) {
  return (
    <span style={{
      fontSize: 10,
      fontFamily: 'var(--font-mono)',
      color: 'var(--accent)',
      padding: '2px 8px',
      border: '1px solid rgba(139,92,246,0.4)',
      borderRadius: 4,
      background: 'var(--accent-soft)',
    }}>
      {framework}
    </span>
  );
}

function MetricBar({ label, value, max = 100, unit = '%', invert = false }) {
  const pct = Math.min((value / max) * 100, 100);
  let color;
  if (invert) {
    color = pct <= 20 ? 'var(--green)' : pct <= 50 ? 'var(--amber)' : '#FF4D4D';
  } else {
    color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : '#FF4D4D';
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>
          {value}{unit}
        </span>
      </div>
      <div style={{ background: 'var(--border)', borderRadius: 4, height: 5 }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 4,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}
