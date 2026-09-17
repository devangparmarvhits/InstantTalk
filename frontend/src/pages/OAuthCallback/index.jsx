import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';

const OAuthCallback = () => {
  const { handleOAuthTokens } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (!accessToken || !refreshToken) {
      setError('Google login failed. Please try again.');
      return;
    }

    handleOAuthTokens(accessToken, refreshToken)
      .then(() => navigate('/chat', { replace: true }))
      .catch(() => {
        localStorage.removeItem('it_token');
        localStorage.removeItem('it_refresh_token');
        setError('Google login failed. Please try again.');
      });
  }, [handleOAuthTokens, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-bg-glow auth-bg-glow-1" />
      <div className="auth-bg-glow auth-bg-glow-2" />

      <div className="auth-card">
        <div className="auth-logo">
          <Logo size="md" showText={true} />
        </div>

        {error ? (
          <>
            <h1 className="auth-title">Oops! 😕</h1>
            <p className="auth-subtitle">{error}</p>
            <button
              type="button"
              className="auth-submit-btn"
              onClick={() => navigate('/login', { replace: true })}
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <h1 className="auth-title">Signing you in...</h1>
            <p className="auth-subtitle">Please wait</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
              <div className="loading-spinner" />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;