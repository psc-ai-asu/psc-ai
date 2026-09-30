import { BulletList, ContactCard, DocSection, BodyText } from "@/components/LegalComponents"
import Footer from "@/components/Footer";
import PlatformHeader from "@/components/PlatformHeader";

const items = [
  { id: "s1",  label: "Who We Are" },
  { id: "s2",  label: "Information We Collect" },
  { id: "s3",  label: "How We Use Your Information" },
  { id: "s4",  label: "AI Agent Data & Traces" },
  { id: "s5",  label: "How We Store Your Data" },
  { id: "s6",  label: "Sharing Your Information" },
  { id: "s7",  label: "Cookies & Tracking" },
  { id: "s8",  label: "Your Rights" },
  { id: "s9", label: "Data Retention" },
  { id: "s10", label: "Children's Privacy" },
  { id: "s11", label: "Changes to This Policy" },
  { id: "s12", label: "Contact" },
];

export default function PrivacyPolicy() {
  return (
    <div className="app-shell min-h-screen">
      <PlatformHeader />

      {/* Page layout */}
      <div className="max-w-[1100px] mx-auto px-8 pt-20 pb-32 grid grid-cols-[220px_1fr] gap-16 items-start max-md:grid-cols-1 max-md:gap-8">

        <aside className="sticky top-20 hidden md:block">
          <p className="text-[11px] font-medium text-[var(--text-muted)] tracking-widest uppercase mb-4">
            On this page
          </p>
          <ol className="list-none border-l border-[var(--border)] pl-4 space-y-2">
            {items.map(({ id, label }) => (
              <li key={id}>
                <a href={`#${id}`} className="block text-[13px] leading-snug no-underline transition-colors duration-200 text-[var(--text-muted)] hover:text-[var(--text)]">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </aside>

        {/* Content */}
        <main className="animate-[fadeUp_0.5s_ease_both]">
          <header className="border-b border-[var(--border)] mb-12">
            <h1 className="text-[44px] font-normal leading-tight text-[var(--text)] mb-3">
              Privacy Policy
            </h1>

            <BodyText>
              This Privacy Policy describes how <strong className="font-medium text-[var(--text)]">Gentle Systems</strong> (“we,”
              “us,” or “our”) collects, uses, stores, and protects your information when you use ReviewMyAgent
              at <a href="https://reviewmyagent.today" className="text-violet-400 hover:underline">reviewmyagent.today</a>.
              By creating an account or using the platform, you agree to the practices described below.
            </BodyText>
          </header>
 
          <div className="mt-10">
 
            <DocSection id="s1" num="01" title="Who We Are">
              <BodyText>
                ReviewMyAgent is an AI agent performance review platform operated by Gentle Systems.
                The platform allows users to evaluate AI agent interactions through structured
                human-in-the-loop review workflows, capturing traces and metrics to help agent
                builders understand and improve their agents.
              </BodyText>
            </DocSection>
 
            <DocSection id="s2" num="02" title="Information We Collect">
              <BodyText>We collect information in two ways: information you provide directly, and information collected automatically.</BodyText>
 
              <p className="text-[13px] font-medium text-[var(--text)] mt-4 mb-2">Account Information</p>
              <BulletList items={[
                "Your email address",
                "Your name or display name",
                "A hashed password (if using email/password sign-in)",
                "OAuth profile data from Google (name, email, profile photo) if you sign in with Google",
                "Account creation date and last login timestamp",
              ]} />
 
              <p className="text-[13px] font-medium text-[var(--text)] mt-4 mb-2">Platform Activity</p>
              <BulletList items={[
                "Reviews and ratings you submit for AI agent interactions",
                "Responses to performance review questions and rubrics",
                "Tags and labels you apply to agents or reviews",
                "Any written feedback or comments submitted through the platform",
              ]} />
 
              <p className="text-[13px] font-medium text-[var(--text)] mt-4 mb-2">Agent & Trace Data</p>
              <BodyText>
                The specific data captured from AI agent traces is subject to ongoing development.
                This section will be updated as the data model is finalized. See Section 4 for more
                detail on how agent trace data is handled.
              </BodyText>
            </DocSection>
 
            <DocSection id="s3" num="03" title="How We Use Your Information">
              <BodyText>We use the information we collect to:</BodyText>
              <BulletList items={[
                "Create and manage your account",
                "Authenticate your identity when you sign in",
                "Deliver the core platform features — submitting reviews, viewing agent performance, managing dashboards",
                "Associate your reviews with the correct agents, tags, and time periods",
                "Send you account-related notifications such as email verification and password resets",
                "Send product updates and platform announcements (you can opt out at any time)",
                "Detect and prevent abuse, fraud, or violations of our Terms of Service",
                "Analyze aggregate usage patterns to improve the platform",
                "Respond to support requests or inquiries",
              ]} />
              <BodyText>
                We do not use your personal information to train AI models, sell advertising, or
                share data with third parties for their own marketing purposes.
              </BodyText>
            </DocSection>
 
            <DocSection id="s4" num="04" title="AI Agent Data & Traces">
              <BodyText>
                ReviewMyAgent is designed to capture and store AI agent traces, which may include
                data about LLM calls, tool usage, context windows, and agent performance metrics.
                The exact scope of trace data collected is subject to ongoing development and will
                be detailed here as the platform matures.
              </BodyText>
 
              <BodyText>
                Agent trace data is stored long-term to support performance tracking over time.
                Agent builders can view historical trace data through the platform dashboard.
              </BodyText>
            </DocSection>
 
            <DocSection id="s5" num="05" title="How We Store Your Data">
              <BodyText>
                All platform data is stored in a Supabase database protected by Row Level Security
                (RLS). This means database-level access controls ensure that users can only access
                the data they are authorized to see. Your data is never accessible to other users
                unless you explicitly share it.
              </BodyText>
            </DocSection>

 
            <DocSection id="s6" num="06" title="Sharing Your Information">
              <BodyText>
                We do not sell, rent, or trade your personal information.
              </BodyText>
            </DocSection>
 
            <DocSection id="s7" num="07" title="Cookies & Tracking">
              <BodyText>
                ReviewMyAgent uses cookies and similar technologies to keep you signed in and to
                understand how the platform is used. This may include session cookies required for
                authentication and optional analytics tools.
              </BodyText>
              <BodyText>
                You can control cookie behavior through your browser settings, though disabling
                certain cookies may prevent you from staying signed in or using core platform
                features.
              </BodyText>
            </DocSection>
 
            <DocSection id="s8" num="08" title="Your Rights">
              <BodyText>
                Depending on where you are located, you may have the following rights:
              </BodyText>
              <BulletList items={[
                "Access — request a copy of the personal data we hold about you",
                "Correction — request that inaccurate data be corrected",
                "Deletion — request that your account and associated data be deleted",
                "Withdrawal of consent — opt out of non-essential communications at any time",
              ]} />
              <BodyText>
                To exercise any of these rights, contact us at{" "}
                <a href="mailto:privacy@reviewmyagent.today" className="text-violet-400 hover:underline">
                  privacy@reviewmyagent.today
                </a>
                . We will respond within 30 days.
              </BodyText>
            </DocSection>
 
            <DocSection id="s9" num="09" title="Data Retention">
              <BodyText>
                We retain your account information and platform activity for as long as your account
                is active. Agent trace data is stored long-term to support historical performance
                tracking.
              </BodyText>
              <BodyText>
                If you delete your account, we will delete your personal information within 30 days,
                except where we are required to retain it by law or where it has been anonymized and
                incorporated into aggregate analytics.
              </BodyText>
              <BodyText>
                Specific retention periods for agent trace data and review records will be detailed
                here as the data model is finalized.
              </BodyText>
            </DocSection>
 
            <DocSection id="s10" num="10" title="Children's Privacy">
              <BodyText>
                ReviewMyAgent is not directed at individuals under the age of 13. We do not
                knowingly collect personal information from children. If you believe we have
                inadvertently collected such information, please contact us and we will delete it
                promptly.
              </BodyText>
            </DocSection>
 
            <DocSection id="s11" num="11" title="Changes to This Policy">
              <BodyText>
                We may update this Privacy Policy as the platform evolves. For material changes, we
                will notify you via email or a prominent notice within the platform, and will update
                the effective date above. Your continued use of ReviewMyAgent after any changes
                constitutes acceptance of the updated policy.
              </BodyText>
            </DocSection>
 
            <DocSection id="s12" num="12" title="Contact">
              <BodyText>
                For any questions, requests, or concerns regarding this Privacy Policy:
              </BodyText>
              <div className="bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl p-6 mt-2 space-y-1.5">
                <p className="text-[14px] font-medium text-[var(--text)]">Gentle Systems</p>
                <p className="text-[14px] font-light text-[var(--text-muted)]">
                  Platform:{" "}
                  <a href="http://reviewmyagent.today" className="text-violet-400 hover:underline">
                    reviewmyagent.today
                  </a>
                </p>
                <p className="text-[14px] font-light text-[var(--text-muted)]">
                  Privacy inquiries:{" "}
                  <a href="mailto:privacy@reviewmyagent.today" className="text-violet-400 hover:underline">
                    privacy@reviewmyagent.today
                  </a>
                </p>
              </div>
            </DocSection>

          </div>
        </main>
      </div>

      <Footer />

      <style>
        {`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
}
