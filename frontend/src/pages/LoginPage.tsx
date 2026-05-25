import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap, Lock, Eye, EyeOff, ArrowRight,
  AtSign, Sparkles,
} from 'lucide-react';

const EMAIL_DOMAIN = '@technoindiaeducation.com';

const LoginPage: React.FC = () => {
  const { login, setAuthStep } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) { setError('Enter your username'); return; }
    if (!password.trim()) { setError('Enter your password'); return; }

    const fullEmail = username.trim().toLowerCase() + EMAIL_DOMAIN;
    setLoading(true);
    setTimeout(async () => {
      const r = await login(fullEmail, password);
      if (!r.success) setError(r.message);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="auth-page">
      {/* Ambient glow effects */}
      <div className="auth-page__bg">
        <div className="auth-bg-glow auth-bg-glow--1" />
        <div className="auth-bg-glow auth-bg-glow--2" />
        <div className="auth-bg-glow auth-bg-glow--3" />
      </div>

      <div className="auth-card auth-card--fixed" key="login">
        {/* Tab Navigation */}
        <div className="auth-tabs">
          <button className="auth-tab auth-tab--active">Sign in</button>
          <button className="auth-tab" onClick={() => setAuthStep('signup')}>Sign up</button>
        </div>

        {/* Card Header */}
        <div className="auth-card__header">
          <div className="auth-card__logo">
            <div className="auth-card__logo-icon">
              <GraduationCap size={20} />
            </div>
            <span>Smart Campus</span>
          </div>
          <h2>Welcome back</h2>
          <p>Sign in to continue to your dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="auth-form">
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
                autoComplete="username"
              />
              <span className="auth-domain-suffix">{EMAIL_DOMAIN}</span>
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

        {/* Footer */}
        <div className="auth-card__footer">
          <p>No account? <button onClick={() => setAuthStep('signup')}><Sparkles size={12} /> Sign Up</button></p>
          <span className="auth-card__terms">By signing in, you agree to our <a href="#">Terms &amp; Service</a></span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
