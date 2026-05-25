import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock, Eye, EyeOff, CheckCircle, ArrowLeft, ShieldCheck, Check, X,
} from 'lucide-react';

const RULES = [
  { test: (p: string) => p.length >= 6, label: 'At least 6 characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p: string) => /[0-9]/.test(p), label: 'One number' },
];

const SetPasswordPage: React.FC = () => {
  const { completeSignup, pendingSignup, setAuthStep } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const allRulesPass = RULES.every(r => r.test(password));
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allRulesPass) { setError('Password does not meet requirements'); return; }
    if (!passwordsMatch) { setError('Passwords do not match'); return; }

    setLoading(true);
    setTimeout(async () => {
      const r = await completeSignup(password);
      if (!r.success) setError(r.message);
      setLoading(false);
    }, 600);
  };

  // Password strength meter
  const strength = RULES.filter(r => r.test(password)).length;
  const strengthPercent = (strength / RULES.length) * 100;
  const strengthColor =
    strengthPercent === 100 ? 'var(--accent-emerald)' :
    strengthPercent >= 66 ? 'var(--accent-amber, #f59e0b)' :
    'var(--accent-red)';

  return (
    <div className="auth-page">
      {/* Ambient glow effects */}
      <div className="auth-page__bg">
        <div className="auth-bg-glow auth-bg-glow--1" />
        <div className="auth-bg-glow auth-bg-glow--2" />
        <div className="auth-bg-glow auth-bg-glow--3" />
      </div>

      <div className="auth-card auth-card--fixed" key="password">
        {/* Back button */}
        <button className="auth-back-btn" onClick={() => setAuthStep('otp')}>
          <ArrowLeft size={15} /> Back to OTP
        </button>

        {/* Card Header */}
        <div className="auth-card__header">
          <div className="auth-card__logo">
            <div className="auth-card__logo-icon auth-card__logo-icon--lock">
              <Lock size={20} />
            </div>
            <span>Smart Campus</span>
          </div>
          <h2>Create your password</h2>
          <p>Secure your account with a strong password</p>
        </div>

        {/* User preview */}
        {pendingSignup && (
          <div className="auth-user-preview">
            <div className="auth-user-preview__avatar">{pendingSignup.name.charAt(0)}</div>
            <div className="auth-user-preview__info">
              <strong>{pendingSignup.name}</strong>
              <span>{pendingSignup.department}</span>
            </div>
            <div className="auth-user-preview__verified">
              <ShieldCheck size={14} /> Verified
            </div>
          </div>
        )}

        {/* Steps indicator */}
        <div className="auth-steps-strip">
          <div className="auth-step-dot auth-step-dot--done">
            <span>✓</span>
            <small>Details</small>
          </div>
          <div className="auth-step-line auth-step-line--done" />
          <div className="auth-step-dot auth-step-dot--done">
            <span>✓</span>
            <small>OTP</small>
          </div>
          <div className="auth-step-line auth-step-line--done" />
          <div className="auth-step-dot auth-step-dot--active">
            <span>3</span>
            <small>Password</small>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-err">{error}</div>}

          {/* Password field */}
          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
              <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Strength meter */}
          {password.length > 0 && (
            <div className="pwd-strength">
              <div className="pwd-strength__bar">
                <div
                  className="pwd-strength__fill"
                  style={{ width: `${strengthPercent}%`, background: strengthColor }}
                />
              </div>
              <ul className="pwd-strength__rules">
                {RULES.map((rule, i) => {
                  const pass = rule.test(password);
                  return (
                    <li key={i} className={pass ? 'pwd-rule--pass' : 'pwd-rule--fail'}>
                      {pass ? <Check size={12} /> : <X size={12} />}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Confirm password field */}
          <div className="auth-field">
            <label>Confirm Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              {confirmPassword.length > 0 && (
                <span className={`auth-match-icon ${passwordsMatch ? 'auth-match--yes' : 'auth-match--no'}`}>
                  {passwordsMatch ? <Check size={15} /> : <X size={15} />}
                </span>
              )}
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading || !allRulesPass || !passwordsMatch}>
            {loading ? <span className="auth-spinner" /> : <><CheckCircle size={16} /> Create Account</>}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-card__footer">
          <span className="auth-card__terms">By creating an account, you agree to our <a href="#">Terms &amp; Service</a></span>
        </div>
      </div>
    </div>
  );
};

export default SetPasswordPage;
