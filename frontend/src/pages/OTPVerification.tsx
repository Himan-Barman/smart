import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap, ShieldCheck, ArrowLeft, RefreshCw,
  Lock, Eye, EyeOff, CheckCircle,
} from 'lucide-react';

const OTPVerification: React.FC = () => {
  const { verifyOTP, resendOTP, otpEmail, otpCode, setAuthStep, pendingSignup } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
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

  const handleResend = async () => { await resendOTP(); setResendTimer(30); setCanResend(false); setError(''); };

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
            <h1>Verify<br /><span>Identity</span></h1>
            <p>OTP sent to your email.</p>
          </div>

          {pendingSignup && (
            <div className="auth-left__profile">
              <div className="auth-left__avatar">{pendingSignup.name.charAt(0)}</div>
              <div>
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

          <div className="auth-left__bottom">© 2026 Smart Campus</div>
        </div>

        {/* Right — OTP + Password */}
        <div className="auth-right">
          <div className="auth-right__inner">
            <button className="auth-back" onClick={() => setAuthStep('signup')}>
              <ArrowLeft size={15} /> Signup
            </button>

            <div className="auth-form-head">
              <div className="auth-otp-badge"><ShieldCheck size={20} /></div>
              <div>
                <h2>Enter OTP</h2>
                <p className="auth-masked">{masked}</p>
              </div>
            </div>

            {/* Demo OTP */}
            <div className="auth-otp-hint">
              <span>🔑</span>
              <code>{otpCode}</code>
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
                    <RefreshCw size={13} /> Resend
                  </button>
                ) : (
                  <span className="auth-resend-wait">Resend in <b>{resendTimer}s</b></span>
                )}
              </div>

              <div className="auth-input-group">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <div className="auth-input-group">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : <><CheckCircle size={16} /> Create Account</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
