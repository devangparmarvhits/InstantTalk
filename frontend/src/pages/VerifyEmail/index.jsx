import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { verifyOtp, resendOtp } from '../../services/auth.service';
import Logo from '../../components/common/Logo';

const OTP_LENGTH = 6;

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateUser } = useContext(AuthContext);

  const email = searchParams.get('email') || user?.email || '';

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(0, 1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
    setError('');
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!digits) return;
    const next = digits.split('').concat(Array(OTP_LENGTH).fill('')).slice(0, OTP_LENGTH);
    setOtp(next);
    inputsRef.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
    setError('');
  };

  const code = otp.join('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email is missing. Please go back and create an account again.');
      return;
    }
    if (code.length !== OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit code sent to your email.`);
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp(email, code);
      setVerified(true);
      const verifiedUser = res?.data?.user || (user ? { ...user, emailVerified: true } : null);
      if (verifiedUser && updateUser) {
        updateUser(verifiedUser);
      }
      setTimeout(() => navigate('/chat'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    setResendMsg('');
    setResending(true);
    try {
      await resendOtp();
      setResendMsg('A new code has been sent to your email.');
      setCooldown(30);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-glow auth-bg-glow-1" />
      <div className="auth-bg-glow auth-bg-glow-2" />

      <div className="auth-card">
        <div className="auth-logo">
          <Logo size="md" showText={true} />
        </div>

        <h1 className="auth-title">
          {verified ? 'Email verified!' : 'Verify your email'}
        </h1>
        <p className="auth-subtitle">
          {verified ? (
            'Welcome aboard. Redirecting you to InstantTalk...'
          ) : email ? (
            <>
              We sent a 6-digit code to <span style={{ color: '#c7d2fe', fontWeight: 600 }}>{email}</span>
            </>
          ) : (
            'Enter the 6-digit code sent to your email'
          )}
        </p>

        {error && <div className="auth-error-alert">{error}</div>}

        {verified ? (
          <div style={{ textAlign: 'center' }}>
            <div className="auth-verified-check">✓</div>
            <Link to="/chat" className="auth-submit-btn" style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}>
              Continue to Chat
            </Link>
          </div>
        ) : (
          <>
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <div className="otp-inputs">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputsRef.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={2}
                      className={`otp-input ${digit ? 'filled' : ''}`}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      aria-label={`Digit ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <button
                id="verify-otp-submit"
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <div className="loading-spinner" />
                    Verifying...
                  </span>
                ) : (
                  'Verify Email'
                )}
              </button>
            </form>

            <div className="auth-switch" style={{ marginTop: 12 }}>
              Didn't get the code?{' '}
              <button
                type="button"
                className="link-btn"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
              >
                {resending
                  ? 'Sending...'
                  : cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : 'Resend code'}
              </button>
            </div>

            {resendMsg && <div className="auth-info-alert">{resendMsg}</div>}
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;