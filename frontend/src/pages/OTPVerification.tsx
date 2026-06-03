import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  Check,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import AuthSplitShell from '../components/AuthSplitShell';

const OTP_LENGTH = 6;

const OTPVerification: React.FC = () => {
  const { verifyOTPOnly, resendOTP, otpEmail, setAuthStep, pendingSignup } = useAuth();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }

    setCanResend(true);
    return undefined;
  }, [resendTimer]);

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').split('').slice(0, OTP_LENGTH);
      const next = [...otp];
      digits.forEach((digit, offset) => {
        if (index + offset < OTP_LENGTH) {
          next[index + offset] = digit;
        }
      });
      setOtp(next);
      inputRefs.current[Math.min(index + digits.length, OTP_LENGTH - 1)]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const next = [...otp];
    next[index] = value;
    setOtp(next);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKey = (index: number, event: React.KeyboardEvent) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    await resendOTP();
    setResendTimer(60);
    setCanResend(false);
    setError('');
  };

  const handleVerify = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setTimeout(async () => {
      const result = await verifyOTPOnly(code);
      if (!result.success) setError(result.message);
      setLoading(false);
    }, 600);
  };

  const masked = otpEmail
    ? otpEmail.replace(/(.{2})(.*)(@)/, (_match, prefix, middle, suffix) => `${prefix}${'*'.repeat(Math.min(middle.length, 4))}${suffix}`)
    : 'your university email';

  return (
    <AuthSplitShell
      mode="otp"
      onHome={() => setAuthStep('landing')}
      onSwitch={() => setAuthStep('signup')}
      switchDirection="back"
      switchLabel="Back to Sign Up"
    >
      <div className="auth-form-card auth-form-card--otp" key="otp">
        <div className="auth-form-card__header">
          <span>Email verification</span>
          <h2>Verify OTP</h2>
          <p>Enter the 6-digit code sent to <strong>{masked}</strong>.</p>
        </div>

        {pendingSignup && (
          <div className="auth-user-preview auth-user-preview--split">
            <div className="auth-user-preview__avatar">{pendingSignup.name.charAt(0)}</div>
            <div className="auth-user-preview__info">
              <strong>{pendingSignup.name}</strong>
              <span>
                {pendingSignup.role === 'student'
                  ? `${pendingSignup.course} - Sem ${pendingSignup.semester}`
                  : pendingSignup.subjects?.join(', ')}
              </span>
              <span>{pendingSignup.department}</span>
            </div>
          </div>
        )}

        <div className="auth-steps-strip auth-steps-strip--split">
          <div className="auth-step-dot auth-step-dot--done">
            <span><Check size={12} /></span>
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

        <div className="auth-otp-hint auth-otp-hint--split">
          <ShieldCheck size={16} />
          <span>Check your email inbox for the verification code.</span>
        </div>

        <form onSubmit={handleVerify} className="auth-form auth-form--split">
          {error && <div className="auth-err">{error}</div>}

          <div className="auth-otp-grid auth-otp-grid--split">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(element) => { inputRefs.current[index] = element; }}
                type="text"
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                value={digit}
                onChange={(event) => handleOTPChange(index, event.target.value)}
                onKeyDown={(event) => handleKey(index, event)}
                className="auth-otp-cell"
                autoFocus={index === 0}
                aria-label={`OTP digit ${index + 1}`}
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

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : <><ArrowRight size={16} /> Verify &amp; Continue</>}
          </button>
        </form>
      </div>
    </AuthSplitShell>
  );
};

export default OTPVerification;
