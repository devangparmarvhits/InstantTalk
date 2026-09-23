import React from 'react';
import { Zap, Video, Lock, Smartphone } from './Icons';

const benefits = [
  {
    icon: Zap,
    title: 'Fast',
    subtitle: 'Socket.IO Real-Time Engine',
    description: 'Instant event propagation, real-time typing indicators, and immediate delivery acknowledgments with minimal network latency.',
  },
  {
    icon: Video,
    title: 'Connected',
    subtitle: 'WebRTC P2P & Mesh',
    description: 'Crisp audio, 1080p video, and seamless 4-participant group calling with dynamic STUN/TURN traversal fallback.',
  },
  {
    icon: Lock,
    title: 'Controlled',
    subtitle: 'Robust Security & Privacy',
    description: 'Complete sovereignty over your visibility, read receipts, active presence, session management, and blocked contacts.',
  },
  {
    icon: Smartphone,
    title: 'Responsive',
    subtitle: 'Universal Device Support',
    description: 'Fluidly adaptive interface custom-tailored for desktop ultra-wides, laptops, tablets, and mobile screens.',
  },
];

const ProductBenefits = () => {
  return (
    <section className="benefits-section">
      <div className="landing-container">
        {/* Section Header */}
        <div className="section-header text-center">
          <div className="section-badge">CORE ARCHITECTURE</div>
          <h2 className="section-title">
            Built for <span className="gradient-text">real-time communication.</span>
          </h2>
          <p className="section-subtitle">
            Engineered from the ground up for speed, reliability, privacy, and seamless cross-platform performance.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="benefits-grid">
          {benefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div key={idx} className="benefit-card">
                <div className="benefit-icon-box">
                  <Icon size={24} />
                </div>
                <div className="benefit-header">
                  <h3 className="benefit-title">{benefit.title}</h3>
                  <span className="benefit-subtitle">{benefit.subtitle}</span>
                </div>
                <p className="benefit-desc">{benefit.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProductBenefits;
