import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, ArrowLeft, RefreshCw,
  Lock, Eye, EyeOff, CheckCircle,
} from 'lucide-react';

const OTPVerification: React.FC = () => {
  const { verifyOTP, resendOTP, otpEmail, setAuthStep, pendingSignup } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(p => p - 1), 1000);
      return () => clearTimeout(t);
    } else { setCanResend(true); }
  }, [resendTimer]);

  const handleOTPChange = (i: number, val: string) => {
    if (val.length > 1) {
      const digits = val.replace(/\D/g, '').split('').slice(0, 6);
      const n = [...otp];
      digits.forEach((d, j) => { if (i + j < 6) n[i + j] = d; });
      setOtp(n);
      inputRefs.current[Math.min(i + digits.length, 5)]?.focus();
      return;
    }
    if (!/^\d*$/.test(val)) return;
    const n = [...otp]; n[i] = val; setOtp(n);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handleResend = async () => { await resendOTP(); setResendTimer(60); setCanResend(false); setError(''); };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter complete OTP'); return; }
    if (password.length < 6) { setError('Min. 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords mismatch'); return; }
    setLoading(true);
    setTimeout(async () => {
      const r = await verifyOTP(code, password);
      if (!r.success) setError(r.message);
      setLoading(false);
    }, 600);
  };

  const masked = otpEmail.replace(/(.{2})(.*)(@)/, (_, a, b, c) => a + '•'.repeat(Math.min(b.length, 4)) + c);

  return (
    <div className="auth-page">
      {/* Ambient glow effects */}
      <div className="auth-page__bg">
        <div className="auth-bg-glow auth-bg-glow--1" />
        <div className="auth-bg-glow auth-bg-glow--2" />
        <div className="auth-bg-glow auth-bg-glow--3" />
      </div>

      <div className="auth-card auth-card--wide">
        {/* Back button */}
        <button className="auth-back-btn" onClick={() => setAuthStep('signup')}>
          <ArrowLeft size={15} /> Back to signup
        </button>

        {/* Card Header */}
        <div className="auth-card__header">
          <div className="auth-card__logo">
            <div className="auth-card__logo-icon auth-card__logo-icon--shield">
              <ShieldCheck size={20} />
            </div>
            <span>Smart Campus</span>
          </div>
          <h2>Verify identity</h2>
          <p>OTP sent to <strong>{masked}</strong></p>
        </div>

        {/* User profile preview */}
        {pendingSignup && (
          <div className="auth-user-preview">
            <div className="auth-user-preview__avatar">{pendingSignup.name.charAt(0)}</div>
            <div className="auth-user-preview__info">
              <strong>{pendingSignup.name}</strong>
              <span>
                {pendingSignup.role === 'student'
                  ? `${pendingSignup.course} · Sem ${pendingSignup.semester}`
                  : pendingSignup.subjects?.join(', ')}
              </span>
              <span>{pendingSignup.department}</span>
            </div>
          </div>
        )}

        {/* Email notice */}
        <div className="auth-otp-hint">
          <span>📧</span>
          <span>Check your email for the 6-digit verification code</span>
        </div>

        {/* Steps indicator */}
        <div className="auth-steps-strip">
          <div className="auth-step-dot auth-step-dot--done">
            <span>✓</span>
            <small>Details</small>
          </div>
          <div className="auth-step-line auth-step-line--done" />
          <div className="auth-step-dot auth-step-dot--active">
            <span>2</span>
            <small>OTP</small>
          </div>
          <div className="auth-step-line" />
          <div className="auth-step-dot">
            <span>3</span>
            <small>Password</small>
          </div>
        </div>

        <form onSubmit={handleVerify} className="auth-form">
          {error && <div className="auth-err">{error}</div>}

          <div className="auth-otp-grid">
            {otp.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={d}
                onChange={e => handleOTPChange(i, e.target.value)}
                onKeyDown={e => handleKey(i, e)}
                className="auth-otp-cell"
                autoFocus={i === 0}
              />
            ))}
          </div>

          <div className="auth-resend-row">
            {canResend ? (
              <button type="button" className="auth-resend" onClick={handleResend}>
                <RefreshCw size={13} /> Resend OTP
              </button>
            ) : (
              <span className="auth-resend-wait">Resend in <b>{resendTimer}s</b></span>
            )}
          </div>

          <div className="auth-field">
            <label>Create password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label>Confirm password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : <><CheckCircle size={16} /> Create Account</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OTPVerification;
