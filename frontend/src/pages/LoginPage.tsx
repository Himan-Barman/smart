import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight,
  UserPlus, QrCode, Shield, BarChart3, BookOpen, Briefcase,
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
  const showDemoLogins = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_LOGINS === 'true';

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

  return (
    <div className="auth-page">
      <div className="auth-page__bg">
        <div className="auth-bg-orb auth-bg-orb--1" />
        <div className="auth-bg-orb auth-bg-orb--2" />
      </div>

      <div className="auth-box">
        {/* Left — Dark brand */}
        <div className="auth-left">
          <div className="auth-left__top">
            <div className="auth-logo">
              <div className="auth-logo__icon"><GraduationCap size={26} /></div>
              <span>Smart Campus</span>
            </div>
          </div>

          <div className="auth-left__center">
            <h1>Welcome<br /><span>Back</span></h1>
            <p>Your university, one login away.</p>
          </div>

          <div className="auth-left__features">
            <div className="auth-pill"><QrCode size={14} /> QR Attendance</div>
            <div className="auth-pill"><Shield size={14} /> Secure</div>
            <div className="auth-pill"><BarChart3 size={14} /> Analytics</div>
            <div className="auth-pill"><BookOpen size={14} /> Skills</div>
          </div>

          <div className="auth-left__bottom">© 2026 Smart Campus</div>
        </div>

        {/* Right — Form */}
        <div className="auth-right">
          <div className="auth-right__inner">
            <div className="auth-form-head">
              <h2>Sign In</h2>
            </div>

            {showDemoLogins && (
              <div className="auth-demo-grid">
                {demoAccounts.map(({ role, email: demoEmail, password: demoPassword, Icon }) => (
                  <button
                    key={role}
                    type="button"
                    className="auth-demo-card"
                    onClick={() => {
                      setEmail(demoEmail);
                      setPassword(demoPassword);
                    }}
                  >
                    <Icon size={15} />
                    <span>{role}</span>
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleLogin} className="auth-form">
              {error && <div className="auth-err">{error}</div>}

              <div className="auth-input-group">
                <Mail size={16} className="auth-input-icon" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="auth-input-group">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : <><ArrowRight size={18} /> Sign In</>}
              </button>
            </form>

            <div className="auth-footer-link">
              <span>No account?</span>
              <button onClick={() => setAuthStep('signup')}>
                <UserPlus size={14} /> Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
