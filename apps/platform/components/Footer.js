import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[var(--bg)] border-t border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-y-2">

        <span className="text-sm text-[var(--text-dim)]">© 2026 Gentle Systems</span>

        <nav className="flex items-center gap-1">
          <Link href="/privacy-policy" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-200 px-2 py-1">Privacy Policy</Link>
          <div className="w-px h-3.5 bg-[var(--border)]" />
          <Link href="/terms-of-service" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-200 px-2 py-1">Terms of Service</Link>
        </nav>

      </div>
    </footer>
  );
}
