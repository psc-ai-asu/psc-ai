//navigation bar for dashboard pages

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import styles from './NavigationBar.module.css';

export default function NavigationBar() {
  const pathname = usePathname();
  const label =
    pathname === '/developer' ? 'Developer Dashboard' :
    pathname === '/consumer'  ? 'Consumer Dashboard'  : '';

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(13,13,13,0.85)',
      borderBottom: '1px solid var(--border)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    }}>
      <div className="container">
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo}>
            <Image src="/rma-logo.png" alt="" width={28} height={28} className={styles.logoMark} />
            ReviewMyAgent
          </Link>
          <div className={styles.statusContainer}>
            <div className={styles.statusDot} />
            <span className={styles.statusText}>{label}</span>
          </div>
          <Link href="/" className={styles.backLink}>← Back to home</Link>
        </div>
      </div>
    </nav>
  );
}
