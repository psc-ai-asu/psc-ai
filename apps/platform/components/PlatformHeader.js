import Link from "next/link";

const links = [
  { href: "/", label: "Home", id: "home" },
  { href: "/builders", label: "Agent Builders", id: "builders" },
  { href: "/developer", label: "Developer Dashboard", id: "developer" },
];

export default function PlatformHeader({ current }) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href="/" className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">R</span>
          <span>ReviewMyAgent</span>
        </Link>
        <nav className="app-nav" aria-label="Platform navigation">
          {links.map(({ href, label, id }) => (
            <Link
              key={href}
              href={href}
              className="app-nav-link"
              aria-current={current === id ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
