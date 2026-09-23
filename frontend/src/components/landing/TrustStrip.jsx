import React from 'react';
import { Zap, Video, ShieldCheck, Radio, Key } from './Icons';

const techItems = [
  { icon: Zap, title: 'REAL-TIME MESSAGING', desc: 'Socket.IO Driven' },
  { icon: Video, title: 'VOICE & VIDEO CALLING', desc: 'WebRTC P2P & Mesh' },
  { icon: Radio, title: 'LIVE STREAM MONITORING', desc: 'Screen Broadcast' },
  { icon: Key, title: 'GOOGLE AUTH & OTP', desc: 'Nodemailer Verified' },
  { icon: ShieldCheck, title: 'SECURE AUTHENTICATION', desc: 'JWT & Token Rotation' },
];

const TrustStrip = () => {
  return (
    <section className="trust-strip-section">
      <div className="landing-container">
        <div className="trust-strip-grid">
          {techItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="trust-strip-card">
                <div className="trust-strip-icon-box">
                  <Icon size={18} />
                </div>
                <div className="trust-strip-text">
                  <span className="trust-strip-title">{item.title}</span>
                  <span className="trust-strip-desc">{item.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustStrip;
