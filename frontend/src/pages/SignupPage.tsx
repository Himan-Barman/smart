import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap, Mail, Hash, ArrowLeft,
  User, Briefcase, Send,
} from 'lucide-react';

const SignupPage: React.FC = () => {
  const { startSignup, setAuthStep } = useAuth();
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !identifier.trim()) { setError('Fill all fields'); return; }
    setLoading(true);
    setTimeout(async () => {
      const r = await startSignup(email, identifier);
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
            <h1>Join<br /><span>Campus</span></h1>
            <p>Register with your university credentials.</p>
          </div>

          <div className="auth-left__steps">
            <div className="auth-step">
              <div className="auth-step__num">1</div>
              <span>Enter Email & ID</span>
            </div>
            <div className="auth-step">
              <div className="auth-step__num">2</div>
              <span>Verify via OTP</span>
            </div>
            <div className="auth-step">
              <div className="auth-step__num">3</div>
              <span>Set Password</span>
            </div>
          </div>

          <div className="auth-left__bottom">© 2026 Smart Campus</div>
        </div>

        {/* Right — Form */}
        <div className="auth-right">
          <div className="auth-right__inner">
            <button className="auth-back" onClick={() => setAuthStep('login')}>
              <ArrowLeft size={15} /> Login
            </button>

            <div className="auth-form-head">
              <h2>Sign Up</h2>
              <button className="auth-demo-btn" onClick={() => {
                if (role === 'student') { setEmail('priya@university.edu'); setIdentifier('CS2024002'); }
                else { setEmail('meena.i@university.edu'); setIdentifier('EMP002'); }
              }}>
                Demo ↗
              </button>
            </div>

            {/* Role Toggle */}
            <div className="auth-toggle">
              <button className={role === 'student' ? 'active' : ''} onClick={() => setRole('student')}>
                <User size={15} /> Student
              </button>
              <button className={role === 'teacher' ? 'active' : ''} onClick={() => setRole('teacher')}>
                <Briefcase size={15} /> Faculty
              </button>
            </div>

            <form onSubmit={handleSignup} className="auth-form">
              {error && <div className="auth-err">{error}</div>}

              <div className="auth-input-group">
                <Mail size={16} className="auth-input-icon" />
                <input
                  type="email"
                  placeholder="University email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="auth-input-group">
                <Hash size={16} className="auth-input-icon" />
                <input
                  type="text"
                  placeholder={role === 'student' ? 'Enrollment No.' : 'Employee ID'}
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                />
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : <><Send size={16} /> Verify & Send OTP</>}
              </button>
            </form>

            <div className="auth-footer-link">
              <span>Have an account?</span>
              <button onClick={() => setAuthStep('login')}>Sign In</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
