import React from 'react';
import { ShieldCheck, Lock, Key, Radio, Eye, Users } from './Icons';

const securityFeatures = [
  {
    icon: Key,
    title: 'Email OTP Verification',
    description: 'Protect account creation with one-time password verification sent securely via Nodemailer.',
  },
  {
    icon: ShieldCheck,
    title: 'JWT & Token Rotation',
    description: 'Short-lived JWT access tokens paired with cryptographic refresh-token rotation and JTI tracking.',
  },
  {
    icon: Lock,
    title: 'Google OAuth 2.0',
    description: 'Seamless, trusted single sign-on powered by Google Identity Services and Passport.',
  },
  {
    icon: Eye,
    title: 'Presence & Last Seen Privacy',
    description: 'Fine-grained controls allowing you to hide your online status or last active timestamp at any time.',
  },
  {
    icon: Radio,
    title: 'Read Receipt Controls',
    description: 'Toggle read receipts on or off according to your personal communication preferences.',
  },
  {
    icon: Users,
    title: 'User Blocking & Moderation',
    description: 'Instant blocking and permission management for one-on-one chats and group channels.',
  },
];

const SecuritySection = () => {
  return (
    <section id="security" className="security-section">
      <div className="landing-container">
        {/* Section Header */}
        <div className="section-header text-center">
          <div className="section-badge">SECURITY & PRIVACY</div>
          <h2 className="section-title">
            Your conversations. <span className="gradient-text">Your control.</span>
          </h2>
          <p className="section-subtitle">
            Built with modern authentication architectures, encrypted credentials, and comprehensive privacy controls designed to keep you in charge of your data.
          </p>
        </div>

        {/* Security Grid */}
        <div className="security-grid">
          {securityFeatures.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <div key={idx} className="security-card">
                <div className="security-icon-wrap">
                  <Icon size={22} />
                </div>
                <div className="security-info">
                  <h3 className="security-title">{sec.title}</h3>
                  <p className="security-desc">{sec.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
