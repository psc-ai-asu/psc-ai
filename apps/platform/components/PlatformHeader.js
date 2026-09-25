import Link from "next/link";
import Image from "next/image";
import BackButton from "./BackButton";

const links = [
  { href: "/", label: "Home", id: "home" },
  { href: "/agents", label: "Agent Directory", id: "agents" },
  { href: "/developer", label: "Developer Dashboard", id: "developer" },
];

export default function PlatformHeader({ current }) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href="/" className="app-brand">
          <Image src="/rma-logo.png" alt="" width={30} height={30} className="app-brand-mark" />
          <span>ReviewMyAgent</span>
        </Link>
        <nav className="app-nav" aria-label="Platform navigation">
          <BackButton />
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
