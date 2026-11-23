'use client';

import { useEffect, useRef, useState } from 'react';
import { createTraceTokenAction, listTraceTokensAction, revokeTraceTokenAction } from './actions';
import styles from './tokens.module.css';

function timestamp(value) {
  return value ? new Date(value).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' }) : 'Never';
}

function SecretDialog({ secret, onClose }) {
  const dialog = useRef(null);
  const [copyStatus, setCopyStatus] = useState('');
  useEffect(() => { if (!dialog.current.open) dialog.current.showModal(); }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="token-secret-title" onCancel={onClose} onClose={onClose}>
    <div className={styles.dialogBody}>
      <h2 id="token-secret-title">Copy your token</h2>
      <p>Save this somewhere safe. You won’t be able to see it again after closing this window.</p>
      <input className={styles.secret} aria-label="New personal trace token" value={secret} readOnly onFocus={(event) => event.target.select()} />
      {copyStatus === 'failed' && <p className={styles.error}>Copy failed. Select the token and copy it manually.</p>}
      <p role="status" className="sr-only">{copyStatus === 'copied' ? 'Token copied.' : ''}</p>
      <div className={styles.buttons}>
        <button type="button" onClick={copy}>{copyStatus === 'copied' ? 'Copied ✓' : 'Copy token'}</button>
        <button type="button" className={styles.secondary} onClick={onClose}>Done</button>
      </div>
    </div>
  </dialog>;
}

export default function TraceTokens() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [secret, setSecret] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await listTraceTokensAction();
        if (cancelled) return;
        if (result.error) setError(result.error);
        else setTokens(result.data);
      } catch {
        if (!cancelled) setError('Could not load trace tokens. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function run(key, operation) {
    setBusy(key); setError(''); setNotice('');
    try { await operation(); }
    catch { setError('The request failed. Check your connection and try again.'); }
    finally { setBusy(''); }
  }
  async function create(event) {
    event.preventDefault();
    await run('create', async () => {
      const result = await createTraceTokenAction(name);
      if (result.error) { setError(result.error); return; }
      setTokens((items) => [result.data.token, ...items]);
      setSecret(result.data.secret); setName('');
    });
  }
  async function revoke(id) {
    await run(id, async () => {
      const result = await revokeTraceTokenAction(id);
      if (result.error) { setError(result.error); return; }
      setTokens((items) => items.map((item) => item.id === id ? result.data : item));
      setNotice('Token revoked.');
    });
  }
  async function refresh() {
    await run('refresh', async () => {
      const result = await listTraceTokensAction();
      if (result.error) { setError(result.error); return; }
      setTokens(result.data); setNotice('Your tokens are up to date.');
    });
  }

  if (loading) return <p role="status">Loading your tokens…</p>;

  return <>
    <div role="alert" className={styles.error}>{error}</div>
    <p role="status" aria-live="polite">{busy ? 'Working…' : notice}</p>
    <div className={styles.grid}>
      <section className={styles.panel} aria-labelledby="your-tokens-title">
        <h2 id="your-tokens-title">Your tokens</h2>
        <p>Add a token to your agent&apos;s <code>x-rma-trace-token</code> header. One token works for every agent, and you can revoke it at any time.</p>
        <form onSubmit={create} className={styles.form}>
          <label htmlFor="trace-token-name">Token name</label>
          <input id="trace-token-name" value={name} maxLength={80} required placeholder="e.g. My laptop" onChange={(event) => setName(event.target.value)} />
          <button disabled={Boolean(busy) || !name.trim()}>{busy === 'create' ? 'Creating…' : 'Create token'}</button>
        </form>
        <button type="button" className={styles.secondary} onClick={refresh} disabled={Boolean(busy)}>Refresh tokens</button>
        {tokens.length === 0 ? <p>{error ? 'Token list unavailable. Try refreshing.' : 'No tokens yet.'}</p> : <ul className={styles.tokens}>{tokens.map((token) => <li key={token.id}>
          <div className={styles.tokenHeading}><strong>{token.name}</strong><span className={token.revoked_at ? styles.revoked : styles.active}>{token.revoked_at ? 'Revoked' : 'Active'}</span></div>
          <code>{token.token_prefix}…</code>
          <dl><dt>Created</dt><dd>{timestamp(token.created_at)}</dd><dt>Last used</dt><dd>{timestamp(token.last_used_at)}</dd>{token.revoked_at && <><dt>Revoked</dt><dd>{timestamp(token.revoked_at)}</dd></>}</dl>
          {!token.revoked_at && <button type="button" className={styles.secondary} disabled={Boolean(busy)} onClick={() => revoke(token.id)}>{busy === token.id ? 'Revoking…' : `Revoke ${token.name}`}</button>}
        </li>)}</ul>}
      </section>
    </div>
    {secret && <SecretDialog secret={secret} onClose={() => setSecret(null)} />}
  </>;
}
