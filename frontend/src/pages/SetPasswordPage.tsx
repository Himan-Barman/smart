import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Check,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import AuthSplitShell from '../components/AuthSplitShell';

const RULES = [
  { test: (password: string) => password.length >= 6, label: 'At least 6 characters' },
  { test: (password: string) => /[A-Z]/.test(password), label: 'One uppercase letter' },
  { test: (password: string) => /[0-9]/.test(password), label: 'One number' },
];

const SetPasswordPage: React.FC = () => {
  const { completeSignup, pendingSignup, setAuthStep } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const allRulesPass = RULES.every((rule) => rule.test(password));
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!allRulesPass) {
      setError('Password does not meet requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setTimeout(async () => {
      const result = await completeSignup(password);
      if (!result.success) setError(result.message);
      setLoading(false);
    }, 600);
  };

  const strength = RULES.filter((rule) => rule.test(password)).length;
  const strengthPercent = (strength / RULES.length) * 100;
  const strengthColor =
    strengthPercent === 100 ? 'var(--accent-emerald)' :
    strengthPercent >= 66 ? 'var(--accent-amber, #f59e0b)' :
    'var(--accent-red)';

  return (
    <AuthSplitShell
      mode="password"
      onHome={() => setAuthStep('landing')}
      onSwitch={() => setAuthStep('otp')}
      switchDirection="back"
      switchLabel="Back to OTP"
    >
      <div className="auth-form-card auth-form-card--password" key="password">
        <div className="auth-form-card__header">
          <span>Final step</span>
          <h2>Set Password</h2>
          <p>Create a secure password for your verified Smart Campus account.</p>
        </div>

        {pendingSignup && (
          <div className="auth-user-preview auth-user-preview--split">
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

        <div className="auth-steps-strip auth-steps-strip--split">
          <div className="auth-step-dot auth-step-dot--done">
            <span><Check size={12} /></span>
            <small>Details</small>
          </div>
          <div className="auth-step-line auth-step-line--done" />
          <div className="auth-step-dot auth-step-dot--done">
            <span><Check size={12} /></span>
            <small>OTP</small>
          </div>
          <div className="auth-step-line auth-step-line--done" />
          <div className="auth-step-dot auth-step-dot--active">
            <span>3</span>
            <small>Password</small>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form auth-form--split">
          {error && <div className="auth-err">{error}</div>}

          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                autoFocus
              />
              <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {password.length > 0 && (
            <div className="pwd-strength pwd-strength--split">
              <div className="pwd-strength__bar">
                <div
                  className="pwd-strength__fill"
                  style={{ width: `${strengthPercent}%`, background: strengthColor }}
                />
              </div>
              <ul className="pwd-strength__rules">
                {RULES.map((rule) => {
                  const pass = rule.test(password);
                  return (
                    <li key={rule.label} className={pass ? 'pwd-rule--pass' : 'pwd-rule--fail'}>
                      {pass ? <Check size={12} /> : <X size={12} />}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="auth-field">
            <label>Confirm Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
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

        <div className="auth-form-card__footer">
          <span className="auth-card__terms">By creating an account, you agree to our <a href="#">Terms &amp; Service</a></span>
        </div>
      </div>
    </AuthSplitShell>
  );
};

export default SetPasswordPage;
