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
      <p className={styles.agentName}>Manage your tokens and the runs you’ll use in reviews. Your tokens work across agents.</p>
      <section className={styles.panel} aria-labelledby="saved-runs-title">
        <h2 id="saved-runs-title">Saved runs &amp; metrics</h2>
        <p>No saved runs yet. Run capture and metrics are coming soon. Once available, runs captured with your personal token will appear here for you to choose when writing a review.</p>
        <Link href="/agents" className={styles.back}>Choose an agent to review →</Link>
      </section>
      <h2 className={styles.sectionTitle}>Personal trace tokens</h2>
      <TraceTokens />
    </main>
  </div>;
}
