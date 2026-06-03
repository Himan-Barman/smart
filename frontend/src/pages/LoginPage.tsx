import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock, Eye, EyeOff, ArrowRight, AtSign,
} from 'lucide-react';
import AuthSplitShell from '../components/AuthSplitShell';

const EMAIL_DOMAIN = '@technoindiaeducation.com';

const LoginPage: React.FC = () => {
  const { login, setAuthStep } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const loginInFlightRef = useRef(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginInFlightRef.current) return;

    setError('');
    if (!username.trim()) { setError('Enter your username'); return; }
    if (!password.trim()) { setError('Enter your password'); return; }

    const normalizedUsername = username.trim().toLowerCase();
    const fullEmail = normalizedUsername.includes('@') ? normalizedUsername : normalizedUsername + EMAIL_DOMAIN;
    loginInFlightRef.current = true;
    setLoading(true);

    const result = await login(fullEmail, password);
    if (!result.success) {
      setError(result.message);
      setLoading(false);
      loginInFlightRef.current = false;
    }
  };

  return (
    <AuthSplitShell
      mode="login"
      onHome={() => setAuthStep('landing')}
      onSwitch={() => setAuthStep('signup')}
    >
      <div className="auth-form-card" key="login">
        <div className="auth-form-card__header">
          <span>University portal</span>
          <h2>Sign In</h2>
          <p>Use your approved Smart Campus account to continue.</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form auth-form--split">
          {error && <div className="auth-err">{error}</div>}

          <div className="auth-field">
            <label>Email or Username</label>
            <div className="auth-input-wrap">
              <AtSign size={16} className="auth-input-icon" />
              <input
                type="text"
                placeholder="Email or Username"
                value={username}
                onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="auth-form-card__meta">
            <span>Domain: {EMAIL_DOMAIN}</span>
            <button type="button" onClick={() => setAuthStep('signup')}>Need access?</button>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <span className="auth-spinner" />
            ) : (
              <>
                Sign In
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-form-card__footer">
          <p>No account? <button onClick={() => setAuthStep('signup')}>Sign Up</button></p>
          <span className="auth-card__terms">By signing in, you agree to our <a href="#">Terms &amp; Service</a></span>
        </div>
      </div>
    </AuthSplitShell>
  );
};

export default LoginPage;
