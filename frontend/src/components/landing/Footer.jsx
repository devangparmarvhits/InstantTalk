import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../common/Logo';

const Footer = () => {
  const apiDocsUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api-docs`;

  return (
    <footer className="landing-footer">
      <div className="landing-container">
        <div className="footer-top">
          {/* Brand Info */}
          <div className="footer-brand-col">
            <Link to="/" className="footer-logo">
              <Logo size="sm" showText={true} />
            </Link>
            <p className="footer-tagline">
              Real-time communication made simple. High-performance messaging, WebRTC calling, and live screen sharing in one unified experience.
            </p>
            <div className="footer-status">
              <span className="pulse-dot green" />
              <span>All Systems Operational</span>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="footer-nav-grid">
            <div className="footer-col">
              <h4 className="footer-heading">Product</h4>
              <ul className="footer-list">
                <li><a href="#features">Features</a></li>
                <li><a href="#showcase">Messaging</a></li>
                <li><a href="#calls">Voice & Video</a></li>
                <li><a href="#screenshare">Screen Share</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-heading">Security</h4>
              <ul className="footer-list">
                <li><a href="#security">Security Overview</a></li>
                <li><a href="#security">JWT & Refresh Tokens</a></li>
                <li><a href="#security">Privacy Settings</a></li>
                <li><a href="#security">WebRTC Encryption</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-heading">Account</h4>
              <ul className="footer-list">
                <li><Link to="/login">Log In</Link></li>
                <li><Link to="/register">Create Account</Link></li>
                <li><Link to="/verify-email">Verify Email</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-heading">Resources</h4>
              <ul className="footer-list">
                <li>
                  <a href={apiDocsUrl} target="_blank" rel="noopener noreferrer">
                    API Documentation
                  </a>
                </li>
                <li><a href="#features">Socket.IO Specs</a></li>
                <li><a href="#features">WebRTC Protocols</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; 2026 InstantTalk. All rights reserved.
          </p>
          <div className="footer-bottom-links">
            <a href="#security">Privacy</a>
            <span>•</span>
            <a href="#security">Terms</a>
            <span>•</span>
            <a href="#security">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
