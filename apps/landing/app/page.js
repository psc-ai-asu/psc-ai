'use client';

import { useState, useRef } from 'react';
import { submitEmailAction } from './actions';

// Custom Components from '/components'
import { SignUpForm, SuccessMessage, ErrorMessage, DuplicateEmailMessage } from '@/components/Forms';
import ArrowIcon from '@/components/ArrowIcon';
import NavigationBar from '@/components/NavigationBar';
import Footer from '@/components/Footer';
import FeaturesCard from '@/components/FeaturesCard';
import FeedbackForm from "@/components/FeedbackForm";

export default function LandingPage() {
  // Track selected role for email signup form (`user` | `developer` | `both`)
  const [selectedRole, setSelectedRole] = useState('user');

  // Role options displayed in the "Stay in the loop" signup section
  const roleOptions = [
    { label: 'Agent User', value: 'user' },
    { label: 'Agent Builder', value: 'developer' },
    { label: 'Both', value: 'both' },
  ];

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');

  const captchaRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState(null);

  // Status state, indicating the status of e-mail submission
  const [status, setStatus] = useState(null) // null | 'success' | 'error' | 'duplicate'

  const consumerFeatures = [
    "Rate whether the agent completed your task, and how well it did",
    "Score your satisfaction with accuracy, speed, and overall behavior",
    "Leave free-form feedback describing your experience in your own words",
    "Attach the agent's execution trace to give developers full context",
    "Browse reviews from others before integrating an agent into your workflow"
  ];

  const developerFeatures = [
    "Track LLM calls, token usage, and cost-per-run across your agent",
    "Monitor tool call success rates and pinpoint where agents break down",
    "View full execution traces tied to specific user-submitted reviews",
    "Framework-specific views: filter by LangChain, CrewAI, AutoGen, and more",
    "Connect quantitative performance data directly to human satisfaction scores"
  ]

  const frameworks = [
    { name: "LangChain", color: "#1AA260" },
    { name: "CrewAI", color: "#7C3AED" },
    { name: "AutoGen", color: "#0EA5E9" },
    { name: "OpenAI Swarm", color: "#F59E0B" }
  ]

  // This function handles submitting the e-mail entered into the input form to the database.
  // Checks if email is present, valid, then sends to supabase
  const handleSignupSubmit = async (e) => {
    // Prevent the browser from refreshing upon form submission
    e.preventDefault();

    if (!signupEmail) {
      setStatus('error');
      return;
    }
    if (!captchaToken) {
      return;
    }
    try {
      const response = await submitEmailAction(signupEmail, selectedRole, captchaToken);

      if (response?.error === "Duplicate email already in database") {
        setStatus('duplicate');
      } else if (response?.error === "Failed to save email") {
        setStatus('error');
      } else {
        setStatus('success')
      }
    } catch (error) {
      setStatus('error');
    } finally {
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    }
  };

  return (
    <>
      <NavigationBar />

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-eyebrow"> <span className="eyebrow-dot" />In development — follow along </div>
          <h1>Performance reviews<br />for your <em>AI workforce</em></h1>
          <p className="hero-sub">Combining real human feedback with hard quantitative data, ReviewMyAgent gives you a complete picture of how your agent actually performs.</p>
          <div className="hero-actions">
            <a href="#connect" className="btn-primary">Get updates<ArrowIcon /></a>
            <a href="#features" className="btn-secondary">Learn more</a>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Consumer vs. Developer Features */}
      <section className="section" id="features">
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '620px', margin: '0 auto' }}>
            <div className="section-eyebrow">Two perspectives, one platform</div>
            <div className="section-title">
              Built for the people who use agents, and the people who build them
            </div>
          </div>
          <div className="audience-split">
            <FeaturesCard
              type="consumer"
              tag="For Users & Businesses"
              title={<>Your experience<br />shapes the future</>}
              description="You use AI agents every day. Your feedback is the most valuable signal a developer can get. Now there's a structured way to give it."
              features={consumerFeatures}
            />

            <FeaturesCard
              type="developer"
              tag="For Developers & Builders"
              title={<>Metrics that tell<br />the whole story</>}
              description="Surface-level evals aren't enough. Correlated with real user satisfaction and experience, see exactly how agents perform."
              features={developerFeatures}
            />
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Why Section */}
      <section className="section why-section" id="why">
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '620px', margin: '0 auto 56px' }}>
            <div className="section-eyebrow">Why ReviewMyAgent?</div>
            <div className="section-title">
              Because agents deserve the same accountability as any teammate
            </div>
            <p className="why-subtitle">
              AI agents are making real decisions in real workflows. Yet there's no
              structured way to evaluate them. We're changing that.
            </p>
          </div>

          <div className="why-grid">
            <div className="why-card">
              <div className="why-card-icon">🔗</div>
              <h3>Feedback meets data</h3>
              <p>
                Most platforms track either human opinions or machine metrics — never both.
                ReviewMyAgent connects real user satisfaction scores to execution traces,
                token costs, and tool-call logs in one place.
              </p>
            </div>

            <div className="why-card">
              <div className="why-card-icon">⚙️</div>
              <h3>Framework-agnostic</h3>
              <p>
                LangChain, CrewAI, AutoGen, OpenAI Swarm — it doesn't matter how you built
                your agent. ReviewMyAgent works with any framework so you can compare
                performance across your entire stack.
              </p>
            </div>

            <div className="why-card">
              <div className="why-card-icon">🛡️</div>
              <h3>Trust through transparency</h3>
              <p>
                Users browse reviews before integrating an agent into their workflow.
                Developers earn credibility by shipping agents with a public track record
                of real-world performance.
              </p>
            </div>

            <div className="why-card">
              <div className="why-card-icon">🧭</div>
              <h3>Shaped by the community</h3>
              <p>
                This isn't built in a vacuum. Every feature is informed by real users
                and builders. Sign up, share your pain points, and help shape how
                the world evaluates AI.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Integrated Frameworks */}
      <div className="frameworks">
        <div className="container">
          <div className="frameworks-label">Designed for popular agent frameworks</div>
          <div className="framework-pills">
            {/* .map here iterates over the objects in frameworks and creates 'frameworks.length' (4) framework pill elements */}
            {frameworks.map(({ name, color }) => (
              <div className="framework-pill" key={name}>
                <div className="fp-dot" style={{ background: color }} />{name}
              </div>
            ))}

            <div className="framework-pill" style={{ opacity: 0.5 }}>
              <div className="fp-dot" style={{ background: 'var(--text-dim)' }} />
              More to come
            </div>
          </div>
        </div>
      </div>

      <div className="section-divider" />

      {/* Stay In The Loop */}
      <section className="loop-section" id="connect">
        <div className="container">
          <div className="loop-header">
            <div className="section-eyebrow">Stay involved</div>
            <div className="section-title">Follow the build & help shape the platform</div>
            <p>
              ReviewMyAgent is in active development and things may change before launch. Sign up for occasional 
              progress updates, or share your pain points and ideas — we're building this with real users in mind.
            </p>
          </div>

          <div className="loop-panel">
            {status === null &&
              <SignUpForm
                signupEmail={signupEmail}
                setSignupEmail={setSignupEmail}
                roleOptions={roleOptions}
                selectedRole={selectedRole}
                setSelectedRole={setSelectedRole}
                handleSignupSubmit={handleSignupSubmit}
                captchaRef={captchaRef}
                captchaVerified={!!captchaToken}
                onCaptchaChange={(token) => setCaptchaToken(token)}
                
              />
            }

            {status === "success" && (
              <>
                <SuccessMessage signupEmail={signupEmail} />
                <FeedbackForm signupEmail={signupEmail} />
              </>
            )}      
            
            { status === "duplicate" && <DuplicateEmailMessage signupEmail={signupEmail} /> }

            { status === "error" && <ErrorMessage onRetry={() => setStatus(null)} /> }
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
