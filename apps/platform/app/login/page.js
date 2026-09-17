'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Password rules: 8+ chars, starts with capital, ends with special char
const PASSWORD_RULES = [
  { label: 'be at least 8 characters', display: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'start with a capital letter', display: 'Starts with a capital letter', test: (p) => /^[A-Z]/.test(p) },
  { label: 'end with a special character (!@#$%^&*)', display: 'Ends with a special character (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]$/.test(p) },
];

const validatePassword = (p) => PASSWORD_RULES.every(r => r.test(p));

// Email must match full RFC-style format (no fake domains blocked by pattern)
const validateEmail = (em) => /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/.test(em.trim());

//recaptcha test key from google
const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';

  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const recaptchaRef = useRef(null);

  const switchMode = (newMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', newMode);
    router.replace(`/login?${params.toString()}`);
    setAuthError('');
    setShowPassword(false);
  };

  //load recaptcha script when in sign-up mode
  useEffect(() => {
    if (mode !== 'signup') {
      setCaptchaVerified(false);
      return;
    }

    window.onRecaptchaSuccess = () => setCaptchaVerified(true);
    window.onRecaptchaExpired = () => setCaptchaVerified(false);

    const renderCaptcha = () => {
      if (recaptchaRef.current && window.grecaptcha && window.grecaptcha.render) {
        //clear old widget away
        recaptchaRef.current.innerHTML = '';
        try {
          window.grecaptcha.render(recaptchaRef.current, {
            sitekey: RECAPTCHA_SITE_KEY,
            theme: 'dark',
            callback: 'onRecaptchaSuccess',
            'expired-callback': 'onRecaptchaExpired',
          });
        } catch (e) {
          //widget maybe render already
        }
      }
    };

    //check if script load already
    if (window.grecaptcha && window.grecaptcha.render) {
      //wait small time for dom
      setTimeout(renderCaptcha, 100);
    } else {
      //load script for recaptcha
      const existing = document.querySelector('script[src*="recaptcha"]');
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
        script.async = true;
        script.defer = true;
        window.onRecaptchaLoad = renderCaptcha;
        document.head.appendChild(script);
      } else {
        setTimeout(renderCaptcha, 300);
      }
    }

    return () => {
      //delete global callback
      delete window.onRecaptchaSuccess;
      delete window.onRecaptchaExpired;
    };
  }, [mode]);

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

    // Store username in auth metadata — this always works regardless of DB table state
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, email },
      },
    });
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

  return (
    <div className="signup-overlay" style={{ position: 'fixed' }}>
      <div className="signup-modal" onClick={(e) => e.stopPropagation()}>
        <Link href="/" className="signup-close" aria-label="Back to home">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Link>

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
                <div ref={recaptchaRef} id="recaptcha-container" />
              </div>
              <button type="submit" className={`signup-submit${!captchaVerified || authLoading ? ' signup-submit-disabled' : ''}`} disabled={!captchaVerified || authLoading}>
                {authLoading ? 'Creating account...' : 'Create Account'}
              </button>
              <p className="signup-footer-text">Already have an account? <a href="#" className="signup-link" onClick={(e) => { e.preventDefault(); switchMode('signin'); }}>Sign in</a></p>
            </form>
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
              </div>
              <div className="signup-field" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '-4px' }}>
                <input id="show-signin-password" type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} style={{ cursor: 'pointer' }} />
                <label htmlFor="show-signin-password" style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--text-dim)', cursor: 'pointer' }}>Show password</label>
              </div>
              <button type="submit" className={`signup-submit${authLoading ? ' signup-submit-disabled' : ''}`} disabled={authLoading}>
                {authLoading ? 'Signing in...' : 'Sign In'}
              </button>
              <p className="signup-footer-text">Don't have an account? <a href="#" className="signup-link" onClick={(e) => { e.preventDefault(); switchMode('signup'); }}>Sign up</a></p>
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
