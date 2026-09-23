import React from 'react';
import {
  MessageSquare,
  PhoneCall,
  Users,
  Monitor,
  ShieldCheck,
  Radio,
  Paperclip,
  Lock,
} from './Icons';

const featuresData = [
  {
    icon: MessageSquare,
    title: 'Real-Time Messaging',
    description: 'Chat instantly with delivery and read receipts, typing indicators, replies, reactions and mentions.',
    tag: 'Socket.IO',
    glowColor: 'rgba(108, 99, 255, 0.15)',
  },
  {
    icon: PhoneCall,
    title: 'Voice & Video Calls',
    description: 'Start high-quality voice and video calls using WebRTC with low-latency media streams.',
    tag: 'WebRTC P2P',
    glowColor: 'rgba(56, 189, 248, 0.15)',
  },
  {
    icon: Users,
    title: 'Group Calls',
    description: 'Connect with up to 4 participants in collaborative group audio and video calls.',
    tag: 'Mesh Mesh Call',
    glowColor: 'rgba(168, 85, 247, 0.15)',
  },
  {
    icon: Monitor,
    title: 'Screen Sharing',
    description: 'Share your desktop or window and let others follow along with live monitoring.',
    tag: 'Live Stream',
    glowColor: 'rgba(244, 63, 94, 0.15)',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Authentication',
    description: 'Email OTP verification, JWT authentication, refresh-token rotation and Google OAuth.',
    tag: 'Zero Compromise',
    glowColor: 'rgba(34, 197, 94, 0.15)',
  },
  {
    icon: Radio,
    title: 'Presence & Status',
    description: "See who's online in real time and easily manage your last-seen privacy preferences.",
    tag: 'Live State',
    glowColor: 'rgba(234, 179, 8, 0.15)',
  },
  {
    icon: Paperclip,
    title: 'File & Image Sharing',
    description: 'Share documents, images, and attachments directly inside your one-on-one and group chats.',
    tag: 'Rich Media',
    glowColor: 'rgba(236, 72, 153, 0.15)',
  },
  {
    icon: Lock,
    title: 'Privacy Controls',
    description: 'Manage online status, read receipts, profile visibility, notifications, and blocked users.',
    tag: 'Granular Privacy',
    glowColor: 'rgba(99, 102, 241, 0.15)',
  },
];

const Features = () => {
  return (
    <section id="features" className="features-section">
      <div className="landing-container">
        {/* Section Header */}
        <div className="section-header text-center">
          <div className="section-badge">CAPABILITIES</div>
          <h2 className="section-title">
            Everything you need to <span className="gradient-text">stay connected.</span>
          </h2>
          <p className="section-subtitle">
            InstantTalk brings messaging, calling, and real-time collaboration together in one modern communication platform.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="features-grid">
          {featuresData.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="feature-card"
                style={{ '--card-glow': feat.glowColor }}
              >
                <div className="feature-card-top">
                  <div className="feature-icon-wrapper">
                    <Icon size={24} />
                  </div>
                  <span className="feature-tag">{feat.tag}</span>
                </div>

                <h3 className="feature-title">{feat.title}</h3>
                <p className="feature-desc">{feat.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
