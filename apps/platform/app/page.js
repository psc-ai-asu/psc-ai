'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import useScrollFade from './hooks/useScrollFade';

import Footer from '@/components/Footer';

export default function PlatformPage() {
  //auth variable for page
  const [user, setUser] = useState(null);

  //check if user login when page start
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  //function for log out
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  //scroll fade effect for card
  const pageRef = useScrollFade({ threshold: 0.1 });

  //framework we use
  const frameworks = [
    { name: "LangChain", color: "#1AA260" },
    { name: "CrewAI", color: "#7C3AED" },
    { name: "AutoGen", color: "#0EA5E9" },
    { name: "OpenAI Swarm", color: "#F59E0B" },
  ];

  //main feature of platform
  const features = [
    {
      title: "Review & Rate Agents",
      desc: "Submit structured reviews on any AI agent. Rate task completion, accuracy, speed, and overall satisfaction.",
    },
    {
      title: "Execution Traces",
      desc: "Attach full execution traces to reviews. See every LLM call, tool use, and decision point under the hood.",
    },
    {
      title: "Observability Dashboard",
      desc: "Track token usage, cost-per-run, latency, and tool-call success rates. All the data developers need.",
    },
    {
      title: "Framework Support",
      desc: "Works with LangChain, CrewAI, AutoGen, OpenAI Swarm, and more. Compare agents across your stack.",
    },
    {
      title: "Community Reviews",
      desc: "Browse reviews from real users before integrating an agent. Build trust through transparent track records.",
    },
  ];

  //how platform working
  const steps = [
    { num: 1, title: "Connect Your Agent" },
    { num: 2, title: "Collect Feedback & Data" },
    { num: 3, title: "Improve & Iterate" },
  ];

  return (
    <div ref={pageRef} className="page-wrapper">
      {/*floating background orbs for depth */}
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />

      {/*flowing geometric background lines */}
      <svg className="bg-lines" viewBox="0 0 1440 4000" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/*main flowing curves */}
        <path d="M-50 0 C200 200, 400 100, 500 400 S700 800, 600 1100 S300 1400, 500 1700 S800 2000, 700 2300 S400 2600, 600 2900 S900 3200, 700 3500 S500 3800, 600 4000"
          stroke="url(#lineGrad1)" strokeWidth="1.5" />
        <path d="M1490 100 C1200 300, 1000 200, 900 500 S700 900, 800 1200 S1100 1500, 900 1800 S600 2100, 800 2400 S1100 2700, 900 3000 S700 3300, 800 3600 S1000 3900, 900 4000"
          stroke="url(#lineGrad2)" strokeWidth="1.5" />
        {/*dashed connecting path down the center */}
        <path d="M720 0 C720 300, 400 400, 500 700 S800 1000, 720 1300 S500 1600, 720 1900 S900 2200, 720 2500 S500 2800, 720 3100 S900 3400, 720 3700"
          stroke="url(#lineGrad3)" strokeWidth="1" strokeDasharray="8 12" />
        {/*node circles along the curves */}
        <circle cx="500" cy="400" r="4" fill="var(--accent)" opacity="0.55" />
        <circle cx="600" cy="1100" r="4" fill="var(--accent)" opacity="0.5" />
        <circle cx="500" cy="1700" r="3.5" fill="var(--accent)" opacity="0.55" />
        <circle cx="700" cy="2300" r="4" fill="var(--accent)" opacity="0.5" />
        <circle cx="600" cy="2900" r="3.5" fill="var(--accent)" opacity="0.55" />
        <circle cx="900" cy="500" r="4" fill="var(--accent)" opacity="0.5" />
        <circle cx="800" cy="1200" r="3.5" fill="var(--accent)" opacity="0.55" />
        <circle cx="900" cy="1800" r="4" fill="var(--accent)" opacity="0.5" />
        <circle cx="800" cy="2400" r="3.5" fill="var(--accent)" opacity="0.55" />
        <circle cx="720" cy="700" r="3" fill="var(--accent)" opacity="0.4" />
        <circle cx="720" cy="1300" r="3" fill="var(--accent)" opacity="0.4" />
        <circle cx="720" cy="1900" r="3" fill="var(--accent)" opacity="0.4" />
        <circle cx="720" cy="2500" r="3" fill="var(--accent)" opacity="0.4" />
        {/*connector lines between the two main curves */}
        <line x1="500" y1="400" x2="900" y2="500" stroke="var(--accent)" strokeWidth="0.8" opacity="0.2" />
        <line x1="600" y1="1100" x2="800" y2="1200" stroke="var(--accent)" strokeWidth="0.8" opacity="0.2" />
        <line x1="500" y1="1700" x2="900" y2="1800" stroke="var(--accent)" strokeWidth="0.8" opacity="0.2" />
        <line x1="700" y1="2300" x2="800" y2="2400" stroke="var(--accent)" strokeWidth="0.8" opacity="0.2" />
        {/*diamond shapes along paths */}
        <rect x="494" y="394" width="12" height="12" rx="2" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.35" transform="rotate(45 500 400)" />
        <rect x="794" y="1194" width="12" height="12" rx="2" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.35" transform="rotate(45 800 1200)" />
        <rect x="694" y="2294" width="12" height="12" rx="2" stroke="var(--accent)" strokeWidth="1" fill="none" opacity="0.35" transform="rotate(45 700 2300)" />
        {/*gradient defs */}
        <defs>
          <linearGradient id="lineGrad1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="30%" stopColor="var(--accent)" stopOpacity="0.45" />
            <stop offset="60%" stopColor="var(--accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="lineGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="40%" stopColor="var(--accent)" stopOpacity="0.4" />
            <stop offset="70%" stopColor="var(--accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="lineGrad3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
            <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>

      {/*topbar */}
      <header className="topbar">
        <div className="topbar-box">
          <div className="topbar-left">
            <Link href="/" className="topbar-logo">
              <Image src="/rma-logo.png" alt="" width={28} height={28} className="logo-mark" priority />
              ReviewMyAgent
            </Link>
            <nav className="topbar-nav">
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
            </nav>
          </div>
          <div className="topbar-right">
            {user ? (
              <button className="topbar-logout-btn" onClick={handleLogout}>Log Out</button>
            ) : (
              <>
                <Link href="/login?mode=signup" className="topbar-signup-btn">Sign Up</Link>
                <Link href="/login" className="topbar-signup-btn">Sign In</Link>
              </>
            )}
            <Link href="/agents" className="topbar-btn">Agent Directory</Link>
            <Link href="/developer" className="topbar-btn">Developer Dashboard</Link>
          </div>
        </div>
      </header>

      {/*hero with decorative grid pattern */}
      <section className="hero">
        <div className="hero-grid-pattern" />
        <div className="container">
          <div className="hero-badge mono fade-element">
            <span className="badge-dot" />
            AI Agent Evaluation Platform
          </div>
          <h1>
            Understand how your<br />
            <span className="highlight">AI agents</span> actually perform
          </h1>
          <p className="hero-sub">
            The only platform that connects real user satisfaction scores to
            execution traces, token costs, and tool-call logs. Stop guessing, start measuring.
          </p>
          <div className="hero-actions">
            <a href="#features" className="btn-primary">
              Explore Platform
            </a>
            <a href="#how-it-works" className="btn-secondary">How It Works</a>
          </div>
        </div>
      </section>

      {/*gradient accent line */}
      <div className="gradient-line" />

      {/*supported frameworks */}
      <div className="frameworks-strip" id="frameworks">
        <div className="container">
          <div className="strip-label mono">Works with your stack</div>
          <div className="fw-row">
            {frameworks.map(({ name, color }) => (
              <div className="fw-chip" key={name}>
                <div className="fw-dot" style={{ background: color }} />{name}
              </div>
            ))}
            <div className="fw-chip" style={{ opacity: 0.4 }}>
              <div className="fw-dot" style={{ background: 'var(--text-dim)' }} />
              + more soon
            </div>
          </div>
        </div>
      </div>

      <div className="gradient-line" />

      {/*platform features */}
      <section className="section features-section" id="features">
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '560px', margin: '0 auto 0' }}>
            <div className="section-label mono">Platform Features</div>
            <div className="section-heading">
              Everything you need to evaluate,<br />monitor, and improve AI agents
            </div>
            <p className="section-desc" style={{ margin: '0 auto' }}>
              From structured user reviews to deep execution traces,
              ReviewMyAgent bridges human experience and machine performance.
            </p>
          </div>

          <div className="features-grid">
            {features.map((f, i) => (
              <div className={`feature-card fade-element fade-delay-${i + 1}`} key={f.title}>
                <div className="feature-card-glow" />
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gradient-line" />

      {/*how it works */}
      <section className="section" id="how-it-works">
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
            <div className="section-label mono">How It Works</div>
            <div className="section-heading">Three steps to better agents</div>
          </div>

          {/*steps with connecting line */}
          <div className="steps-wrapper">
            <div className="steps-connector" />
            <div className="steps-row">
              {steps.map((s, i) => (
                <div className={`step-card fade-element fade-delay-${i + 1}`} key={s.num}>
                  <div className="step-num mono">{s.num}</div>
                  <h3>{s.title}</h3>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="gradient-line" />

      {/*who is this for - users vs developers */}
      <section className="section audience-section" id="who-its-for">
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '560px', margin: '0 auto 56px' }}>
            <div className="section-label mono">Who It’s For</div>
            <div className="section-heading">Built for both sides<br />of the AI equation</div>
            <p className="section-desc" style={{ margin: '0 auto' }}>
              Whether you’re evaluating agents as an end user or building and shipping them as a developer,
              ReviewMyAgent has a dedicated workspace for you.
            </p>
          </div>

          <div className="audience-grid">
            {/*users card */}
            <div className="audience-card fade-element fade-delay-1">
              <div className="audience-card-glow audience-glow-user" />
              <div className="audience-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </div>
              <div className="audience-tag mono">For Users</div>
              <h3>Review agents you’ve used</h3>
              <p>Share structured feedback on any AI agent you’ve interacted with. Rate accuracy, helpfulness, and task completion. Your experience helps developers build better tools.</p>
              <ul className="audience-list">
                <li>Submit ratings and written reviews</li>
                <li>See how others rate the same agents</li>
                <li>Track your review history</li>
              </ul>
              <Link href="/agents" className="audience-btn audience-btn-user">Browse Agent Directory</Link>
            </div>

            {/*developers card */}
            <div className="audience-card fade-element fade-delay-2">
              <div className="audience-card-glow audience-glow-dev" />
              <div className="audience-icon audience-icon-dev">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <div className="audience-tag audience-tag-dev mono">For Developers</div>
              <h3>Monitor your agents in production</h3>
              <p>Get a complete view of how your agents are performing, from user satisfaction scores to token costs, latency, tool call success rates, and full execution traces.</p>
              <ul className="audience-list">
                <li>View satisfaction scores alongside traces</li>
                <li>Track cost, latency, and error rates</li>
                <li>Compare agent versions over time</li>
              </ul>
              <Link href="/developer" className="audience-btn audience-btn-dev">Go to Developer Dashboard</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
