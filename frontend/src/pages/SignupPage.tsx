import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap, Mail, Hash,
  User, Briefcase, Send, Sparkles, Loader2,
} from 'lucide-react';

const SignupPage: React.FC = () => {
  const { startSignup, setAuthStep } = useAuth();
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const isAnyLoading = loading || demoLoading;

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

  const handleDemoSignup = async () => {
    if (isAnyLoading) return;
    setError('');
    const demoEmail = role === 'student' ? 'priya@university.edu' : 'meena.i@university.edu';
    const demoId = role === 'student' ? 'CS2024002' : 'EMP002';
    setEmail(demoEmail);
    setIdentifier(demoId);
    setDemoLoading(true);
    // Brief delay for visual feedback of the fill
    await new Promise((resolve) => setTimeout(resolve, 400));
    const r = await startSignup(demoEmail, demoId);
    if (!r.success) setError(r.message);
    setDemoLoading(false);
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
          <button className="auth-tab" onClick={() => setAuthStep('login')}>Sign in</button>
          <button className="auth-tab auth-tab--active">Sign up</button>
        </div>

        {/* Card Header */}
        <div className="auth-card__header">
          <div className="auth-card__logo">
            <div className="auth-card__logo-icon">
              <GraduationCap size={20} />
            </div>
            <span>Smart Campus</span>
          </div>
          <h2>Create an account</h2>
          <p>Register with your university credentials</p>
        </div>

        {/* Role Toggle */}
        <div className="auth-role-toggle">
          <button className={`auth-role-btn ${role === 'student' ? 'auth-role-btn--active' : ''}`} onClick={() => setRole('student')}>
            <User size={15} /> Student
          </button>
          <button className={`auth-role-btn ${role === 'teacher' ? 'auth-role-btn--active' : ''}`} onClick={() => setRole('teacher')}>
            <Briefcase size={15} /> Faculty
          </button>
        </div>

        {/* Demo Pre-fill & Submit */}
        <button
          className={`auth-demo-fill ${demoLoading ? 'auth-demo-fill--loading' : ''}`}
          disabled={isAnyLoading}
          onClick={handleDemoSignup}
        >
          {demoLoading ? (
            <Loader2 size={13} className="auth-demo-fill__spinner" />
          ) : (
            <Sparkles size={13} />
          )}
          {demoLoading ? `Signing up as demo ${role}…` : `Quick demo ${role} signup`}
        </button>

        {/* Form */}
        <form onSubmit={handleSignup} className="auth-form">
          {error && <div className="auth-err">{error}</div>}

          <div className="auth-field">
            <label>Email</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                type="email"
                placeholder="University email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-field">
            <label>{role === 'student' ? 'Enrollment No.' : 'Employee ID'}</label>
            <div className="auth-input-wrap">
              <Hash size={16} className="auth-input-icon" />
              <input
                type="text"
                placeholder={role === 'student' ? 'e.g. CS2024002' : 'e.g. EMP002'}
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={isAnyLoading}>
            {loading ? <span className="auth-spinner" /> : <><Send size={15} /> Verify & Send OTP</>}
          </button>
        </form>

        {/* Steps indicator */}
        <div className="auth-steps-strip">
          <div className="auth-step-dot auth-step-dot--active">
            <span>1</span>
            <small>Details</small>
          </div>
          <div className="auth-step-line" />
          <div className="auth-step-dot">
            <span>2</span>
            <small>OTP</small>
          </div>
          <div className="auth-step-line" />
          <div className="auth-step-dot">
            <span>3</span>
            <small>Password</small>
          </div>
        </div>

        {/* Footer */}
        <div className="auth-card__footer">
          <p>Have an account? <button onClick={() => setAuthStep('login')}>Sign In</button></p>
          <span className="auth-card__terms">By creating an account, you agree to our <a href="#">Terms & Service</a></span>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
