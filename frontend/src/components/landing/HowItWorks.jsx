import React from 'react';
import { ArrowRight, Key, Users, Zap } from './Icons';

const steps = [
  {
    num: '01',
    icon: Key,
    title: 'Create your account',
    description: 'Sign up using email verification with one-time password (OTP) or one-click Google OAuth.',
  },
  {
    num: '02',
    icon: Users,
    title: 'Find your people',
    description: 'Search colleagues and friends by username or email, start 1-on-1 chats, or create dedicated group channels.',
  },
  {
    num: '03',
    icon: Zap,
    title: 'Connect instantly',
    description: 'Exchange real-time messages, make WebRTC voice & video calls, and share your screen with live monitoring.',
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="how-it-works-section">
      <div className="landing-container">
        {/* Section Header */}
        <div className="section-header text-center">
          <div className="section-badge">ONBOARDING</div>
          <h2 className="section-title">
            Simple steps to <span className="gradient-text">get started.</span>
          </h2>
          <p className="section-subtitle">
            Get up and running with InstantTalk in less than two minutes.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="steps-grid">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="step-card">
                <div className="step-card-top">
                  <span className="step-number">{step.num}</span>
                  <div className="step-icon-wrap">
                    <Icon size={20} />
                  </div>
                </div>

                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
