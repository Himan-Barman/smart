import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Hash, Send, AtSign,
} from 'lucide-react';
import AuthSplitShell from '../components/AuthSplitShell';

const EMAIL_DOMAIN = '@technoindiaeducation.com';

const SignupPage: React.FC = () => {
  const { startSignup, setAuthStep } = useAuth();
  const [username, setUsername] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleIdChange = (val: string) => {
    // Allow only digits, max 12
    const digits = val.replace(/\D/g, '').slice(0, 12);
    setIdentifier(digits);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) { setError('Enter your username'); return; }
    if (identifier.length !== 12) { setError('University ID must be exactly 12 digits'); return; }

    const fullEmail = username.trim().toLowerCase() + EMAIL_DOMAIN;
    setLoading(true);
    setTimeout(async () => {
      const r = await startSignup(fullEmail, identifier);
      if (!r.success) setError(r.message);
      setLoading(false);
    }, 600);
  };

  return (
    <AuthSplitShell
      mode="signup"
      onHome={() => setAuthStep('landing')}
      onSwitch={() => setAuthStep('login')}
    >
      <div className="auth-form-card" key="signup">
        <div className="auth-form-card__header">
          <span>Admin-approved access</span>
          <h2>Sign Up</h2>
          <p>Use the university email and ID added by your administrator.</p>
        </div>

        <form onSubmit={handleSignup} className="auth-form auth-form--split">
          {error && <div className="auth-err">{error}</div>}

          <div className="auth-field">
            <label>University Email</label>
            <div className="auth-input-wrap auth-input-wrap--domain">
              <AtSign size={16} className="auth-input-icon" />
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
              />
              <span className="auth-domain-suffix">{EMAIL_DOMAIN}</span>
            </div>
          </div>

          <div className="auth-field">
            <label>University ID</label>
            <div className="auth-input-wrap">
              <Hash size={16} className="auth-input-icon" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="12-digit university ID"
                value={identifier}
                onChange={e => handleIdChange(e.target.value)}
                maxLength={12}
              />
            </div>
            <span className="auth-field__hint">
              {identifier.length > 0 ? `${identifier.length}/12 digits` : 'Student ID or Employee ID'}
            </span>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : <><Send size={15} /> Verify &amp; Send OTP</>}
          </button>
        </form>

        <div className="auth-form-card__footer">
          <p>Have an account? <button onClick={() => setAuthStep('login')}>Sign In</button></p>
          <span className="auth-card__terms">By creating an account, you agree to our <a href="#">Terms &amp; Service</a></span>
        </div>
      </div>
    </AuthSplitShell>
  );
};

export default SignupPage;
