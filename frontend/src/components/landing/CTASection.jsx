import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from './Icons';

const CTASection = () => {
  return (
    <section className="cta-banner-section">
      <div className="landing-container">
        <div className="cta-banner-card">
          <div className="cta-banner-ambient" />

          <div className="cta-banner-content text-center">
            <div className="cta-pill">
              <Zap size={14} className="icon-accent" />
              <span>Get started in seconds</span>
            </div>

            <h2 className="cta-title">
              Ready to start <span className="gradient-text">talking?</span>
            </h2>

            <p className="cta-subtitle">
              Create your InstantTalk account today and start connecting with colleagues and friends in real time.
            </p>

            <div className="cta-button-group">
              <Link to="/register" className="btn-primary btn-lg shadow-glow">
                <span>Get Started Free</span>
                <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn-outline btn-lg">
                <span>Log In</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
