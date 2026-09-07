import React from 'react';

const Logo = ({ size = 'md', showText = true, className = '' }) => {
  const dimensions = {
    sm: { icon: 36, font: '18px', gap: '8px' },
    md: { icon: 44, font: '24px', gap: '10px' },
    lg: { icon: 56, font: '30px', gap: '12px' },
  }[size] || { icon: 44, font: '24px', gap: '10px' };

  return (
    <div
      className={`brand-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: dimensions.gap,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: dimensions.icon,
          height: dimensions.icon,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          width={dimensions.icon}
          height={dimensions.icon}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="bgGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            <linearGradient id="bubbleGrad" x1="8" y1="8" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e0e7ff" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Main Outer Bubble */}
          <path
            d="M24 6C13.507 6 5 13.835 5 23.5c0 3.398 1.042 6.574 2.852 9.24L5.2 40.8a1 1 0 0 0 1.256 1.256l8.06-2.65C17.176 40.458 20.485 41 24 41c10.493 0 19-7.835 19-17.5S34.493 6 24 6z"
            fill="url(#bgGrad)"
            filter="url(#glow)"
          />

          {/* Overlapping Front Bubble */}
          <path
            d="M19 14c-6.627 0-12 4.925-12 11 0 2.22.705 4.29 1.93 5.98l-1.378 4.593a0.6 0.6 0 0 0 0.754 0.754l4.593-1.378A11.9 11.9 0 0 0 19 36c6.627 0 12-4.925 12-11s-5.373-11-12-11z"
            fill="url(#bubbleGrad)"
            opacity="0.95"
          />

          {/* Three dots */}
          <circle cx="15" cy="25" r="1.8" fill="#4f46e5" />
          <circle cx="19" cy="25" r="1.8" fill="#4f46e5" />
          <circle cx="23" cy="25" r="1.8" fill="#4f46e5" />
        </svg>
      </div>

      {showText && (
        <span
          style={{
            fontSize: dimensions.font,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.5px',
            fontFamily: "'Inter', sans-serif",
            lineHeight: 1,
          }}
        >
          Instant<span style={{ color: '#818cf8' }}>Talk</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
