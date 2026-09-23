import { BulletList, ContactCard, DocSection, BodyText } from "@/components/LegalComponents";
import Footer from "@/components/Footer";
import PlatformHeader from "@/components/PlatformHeader";

const tocItems = [
  { id: "s1",  label: "About ReviewMyAgent" },
  { id: "s2",  label: "Accepting These Terms" },
  { id: "s3",  label: "Your Account" },
  { id: "s4",  label: "What You Can Do" },
  { id: "s5",  label: "What You Cannot Do" },
  { id: "s6",  label: "AI Agent Data" },
  { id: "s7",  label: "Reviews & Submissions" },
  { id: "s8",  label: "Open Source License" },
  { id: "s9",  label: "Intellectual Property" },
  { id: "s10", label: "Disclaimer of Warranties" },
  { id: "s11", label: "Limitation of Liability" },
  { id: "s12", label: "Termination" },
  { id: "s13", label: "Changes to Terms" },
  { id: "s14", label: "Contact" },
];

function Callout({ children }) {
  return (
    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-5 py-4 my-3">
      <p className="text-[13px] text-yellow-200/70 font-normal leading-relaxed tracking-wide m-0">
        {children}
      </p>
    </div>
  );
}

export default function PlatformTermsPage() {
  return (
    <div className="app-shell min-h-screen">
      <PlatformHeader />

      {/* Page layout */}
      <div className="max-w-[1100px] mx-auto px-8 pt-20 pb-32 grid grid-cols-[220px_1fr] gap-16 items-start max-md:grid-cols-1 max-md:gap-8">

        {/* TOC */}
        <aside className="sticky top-20 hidden md:block">
          <p className="text-[11px] font-medium text-[var(--text-muted)] tracking-widest uppercase mb-4">
            On this page
          </p>
          <ol className="list-none border-l border-[var(--border)] pl-4 space-y-2">
            {tocItems.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="block text-[13px] leading-snug no-underline transition-colors duration-200 text-[var(--text-muted)] hover:text-[var(--text)]"
                >
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
              Terms of Service
            </h1>

            <BodyText>
                These Terms of Service (“Terms”) govern your access to and use of ReviewMyAgent,
                operated by <strong className="font-medium text-[var(--text)]">Gentle Systems</strong> (“we,”
                “us,” or “our”) at{" "}
                <a href="https://reviewmyagent.today" className="text-violet-400 hover:underline">
                reviewmyagent.today
                </a>
                . By creating an account or using the platform, you agree to be bound by these Terms and
                our{" "}
                <a href="/privacy-policy" className="text-violet-400 hover:underline">
                Privacy Policy
                </a>
                .
            </BodyText>
          </header>

          <div className="mt-10">

            <DocSection id="s1" num="01" title="About ReviewMyAgent">
              <BodyText>
                ReviewMyAgent is an open-source AI agent performance review platform. It allows
                users to capture AI agent traces, track performance metrics, and conduct
                human-in-the-loop reviews of agent interactions. The platform serves two primary
                user types:
              </BodyText>
              <BulletList items={[
                "Agent Builders — developers or teams who connect their AI agents to the platform and use review data to evaluate and improve agent performance",
                "Reviewers — users who evaluate AI agent interactions by completing structured review forms and submitting performance ratings",
              ]} />
              <BodyText>
                ReviewMyAgent is provided free of charge and is open source. Gentle Systems hosts
                the platform at reviewmyagent.today.
              </BodyText>
            </DocSection>

            <DocSection id="s2" num="02" title="Accepting These Terms">
              <BodyText>
                By creating an account, you confirm that:
              </BodyText>
              <BulletList items={[
                "You are at least 13 years of age (or the applicable age of digital consent in your jurisdiction)",
                "You have read and agree to these Terms and our Privacy Policy",
                "If you are using the platform on behalf of an organization, you have the authority to bind that organization to these Terms",
                "The information you provide during registration is accurate and truthful",
              ]} />
            </DocSection>

            <DocSection id="s3" num="03" title="Your Account">
              <BodyText>
                You may create an account using an email address and password, or by signing in with
                Google OAuth. You are responsible for:
              </BodyText>
              <BulletList items={[
                "Keeping your login credentials secure and confidential",
                "All activity that occurs under your account",
                "Notifying us immediately if you believe your account has been compromised",
              ]} />
              <BodyText>
                We reserve the right to suspend or terminate accounts that violate these Terms, are
                involved in fraudulent activity, or have been inactive for an extended period.
              </BodyText>
            </DocSection>

            <DocSection id="s4" num="04" title="What You Can Do">
              <BodyText>
                Subject to these Terms, Gentle Systems grants you a limited, non-exclusive,
                non-transferable right to:
              </BodyText>
              <BulletList items={[
                "Create an account and access the ReviewMyAgent platform",
                "Connect your AI agents to the platform (Agent Builders)",
                "Submit reviews and performance ratings for AI agent interactions (Reviewers)",
                "View dashboards, metrics, and historical review data associated with your account",
                "Use the open-source codebase in accordance with its license",
              ]} />
            </DocSection>

            <DocSection id="s5" num="05" title="What You Cannot Do">
              <BodyText>
                You agree not to:
              </BodyText>
              <BulletList items={[
                "Use the platform for any unlawful purpose or in violation of any applicable laws",
                "Attempt to gain unauthorized access to other users' accounts, data, or any part of the platform's infrastructure",
                "Submit false, misleading, or manipulated reviews or performance data",
                "Use automated scripts or bots to submit reviews or interact with the platform",
                "Reverse engineer, decompile, or attempt to extract the source code of the hosted service beyond what is provided under the open-source license",
                "Upload or transmit malicious code, viruses, or any content designed to disrupt or damage the platform",
                "Use the platform to process data you do not have the right to share, including personal data without appropriate consent",
                "Resell, sublicense, or commercialize access to the hosted platform without written permission from Gentle Systems",
              ]} />
            </DocSection>

            <DocSection id="s6" num="06" title="AI Agent Data">
              <BodyText>
                When you connect an AI agent to ReviewMyAgent, you are responsible for ensuring that
                you have the appropriate rights and permissions to submit that agent’s trace data to
                the platform.
              </BodyText>

              <BodyText>
                You retain ownership of your agent trace data. By submitting it to the platform, you
                grant Gentle Systems a limited license to store, process, and display that data
                solely for the purpose of delivering the platform’s features to you.
              </BodyText>
            </DocSection>

            <DocSection id="s7" num="07" title="Reviews & Submissions">
              <BodyText>
                By submitting reviews, ratings, or feedback through the platform, you confirm that:
              </BodyText>
              <BulletList items={[
                "Your submissions are honest and reflect your genuine assessment of the agent interaction",
                "You will not submit reviews for agents you have not actually interacted with",
                "Your submissions do not contain illegal, harmful, or objectionable content",
                "You grant Gentle Systems a non-exclusive license to store and display your submissions within the platform for the purposes of agent performance tracking",
              ]} />
              <BodyText>
                Agent Builders can view reviews submitted about their agents. Reviews are associated
                with your account but Agent Builders see review content, not necessarily your
                personal identity, unless you have chosen to make that visible.
              </BodyText>
            </DocSection>

            <DocSection id="s8" num="08" title="Open Source License">
              <BodyText>
                ReviewMyAgent is open-source software. The source code is made available under an
                open-source license (see the project repository for full license details). These
                Terms govern your use of the <em>hosted service</em> at reviewmyagent.today — the
                open-source license separately governs your use of the codebase itself.
              </BodyText>
              <BodyText>
                Nothing in these Terms restricts your rights under the open-source license with
                respect to the software code.
              </BodyText>
            </DocSection>

            <DocSection id="s9" num="09" title="Intellectual Property">
              <BodyText>
                The ReviewMyAgent name, logo, platform design, and non-open-source components are
                the intellectual property of Gentle Systems. You may not use these without our
                express written permission.
              </BodyText>
              <BodyText>
                You retain ownership of any data, content, or submissions you provide to the
                platform. You grant Gentle Systems only the limited licenses described in these Terms
                to operate the service.
              </BodyText>
            </DocSection>

            <DocSection id="s10" num="10" title="Disclaimer of Warranties">
              <Callout>
                REVIEWMYAGENT IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY
                KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
                MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. GENTLE
                SYSTEMS DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE,
                SECURE, OR FREE OF HARMFUL COMPONENTS. YOUR USE OF THE PLATFORM IS AT YOUR OWN RISK.
              </Callout>
            </DocSection>

            <DocSection id="s11" num="11" title="Limitation of Liability">
              <Callout>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, GENTLE SYSTEMS SHALL NOT BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM OR
                RELATED TO YOUR USE OF REVIEWMYAGENT, INCLUDING BUT NOT LIMITED TO LOSS OF DATA,
                LOSS OF REVENUE, OR RELIANCE ON PLATFORM OUTPUT. THIS LIMITATION APPLIES REGARDLESS
                OF WHETHER WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </Callout>
            </DocSection>

            <DocSection id="s12" num="12" title="Termination">
              <BodyText>
                You may delete your account at any time through your account settings. Upon deletion,
                we will remove your personal information within 30 days in accordance with our
                Privacy Policy.
              </BodyText>
              <BodyText>
                We reserve the right to suspend or terminate your account at any time if we believe
                you have violated these Terms, engaged in abusive behavior, or if we discontinue
                the platform. We will provide reasonable notice where possible.
              </BodyText>
              <BodyText>
                Sections covering intellectual property, disclaimers, limitation of liability, and
                indemnification survive termination.
              </BodyText>
            </DocSection>

            <DocSection id="s13" num="13" title="Changes to These Terms">
              <BodyText>
                We may update these Terms as the platform evolves. For material changes, we will
                notify you via email or a prominent notice within the platform at least 14 days
                before the changes take effect. Your continued use of ReviewMyAgent after that point
                constitutes acceptance of the updated Terms.
              </BodyText>
              <BodyText>
                If you do not agree to updated Terms, you may delete your account before they take
                effect.
              </BodyText>
            </DocSection>

            <DocSection id="s14" num="14" title="Contact">
              <BodyText>
                For questions or concerns about these Terms:
              </BodyText>

              <ContactCard />
            </DocSection>

          </div>
        </main>
      </div>

      <Footer />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
