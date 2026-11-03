import Link from 'next/link';
import { redirect } from 'next/navigation';
import PlatformHeader from '../../../components/PlatformHeader';
import { createClient } from '../../../lib/supabase/server';
import TraceTokens from './TraceTokens';
import styles from './tokens.module.css';

export const metadata = { title: 'Personal traces | ReviewMyAgent' };

export default async function TraceTokensPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/login?next=%2Freview%2Ftrace-tokens');

  return <div className="app-shell">
    <PlatformHeader current="agents" />
    <main className={styles.main}>
      <Link href="/agents" className={styles.back}>← Back to reviews</Link>
      <h1>Personal traces</h1>
      <p className={styles.agentName}>Manage the tokens that tie your agent runs to your account. Your tokens work across agents.</p>
      <p className={styles.agentName}>Sessions you send with a token appear when you review that agent, where you can attach one to make the review Trace-backed.</p>
      <Link href="/agents" className={styles.back}>Choose an agent to review →</Link>
      <h2 className={styles.sectionTitle}>Personal trace tokens</h2>
      <TraceTokens />
    </main>
  </div>;
}
