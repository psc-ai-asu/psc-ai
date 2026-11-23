"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/app/hooks/useAuth";

const links = [
  { href: "/agents", label: "Agent Directory", id: "agents" },
  { href: "/developer", label: "Developer Dashboard", id: "developer" },
  { href: "https://docs.reviewmyagent.today", label: "Docs", id: "docs" },
];

function displayName(user) {
  return user.user_metadata?.username || user.email?.split("@")[0] || "Account";
}

function ProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const menu = useRef(null);
  const name = displayName(user);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event) => { if (!menu.current?.contains(event.target)) setOpen(false); };
    const closeOnEscape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="app-profile" ref={menu}>
      <button
        type="button"
        className="app-profile-btn"
        aria-expanded={open}
        aria-controls="profile-menu"
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="app-profile-initial" aria-hidden="true">{name[0].toUpperCase()}</span>
        <span className="app-profile-name">{name}</span>
        <span className="app-profile-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div id="profile-menu" className="app-profile-menu">
          <Link href="/review/trace-tokens" className="app-profile-item" onClick={() => setOpen(false)}>
            Trace Tokens
          </Link>
          <button type="button" className="app-profile-item app-profile-logout" onClick={() => { setOpen(false); onLogout(); }}>
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function PlatformHeader({ current }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-header-left">
          <Link href="/" className="app-brand">
            <Image src="/rma-brand-logo.png" alt="" width={32} height={32} className="app-brand-mark" priority />
            <span>ReviewMyAgent</span>
          </Link>
          <nav className="app-nav" aria-label="Platform navigation">
            {links.map(({ href, label, id }) => (
              <Link key={href} href={href} className="app-nav-link" aria-current={current === id ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="app-header-right">
          {!loading && (user ? (
            <ProfileMenu user={user} onLogout={handleLogout} />
          ) : (
            <>
              <Link href="/login?mode=signup" className="app-auth-btn app-auth-signup">Sign Up</Link>
              <Link href="/login" className="app-auth-btn">Sign In</Link>
            </>
          ))}
          <button
            type="button"
            className="app-menu-btn"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="app-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {menuOpen
                ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                : <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></>}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="app-mobile-menu" className="app-mobile-menu" aria-label="Mobile navigation">
          {links.map(({ href, label, id }) => (
            <Link key={href} href={href} aria-current={current === id ? "page" : undefined} onClick={() => setMenuOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
