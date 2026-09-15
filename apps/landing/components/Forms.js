import HCaptcha from '@hcaptcha/react-hcaptcha'

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY

export function SignUpForm({ signupEmail, setSignupEmail, roleOptions, selectedRole, setSelectedRole, handleSignupSubmit, captchaRef, captchaVerified, onCaptchaChange }) {
  return (
    <>
      <div className="text-[11px] font-medium tracking-[0.08em] uppercase text-neutral-500 mb-[18px]">
        📬 Get Updates
      </div>
      <h3>Stay in the loop</h3>
      <p>
        We'll send occasional updates as we hit milestones with meaningful
        progress on what we're building and a heads up for major feature updates.
      </p>
      <form onSubmit={handleSignupSubmit} className="flex flex-col gap-3">
        <input
          className="bg-neutral-800 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none transition-colors duration-200 w-full focus:border-violet-500"
          type="email"
          placeholder="your@email.com"
          value={signupEmail}
          onChange={(e) => setSignupEmail(e.target.value)}
        />
        <div>
          <div className="text-[12px] text-neutral-500 mb-2 tracking-[0.06em] uppercase">
            I am a...
          </div>
          <div className="flex gap-2 flex-wrap">
            {roleOptions.map(({ label, value }) => (
              <button
                type="button"
                key={value}
                onClick={() => setSelectedRole(value)}
                className={`px-[14px] py-[6px] rounded-full text-xs font-medium cursor-pointer border transition-all duration-[180ms]
                  ${selectedRole === value && value === 'user'
                    ? 'bg-violet-500/10 border-violet-500/35 text-violet-400'
                    : selectedRole === value && value === 'developer'
                    ? 'bg-amber-500/10 border-amber-500/35 text-amber-400'
                    : selectedRole === value && value === 'both'
                    ? 'bg-violet-500/[0.06] border-violet-500/25 text-neutral-400'
                    : 'bg-transparent border-white/10 text-neutral-500 hover:text-neutral-400 hover:border-neutral-500'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-center my-1">
          <HCaptcha
            ref={captchaRef}
            sitekey={HCAPTCHA_SITE_KEY}
            theme="dark"
            onVerify={onCaptchaChange}
            onExpire={() => onCaptchaChange(null)}
            onError={() => onCaptchaChange(null)}
          />
        </div>
        <button
          type="submit"
          disabled={!captchaVerified}
          style={{ opacity: captchaVerified ? 1 : 0.45, cursor: captchaVerified ? 'pointer' : 'not-allowed' }}
          className="flex items-center justify-center gap-2 w-full bg-violet-500 text-white border-none px-5 py-[13px] rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-[0.88] hover:-translate-y-px"
        >
          Notify me
        </button>
        <div className="text-[11px] text-neutral-500">No account needed. Unsubscribe any time.</div>
      </form>
    </>
  );
}

export function SuccessMessage({ signupEmail }) {
  return (
    <div className="flex flex-col items-center text-center py-3 animate-[fadeIn_0.8s_ease_both]">
      <div className="mb-[22px]">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="14" fill="rgba(34, 197, 94, 0.1)" />
          <path d="M8.5 14.5l4 4 7-8" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="text-[20px] font-normal tracking-[-0.4px] mb-[10px]">You're on the list</h3>
      <p className="text-sm font-light text-neutral-400 leading-[1.75] max-w-[300px] mb-7">
        We'll reach out to{" "}
        <span className="text-white font-normal">{signupEmail}</span> as we hit
        meaningful milestones.
      </p>
    </div>
  );
}

export function DuplicateEmailMessage({ signupEmail }) {
  return (
    <div className="flex flex-col items-center text-center py-3 animate-[fadeIn_0.8s_ease_both]">
      <div className="mb-[22px]">
        <svg width="43" height="43" viewBox="0 0 43 43" role="img" aria-label="Warning alert">
          <circle cx="21.5" cy="21.5" r="20" fill="#8B5CF6"/>
          <rect x="19.5" y="11" width="4" height="17" rx="2" fill="#FFFFFF"/>
          <circle cx="21.5" cy="32" r="2.7" fill="#FFFFFF"/>
        </svg>
      </div>
      <p className="text-[20px] font-normal tracking-[-0.4px] mb-[10px]">Looks like {signupEmail} is already on the list!</p>
      <p className="text-sm font-light text-neutral-400 leading-[1.75] max-w-[300px] mb-7">We'll be in touch soon.</p>
    </div>
  );
}

export function ErrorMessage({ onRetry }) {
  return (
    <div className="flex flex-col items-center text-center py-3 animate-[fadeIn_0.8s_ease_both]">
      <div className="mb-[22px]">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="14" fill="rgba(239, 68, 68, 0.1)" />
          <path d="M9.5 9.5l9 9M18.5 9.5l-9 9" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="text-[20px] font-normal tracking-[-0.4px] mb-[10px]">Something went wrong</h3>
      <p className="text-sm font-light text-neutral-400 leading-[1.75] max-w-[300px] mb-7">
        We couldn't save your email this time. It's on our end, not yours. Please try again in a moment.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-content gap-2 px-7 py-[11px] rounded-lg text-sm font-medium cursor-pointer border border-white/10 bg-transparent text-neutral-400 transition-all duration-200 hover:text-white hover:border-neutral-500 hover:bg-neutral-800"
      >
        Try again
      </button>
    </div>
  );
}
