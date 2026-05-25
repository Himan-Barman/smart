import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight,
  Shield, Briefcase, Sparkles, Loader2,
} from 'lucide-react';

const demoAccounts = [
  {
    role: 'Admin',
    email: 'admin@university.edu',
    password: 'admin123',
    Icon: Shield,
  },
  {
    role: 'Teacher',
    email: 'rajesh.k@university.edu',
    password: 'teacher123',
    Icon: Briefcase,
  },
  {
    role: 'Student',
    email: 'rahul@university.edu',
    password: 'student123',
    Icon: GraduationCap,
  },
];

const LoginPage: React.FC = () => {
  const { login, setAuthStep } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const showDemoLogins = import.meta.env.VITE_SHOW_DEMO_LOGINS !== 'false';

  const isAnyLoading = loading || demoLoading !== null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) { setError('Fill all fields'); return; }
    setLoading(true);
    setTimeout(async () => {
      const r = await login(email, password);
      if (!r.success) setError(r.message);
      setLoading(false);
    }, 600);
  };

  const handleDemoLogin = async (role: string, demoEmail: string, demoPassword: string) => {
    if (isAnyLoading) return;
    setError('');
    setEmail(demoEmail);
    setPassword(demoPassword);
    setDemoLoading(role);
    // Brief delay for visual feedback of the fill
    await new Promise((resolve) => setTimeout(resolve, 400));
    const r = await login(demoEmail, demoPassword);
    if (!r.success) setError(r.message);
    setDemoLoading(null);
  };

  return (
    <div className="auth-page">
      {/* Ambient glow effects */}
      <div className="auth-page__bg">
        <div className="auth-bg-glow auth-bg-glow--1" />
        <div className="auth-bg-glow auth-bg-glow--2" />
        <div className="auth-bg-glow auth-bg-glow--3" />
      </div>

      <div className="auth-card">
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

        {/* Demo Quick-Login */}
        {showDemoLogins && (
          <div className="auth-demo-strip">
            <span className="auth-demo-strip__label">Quick demo login:</span>
            {demoAccounts.map(({ role, email: demoEmail, password: demoPassword, Icon }) => (
              <button
                key={role}
                type="button"
                className={`auth-demo-chip ${demoLoading === role ? 'auth-demo-chip--loading' : ''}`}
                disabled={isAnyLoading}
                onClick={() => handleDemoLogin(role, demoEmail, demoPassword)}
              >
                {demoLoading === role ? (
                  <Loader2 size={13} className="auth-demo-chip__spinner" />
                ) : (
                  <Icon size={13} />
                )}
                <span>{role}</span>
              </button>
            ))}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="auth-form">
          {error && <div className="auth-err">{error}</div>}

          <div className="auth-field">
            <label>Email</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
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

          <button type="submit" className="auth-submit" disabled={isAnyLoading}>
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
          <span className="auth-card__terms">By signing in, you agree to our <a href="#">Terms & Service</a></span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
