'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { createClient } from '@/lib/supabase/client';
import { verifyCaptchaAction } from '../actions';

// Password rules: 8+ chars, starts with capital, ends with special char
const PASSWORD_RULES = [
  { label: 'be at least 8 characters', display: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'start with a capital letter', display: 'Starts with a capital letter', test: (p) => /^[A-Z]/.test(p) },
  { label: 'end with a special character (!@#$%^&*)', display: 'Ends with a special character (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]$/.test(p) },
];

const validatePassword = (p) => PASSWORD_RULES.every(r => r.test(p));

// Email must match full RFC-style format (no fake domains blocked by pattern)
const validateEmail = (em) => /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/.test(em.trim());

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
const RESET_RESEND_COOLDOWN_SECONDS = 60;
const RESET_RATE_LIMIT_MESSAGE = 'Please wait before requesting another reset code.';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const requestedMode = searchParams.get('mode');
  const mode = requestedMode === 'signup' || requestedMode === 'reset' ? requestedMode : 'signin';

  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [resetStep, setResetStep] = useState('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetCooldown, setResetCooldown] = useState(0);
  const captchaRef = useRef(null);

  useEffect(() => {
    if (resetCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setResetCooldown((seconds) => {
        if (seconds <= 1) {
          setAuthError((message) => message === RESET_RATE_LIMIT_MESSAGE ? '' : message);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resetCooldown]);

  const switchMode = async (newMode) => {
    if (mode === 'reset' && resetStep === 'password') {
      const supabase = createClient();
      await resetRequest(() => supabase.auth.signOut({ scope: 'local' }));
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', newMode);
    router.replace(`/login?${params.toString()}`);
    setAuthError('');
    setResetMessage('');
    setResetStep('email');
    setResetCode('');
    setResetPasswordValue('');
    setResetPasswordConfirm('');
    setCaptchaToken(null);
    setShowPassword(false);
  };

  //function for sign up
  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    const supabase = createClient();
    const username = e.target.querySelector('#signup-name').value;
    const email = e.target.querySelector('#signup-email').value;
    const password = e.target.querySelector('#signup-password').value;
    const confirmPassword = e.target.querySelector('#signup-confirm-password').value;

    if (!HCAPTCHA_SITE_KEY) {
      setAuthError('Signups are temporarily unavailable. Please try again later.');
      setAuthLoading(false);
      return;
    }

    if (!captchaToken) {
      setAuthError('Please complete the CAPTCHA challenge.');
      setAuthLoading(false);
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      setAuthError('Please enter a valid email address (e.g. you@company.com).');
      setAuthLoading(false);
      return;
    }

    // Validate password rules
    if (!validatePassword(password)) {
      const failed = PASSWORD_RULES.filter(r => !r.test(password)).map(r => r.label);
      setAuthError('Password must: ' + failed.join(', ') + '.');
      setAuthLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      setAuthLoading(false);
      return;
    }

    const captchaVerification = await verifyCaptchaAction(captchaToken).catch(() => ({ error: 'Unable to complete the security check. Please try again.' }));
    if (captchaVerification?.error) {
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
      setAuthError(captchaVerification.error);
      setAuthLoading(false);
      return;
    }

    // Store username in auth metadata — this always works regardless of DB table state
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, email },
      },
    });
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
      return;
    }
    if (data.user) {
      try {
        await supabase
          .from('profiles')
          .upsert({ id: data.user.id, username, email }, { onConflict: 'id' });
      } catch (_) {
        // Non-blocking — auth account is already created above
      }
    }

    setPasswordValue('');
    setAuthLoading(false);
    router.push(next);
    router.refresh();
  };

  //function for sign in
  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    const supabase = createClient();
    const identifier = e.target.querySelector('#signin-identifier').value.trim();
    const password = e.target.querySelector('#signin-password').value;

    let loginEmail = identifier;

    // If identifier looks like a username (no @), try to resolve it to an email
    if (!identifier.includes('@')) {
      // First try the profiles table
      let resolved = false;
      try {
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', identifier)
          .single();
        if (!profileErr && profile?.email) {
          loginEmail = profile.email;
          resolved = true;
        }
      } catch (_) {
        // profiles table unavailable
      }

      if (!resolved) {
        setAuthError('Username not found. Please sign in with your email address instead.');
        setAuthLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
      return;
    }
    setAuthLoading(false);
    router.push(next);
    router.refresh();
  };

  //reset password
  const resetRequest = async (request) => {
    try {
      return await request();
    } catch (_) {
      return { error: { message: 'Unable to connect. Please try again.' } };
    }
  };

  const handleResetSendError = (error, fallbackMessage) => {
    const message = error?.message || '';
    const isRateLimited = error?.status === 429
      || error?.code?.includes('rate_limit')
      || /security purposes|rate limit|too many requests/i.test(message);

    if (isRateLimited) {
      const seconds = Number(message.match(/(\d+)\s*seconds?/i)?.[1]) || RESET_RESEND_COOLDOWN_SECONDS;
      setResetCooldown(seconds);
      setAuthError(RESET_RATE_LIMIT_MESSAGE);
      return;
    }

    setAuthError(fallbackMessage);
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    if (authLoading) return;
    setAuthError('');
    setResetMessage('');

    if (resetCooldown > 0) {
      setAuthError(RESET_RATE_LIMIT_MESSAGE);
      return;
    }

    if (!validateEmail(resetEmail)) {
      setAuthError('Please enter a valid email address (e.g. you@company.com).');
      return;
    }

    setAuthLoading(true);
    const supabase = createClient();
    const { error } = await resetRequest(() => supabase.auth.resetPasswordForEmail(resetEmail.trim()));
    setAuthLoading(false);

    if (error) {
      handleResetSendError(error, 'We could not send your ReviewMyAgent reset code. Please try again.');
      return;
    }

    setResetCooldown(RESET_RESEND_COOLDOWN_SECONDS);
    setResetStep('code');
    setResetMessage('If an account exists for this email, a reset code has been sent.');
  };

  const handleResetCode = async (e) => {
    e.preventDefault();
    if (authLoading) return;
    setAuthError('');
    setResetMessage('');

    if (!/^[0-9]{6,10}$/.test(resetCode.trim())) {
      setAuthError('Enter the full code from your email.');
      return;
    }

    setAuthLoading(true);
    const supabase = createClient();
    const { error } = await resetRequest(() => supabase.auth.verifyOtp({
      email: resetEmail.trim(),
      token: resetCode.trim(),
      type: 'recovery',
    }));
    setAuthLoading(false);

    if (error) {
      setAuthError('That code is invalid or has expired. Request a new code and try again.');
      return;
    }

    setResetStep('password');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (authLoading) return;
    setAuthError('');

    if (!validatePassword(resetPasswordValue)) {
      const failed = PASSWORD_RULES.filter(r => !r.test(resetPasswordValue)).map(r => r.label);
      setAuthError('Password must: ' + failed.join(', ') + '.');
      return;
    }

    if (resetPasswordValue !== resetPasswordConfirm) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthLoading(true);
    const supabase = createClient();
    const { error } = await resetRequest(() => supabase.auth.updateUser({ password: resetPasswordValue }));

    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
      return;
    }

    await resetRequest(() => supabase.auth.signOut({ scope: 'local' }));
    setResetPasswordValue('');
    setResetPasswordConfirm('');
    setResetCode('');
    setAuthLoading(false);
    setResetStep('success');
  };

  const resendResetCode = async () => {
    if (authLoading || resetCooldown > 0) return;
    setAuthError('');
    setResetMessage('');
    setAuthLoading(true);

    const supabase = createClient();
    const { error } = await resetRequest(() => supabase.auth.resetPasswordForEmail(resetEmail.trim()));
    setAuthLoading(false);

    if (error) {
      handleResetSendError(error, 'We could not send a new ReviewMyAgent reset code. Please try again.');
      return;
    }

    setResetCooldown(RESET_RESEND_COOLDOWN_SECONDS);
    setResetCode('');
    setResetMessage('If an account exists for this email, a new reset code has been sent.');
  };

  const handleClose = async () => {
    if (authLoading) return;
    if (mode === 'reset' && resetStep === 'password') {
      const supabase = createClient();
      await resetRequest(() => supabase.auth.signOut({ scope: 'local' }));
    }
    router.push('/');
  };

  return (
    <div className="signup-overlay" style={{ position: 'fixed' }}>
      <div className="signup-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="signup-close" aria-label="Back to home" onClick={handleClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <Image
          src="/rma-brand-logo.png"
          alt="ReviewMyAgent"
          width={56}
          height={56}
          className="signup-logo-mark"
          priority
        />

        {mode === 'signup' ? (
          <>
            <div className="signup-header">
              <h2>Create your account</h2>
              <p className="signup-subtitle">Start evaluating AI agents today</p>
            </div>
            {authError && <div className="auth-error">{authError}</div>}
            <form className="signup-form" onSubmit={handleSignUp}>
              <div className="signup-field">
                <label htmlFor="signup-name" className="signup-label mono">Username</label>
                <input id="signup-name" type="text" className="signup-input" placeholder="agent_reviewer42" autoComplete="username" required />
              </div>
              <div className="signup-field">
                <label htmlFor="signup-email" className="signup-label mono">Email</label>
                <input
                  id="signup-email"
                  type="email"
                  className="signup-input"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  pattern="[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~\-]+@[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+"
                  title="Enter a valid email address (e.g. you@company.com)"
                />
              </div>
              <div className="signup-field">
                <label htmlFor="signup-password" className="signup-label mono">Password</label>
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  className="signup-input"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                />
                {/* Live password requirements checklist */}
                {passwordValue.length > 0 && (
                  <ul className="password-rules">
                    {PASSWORD_RULES.map((rule) => {
                      const ok = rule.test(passwordValue);
                      return (
                        <li key={rule.display} className={`password-rule ${ok ? 'rule-ok' : 'rule-fail'}`}>
                          <span className="rule-icon">{ok ? '✓' : '✗'}</span>
                          {rule.display}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {/* Static hint when field is empty */}
                {passwordValue.length === 0 && (
                  <p className="password-hint">Min. 8 chars · starts with capital · ends with special (!@#$%…)</p>
                )}
              </div>
              <div className="signup-field">
                <label htmlFor="signup-confirm-password" className="signup-label mono">Confirm Password</label>
                <input id="signup-confirm-password" type={showPassword ? "text" : "password"} className="signup-input" placeholder="••••••••" autoComplete="new-password" required />
              </div>
              <div className="signup-field" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '-10px', marginBottom: '16px' }}>
                <input id="show-signup-password" type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} style={{ cursor: 'pointer' }} />
                <label htmlFor="show-signup-password" style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--text-dim)', cursor: 'pointer' }}>Show password</label>
              </div>
              <div className="signup-captcha">
                {HCAPTCHA_SITE_KEY ? (
                  <HCaptcha
                    ref={captchaRef}
                    sitekey={HCAPTCHA_SITE_KEY}
                    theme="dark"
                    onVerify={setCaptchaToken}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => {
                      setCaptchaToken(null);
                      setAuthError('The security check could not load. Please refresh and try again.');
                    }}
                  />
                ) : (
                  <p className="captcha-config-error">Signups are temporarily unavailable. Please try again later.</p>
                )}
              </div>
              <button type="submit" className={`signup-submit${!captchaToken || authLoading ? ' signup-submit-disabled' : ''}`} disabled={!captchaToken || authLoading}>
                {authLoading ? 'Creating account...' : 'Create Account'}
              </button>
              <p className="signup-footer-text">Already have an account? <a href="#" className="signup-link" onClick={(e) => { e.preventDefault(); switchMode('signin'); }}>Sign in</a></p>
            </form>
          </>
        ) : mode === 'reset' ? (
          <>
            {resetStep === 'email' && (
              <>
                <div className="signup-header">
                  <h2>Reset your password</h2>
                  <p className="signup-subtitle">Enter the email connected to your account</p>
                </div>
                {authError && <div className="auth-error">{authError}</div>}
                <form className="signup-form" onSubmit={handleResetRequest}>
                  <div className="signup-field">
                    <label htmlFor="reset-email" className="signup-label mono">Email</label>
                    <input id="reset-email" type="email" className="signup-input" placeholder="you@company.com" autoComplete="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
                  </div>
                  <button type="submit" className={`signup-submit${authLoading || resetCooldown > 0 ? ' signup-submit-disabled' : ''}`} disabled={authLoading || resetCooldown > 0}>
                    {authLoading ? 'Sending code...' : resetCooldown > 0 ? `Try again in ${resetCooldown}s` : 'Send Reset Code'}
                  </button>
                  <p className="signup-footer-text">Remember your password? <a href="#" className="signup-link" onClick={(e) => { e.preventDefault(); switchMode('signin'); }}>Sign in</a></p>
                </form>
              </>
            )}

            {resetStep === 'code' && (
              <>
                <div className="signup-header">
                  <h2>Check your email</h2>
                  <p className="signup-subtitle">Enter the code sent to {resetEmail}</p>
                </div>
                {authError && <div className="auth-error">{authError}</div>}
                {resetMessage && <div className="auth-success">{resetMessage}</div>}
                <form className="signup-form" onSubmit={handleResetCode}>
                  <div className="signup-field">
                    <label htmlFor="reset-code" className="signup-label mono">Reset Code</label>
                    <input id="reset-code" type="text" className="signup-input reset-code-input" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6,10}" minLength="6" maxLength="10" value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))} required />
                  </div>
                  <button type="submit" className={`signup-submit${authLoading ? ' signup-submit-disabled' : ''}`} disabled={authLoading || resetCode.length < 6 || resetCode.length > 10}>
                    {authLoading ? 'Verifying code...' : 'Verify Code'}
                  </button>
                  <button type="button" className="reset-secondary-button" onClick={resendResetCode} disabled={authLoading || resetCooldown > 0}>
                    {resetCooldown > 0 ? `Send a new code in ${resetCooldown}s` : 'Send a new code'}
                  </button>
                </form>
              </>
            )}

            {resetStep === 'password' && (
              <>
                <div className="signup-header">
                  <h2>Choose a new password</h2>
                  <p className="signup-subtitle">Create a secure password for your account</p>
                </div>
                {authError && <div className="auth-error">{authError}</div>}
                <form className="signup-form" onSubmit={handleResetPassword}>
                  <div className="signup-field">
                    <label htmlFor="reset-password" className="signup-label mono">New Password</label>
                    <input id="reset-password" type={showPassword ? 'text' : 'password'} className="signup-input" placeholder="••••••••" autoComplete="new-password" value={resetPasswordValue} onChange={(e) => setResetPasswordValue(e.target.value)} required />
                    {resetPasswordValue.length > 0 ? (
                      <ul className="password-rules">
                        {PASSWORD_RULES.map((rule) => {
                          const ok = rule.test(resetPasswordValue);
                          return (
                            <li key={rule.display} className={`password-rule ${ok ? 'rule-ok' : 'rule-fail'}`}>
                              <span className="rule-icon">{ok ? 'Met' : 'Needed'}</span>
                              {rule.display}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="password-hint">Min. 8 chars · starts with capital · ends with special (!@#$%…)</p>
                    )}
                  </div>
                  <div className="signup-field">
                    <label htmlFor="reset-password-confirm" className="signup-label mono">Confirm New Password</label>
                    <input id="reset-password-confirm" type={showPassword ? 'text' : 'password'} className="signup-input" placeholder="••••••••" autoComplete="new-password" value={resetPasswordConfirm} onChange={(e) => setResetPasswordConfirm(e.target.value)} required />
                  </div>
                  <div className="signup-field reset-password-toggle">
                    <input id="show-reset-password" type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
                    <label htmlFor="show-reset-password">Show password</label>
                  </div>
                  <button type="submit" className={`signup-submit${authLoading ? ' signup-submit-disabled' : ''}`} disabled={authLoading}>
                    {authLoading ? 'Updating password...' : 'Update Password'}
                  </button>
                </form>
              </>
            )}

            {resetStep === 'success' && (
              <div className="reset-success-state">
                <div className="reset-success-icon" aria-hidden="true">✓</div>
                <div className="signup-header">
                  <h2>Password updated</h2>
                  <p className="signup-subtitle">Your new password is ready to use.</p>
                </div>
                <button type="button" className="signup-submit" onClick={() => switchMode('signin')}>Return to Sign In</button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="signup-header">
              <h2>Welcome back</h2>
              <p className="signup-subtitle">Sign in to your account</p>
            </div>
            {authError && <div className="auth-error">{authError}</div>}
            <form className="signup-form" onSubmit={handleSignIn}>
              <div className="signup-field">
                <label htmlFor="signin-identifier" className="signup-label mono">Email or Username</label>
                <input id="signin-identifier" type="text" className="signup-input" placeholder="Enter email or username" autoComplete="username" required />
              </div>
              <div className="signup-field">
                <label htmlFor="signin-password" className="signup-label mono">Password</label>
                <input id="signin-password" type={showPassword ? "text" : "password"} className="signup-input" placeholder="••••••••" autoComplete="current-password" required />
                <a href="#" className="reset-password-link" onClick={(e) => { e.preventDefault(); switchMode('reset'); }}>Forgot password?</a>
              </div>
              <div className="signup-field" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '-4px' }}>
                <input id="show-signin-password" type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} style={{ cursor: 'pointer' }} />
                <label htmlFor="show-signin-password" style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--text-dim)', cursor: 'pointer' }}>Show password</label>
              </div>
              <button type="submit" className={`signup-submit${authLoading ? ' signup-submit-disabled' : ''}`} disabled={authLoading}>
                {authLoading ? 'Signing in...' : 'Sign In'}
              </button>
              <p className="signup-footer-text">Don’t have an account? <a href="#" className="signup-link" onClick={(e) => { e.preventDefault(); switchMode('signup'); }}>Sign up</a></p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
