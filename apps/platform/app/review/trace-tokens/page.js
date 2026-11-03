import Link from 'next/link';
import { redirect } from 'next/navigation';
import PlatformHeader from '../../../components/PlatformHeader';
import { createClient } from '../../../lib/supabase/server';
import TraceTokens from './TraceTokens';
import styles from './tokens.module.css';

export const metadata = { title: 'Trace tokens | ReviewMyAgent' };

export default async function TraceTokensPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/login?next=%2Freview%2Ftrace-tokens');

  return <div className="app-shell">
    <PlatformHeader />
    <main className={styles.main}>
      <Link href="/agents" className={styles.back}>← Agent Directory</Link>
      <h1>Trace tokens</h1>
      <p className={styles.agentName}>Trace tokens link your agent runs to your account, so you can attach them to a review and mark it Trace-backed.</p>
      <TraceTokens />
    </main>
  </div>;
}
