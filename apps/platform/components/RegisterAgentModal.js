'use client';

//modal for registering a new agent into the agents table in supabase
//collects: name, description, framework, public metrics
//sets developed_by automatically from the current authenticated user session

import { useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { insertAgent } from '@/components/dev-components/data';

const FRAMEWORKS = [
  'LangChain',
  'LangGraph',
  'AutoGen',
  'CrewAI',
  'OpenAI',
  'Semantic Kernel',
  'Custom / Other',
];

export default function RegisterAgentModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [framework, setFramework] = useState('');
  const [publicMetrics, setPublicMetrics] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Agent name is required.'); return; }
    if (!framework) { setError('Please select a framework.'); return; }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('You must be signed in to register an agent.'); setLoading(false); return; }

      //use shared insertAgent helper so all agent inserts go through one place
      const { error: insertError } = await insertAgent({
        developed_by: user.id,
        name: name.trim(),
        description: description.trim() || null,
        framework,
        public_metrics: publicMetrics,
      });

      if (insertError) {
        setError(insertError.message);
      } else {
        setSuccess(true);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        animation: 'overlayFadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          margin: '0 20px',
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '36px 36px 32px',
          boxShadow: '0 0 0 1px rgba(139,92,246,0.08), 0 24px 64px rgba(0,0,0,0.55), 0 0 120px rgba(139,92,246,0.07)',
          animation: 'modalSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* top glow */}
        <div style={{
          position: 'absolute',
          top: -50,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 240,
          height: 100,
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.22), transparent 70%)',
          filter: 'blur(28px)',
          pointerEvents: 'none',
        }} />

        {/* close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: '1px solid transparent',
            borderRadius: 8,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {success ? (
          /* success state */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(34,201,138,0.12)',
              border: '1px solid rgba(34,201,138,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.3px' }}>
              Agent Registered!
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 300, marginBottom: 28 }}>
              <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{name}</strong> has been added to the platform and is now open for reviews.
            </p>
            <button
              onClick={onClose}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text)',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                border: 'none',
                padding: '12px 32px',
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          /* form state */
          <>
            {/* header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--accent-soft)',
                border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: 20,
                padding: '4px 12px',
                marginBottom: 16,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Agent Onboarding</span>
              </div>
              <h2 style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 600, letterSpacing: '-0.4px', color: 'var(--text)', marginBottom: 6 }}>
                Register New Agent
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 300, lineHeight: 1.6 }}>
                Add your agent to the platform so reviewers can evaluate it.
              </p>
            </div>

            {/* error */}
            {error && (
              <div style={{
                background: 'rgba(255,77,77,0.08)',
                border: '1px solid rgba(255,77,77,0.3)',
                color: 'var(--red)',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* agent name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Agent Name <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. ResearchBot v2"
                  maxLength={80}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.08)'; e.target.style.background = 'var(--surface2)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--surface)'; }}
                />
              </div>

              {/* framework */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Framework <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <select
                  value={framework}
                  onChange={e => setFramework(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.08)'; e.target.style.background = 'var(--surface2)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--surface)'; }}
                >
                  <option value="" disabled style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>Select a framework…</option>
                  {FRAMEWORKS.map(f => (
                    <option key={f} value={f} style={{ background: 'var(--surface)', color: 'var(--text)' }}>{f}</option>
                  ))}
                </select>
              </div>

              {/* description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Description <span style={{ color: 'var(--text-dim)' }}>(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Briefly describe what your agent does, its goals, and its capabilities…"
                  maxLength={500}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 80, lineHeight: 1.6 }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.08)'; e.target.style.background = 'var(--surface2)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--surface)'; }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', textAlign: 'right' }}>{description.length}/500</span>
              </div>

              {/* public metrics toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '14px 16px',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>Make metrics public</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 300 }}>
                    Reviewers can see latency, cost, and token usage for this agent
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPublicMetrics(v => !v)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 100,
                    border: 'none',
                    background: publicMetrics ? 'var(--accent)' : 'var(--border)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                    marginLeft: 16,
                  }}
                  aria-label="Toggle public metrics"
                >
                  <span style={{
                    position: 'absolute',
                    top: 3,
                    left: publicMetrics ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'var(--text)',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }} />
                </button>
              </div>

              {/* submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text)',
                  background: loading ? 'var(--surface2)' : 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                  border: 'none',
                  padding: '14px 24px',
                  borderRadius: 10,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.25s',
                  letterSpacing: '0.02em',
                  marginTop: 4,
                  opacity: loading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    Registering…
                  </>
                ) : 'Register Agent'}
              </button>
            </form>
          </>
        )}
      </div>

      <style>{`
        @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const inputStyle = {
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  fontWeight: 400,
  color: 'var(--text)',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '10px 14px',
  outline: 'none',
  transition: 'all 0.2s',
  width: '100%',
  boxSizing: 'border-box',
};
