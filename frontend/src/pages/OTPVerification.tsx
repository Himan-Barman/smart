import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import AuthSplitShell from '../components/AuthSplitShell';

const OTP_LENGTH = 6;

const OTPVerification: React.FC = () => {
  const { verifyOTPOnly, resendOTP, otpEmail, setAuthStep } = useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }

    setCanResend(true);
    return undefined;
  }, [resendTimer]);

  const handleOTPChange = (value: string) => {
    setOtp(value.replace(/\D/g, '').slice(0, OTP_LENGTH));
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

    if (otp.length !== OTP_LENGTH) {
      setError('Enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setTimeout(async () => {
      const result = await verifyOTPOnly(otp);
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
      <div className="auth-form-card" key="otp">
        <div className="auth-form-card__header">
          <span>Email verification</span>
          <h2>Verify OTP</h2>
          <p>Enter the 6-digit code sent to <strong>{masked}</strong>.</p>
        </div>

        <form onSubmit={handleVerify} className="auth-form auth-form--split">
          {error && <div className="auth-err">{error}</div>}

          <div className="auth-field">
            <label>Verification Code</label>
            <div className="auth-input-wrap">
              <ShieldCheck size={16} className="auth-input-icon" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="6-digit verification code"
                value={otp}
                onChange={(event) => handleOTPChange(event.target.value)}
                maxLength={OTP_LENGTH}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>
            <span className="auth-field__hint">
              {otp.length > 0 ? `${otp.length}/6 digits` : 'Check your university email inbox'}
            </span>
          </div>

          <div className="auth-form-card__meta">
            {canResend ? (
              <button type="button" onClick={handleResend}>
                <RefreshCw size={13} /> Resend OTP
              </button>
            ) : (
              <span>Resend in {resendTimer}s</span>
            )}
            <button type="button" onClick={() => setAuthStep('signup')}>Change email</button>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : <><ArrowRight size={16} /> Verify &amp; Continue</>}
          </button>
        </form>

        <div className="auth-form-card__footer">
          <p>Wrong account? <button onClick={() => setAuthStep('signup')}>Sign Up again</button></p>
          <span className="auth-card__terms">By verifying, you agree to our <a href="#">Terms &amp; Service</a></span>
        </div>
      </div>
    </AuthSplitShell>
  );
};

export default OTPVerification;
