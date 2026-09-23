import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Video } from './Icons';
import HeroProductPreview from './HeroProductPreview';

const Hero = () => {
  return (
    <section className="hero-section">
      <div className="hero-mesh-background" />

      <div className="landing-container hero-container">
        {/* Hero Text Content */}
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-pill">NEW RELEASE</span>
            <span className="badge-text">WebRTC Group Calling & Live Screen Sharing</span>
          </div>

          <h1 className="hero-headline">
            Connect instantly.<br />
            <span className="gradient-text">Communicate effortlessly.</span>
          </h1>

          <p className="hero-subheadline">
            A modern real-time communication platform for messaging, calling, sharing and staying connected. Powered by WebRTC and Socket.IO.
          </p>

          <div className="hero-cta-group">
            <Link to="/register" className="btn-primary btn-lg shadow-glow">
              <span>Get Started Free</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn-outline btn-lg">
              <span>Log In</span>
            </Link>
          </div>

          <div className="hero-trust-row">
            <div className="trust-item">
              <Zap size={15} className="trust-icon" />
              <span>Real-time messaging</span>
            </div>
            <span className="trust-sep">•</span>
            <div className="trust-item">
              <Video size={15} className="trust-icon" />
              <span>Voice & video calls</span>
            </div>
            <span className="trust-sep">•</span>
            <div className="trust-item">
              <ShieldCheck size={15} className="trust-icon" />
              <span>Secure authentication</span>
            </div>
          </div>
        </div>

        {/* Hero Visual Preview */}
        <div className="hero-visual">
          <HeroProductPreview />
        </div>
      </div>
    </section>
  );
};

export default Hero;
