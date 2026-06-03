import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  X,
} from 'lucide-react';
import AuthSplitShell from '../components/AuthSplitShell';

const RULES = [
  { test: (password: string) => password.length >= 6, label: '6+ characters' },
  { test: (password: string) => /[A-Z]/.test(password), label: 'uppercase' },
  { test: (password: string) => /[0-9]/.test(password), label: 'number' },
];

const SetPasswordPage: React.FC = () => {
  const { completeSignup, setAuthStep } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const allRulesPass = RULES.every((rule) => rule.test(password));
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const showMatchState = confirmPassword.length > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!allRulesPass) {
      setError('Password must include 6+ characters, one uppercase letter, and one number');
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

  return (
    <AuthSplitShell
      mode="password"
      onHome={() => setAuthStep('landing')}
      onSwitch={() => setAuthStep('otp')}
      switchDirection="back"
      switchLabel="Back to OTP"
    >
      <div className="auth-form-card" key="password">
        <div className="auth-form-card__header">
          <span>Final step</span>
          <h2>Set Password</h2>
          <p>Create a secure password for your Smart Campus account.</p>
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
              {showMatchState && (
                <span className={`auth-match-icon ${passwordsMatch ? 'auth-match--yes' : 'auth-match--no'}`}>
                  {passwordsMatch ? <Check size={15} /> : <X size={15} />}
                </span>
              )}
            </div>
          </div>

          <div className="auth-form-card__meta auth-form-card__meta--rules">
            {RULES.map((rule) => {
              const passed = rule.test(password);
              return (
                <span key={rule.label} className={passed ? 'auth-rule--pass' : 'auth-rule--muted'}>
                  {passed ? <Check size={12} /> : <X size={12} />}
                  {rule.label}
                </span>
              );
            })}
          </div>

          <button type="submit" className="auth-submit" disabled={loading || !allRulesPass || !passwordsMatch}>
            {loading ? <span className="auth-spinner" /> : <><ArrowRight size={16} /> Create Account</>}
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
