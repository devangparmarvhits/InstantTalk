import React from 'react';

const BackgroundGlows = () => {
  return (
    <div className="landing-background-fx" aria-hidden="true">
      {/* Animated Aurora Light Orbs */}
      <div className="aurora-orb orb-1" />
      <div className="aurora-orb orb-2" />
      <div className="aurora-orb orb-3" />
      <div className="aurora-orb orb-4" />

      {/* Cyber Grid Overlay */}
      <div className="cyber-grid-pattern" />

      {/* Subtle Ambient Light Sweep */}
      <div className="ambient-light-sweep" />
    </div>
  );
};

export default BackgroundGlows;
