import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import Sidebar from '../../components/common/Sidebar';
import Avatar from '../../components/user/Avatar';
import { useLiveMonitoring, formatDuration } from '../../context/LiveMonitoringContext';
import { formatDistanceToNow } from 'date-fns';

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, viewBox = '0 0 24 24', ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const MonitorIcon   = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);
const UsersIcon     = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const StopIcon      = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);
const FullscreenIcon = ({ exit = false, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {exit ? (
      <><polyline points="8 3 8 8 3 8" /><polyline points="16 21 16 16 21 16" /><line x1="8" y1="8" x2="3" y2="3" /><line x1="16" y1="16" x2="21" y2="21" /></>
    ) : (
      <><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></>
    )}
  </svg>
);
const XIcon         = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const SearchIcon    = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const RefreshIcon   = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const WifiOffIcon   = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);
const ShieldIcon    = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const TimerIcon     = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const SignalIcon     = ({ size = 16, quality = 'good' }) => {
  const colors = { good: '#22c55e', medium: '#f59e0b', poor: '#ef4444', unknown: '#6b7280' };
  const c = colors[quality] || colors.unknown;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 20 2 14" /><polyline points="7 20 7 10" /><polyline points="12 20 12 4" /><polyline points="17 20 17 8" /><polyline points="22 20 22 12" />
    </svg>
  );
};
const EyeIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

// ─── Shared sub-components ────────────────────────────────────────────────────

/** Animated pulsing LIVE badge */
const LiveBadge = ({ small = false }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: small ? 4 : 6,
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.4)',
    borderRadius: '999px',
    padding: small ? '2px 7px' : '3px 10px',
    color: '#ef4444',
    fontSize: small ? 10 : 11,
    fontWeight: 800,
    letterSpacing: '0.8px',
  }}>
    <span style={{
      width: small ? 5 : 7,
      height: small ? 5 : 7,
      borderRadius: '50%',
      background: '#ef4444',
      boxShadow: '0 0 0 0 rgba(239,68,68,0.7)',
      animation: 'pulse-live 1.5s infinite',
    }} />
    LIVE
  </span>
);

/** Status badge (Connecting / Live / Disconnected) */
const ConnectionBadge = ({ status, quality }) => {
  const map = {
    connected:    { label: 'Live',         color: '#22c55e' },
    connecting:   { label: 'Connecting',   color: '#f59e0b' },
    disconnected: { label: 'Disconnected', color: '#6b7280' },
    failed:       { label: 'Failed',       color: '#ef4444' },
  };
  const { label, color } = map[status] || map.disconnected;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color, fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: status === 'connected' ? `0 0 8px ${color}` : 'none' }} />
      {label}
    </span>
  );
};

/** Quality label */
const QualityLabel = ({ quality }) => {
  const map = { good: ['Good', '#22c55e'], medium: ['Medium', '#f59e0b'], poor: ['Poor', '#ef4444'], unknown: ['—', '#6b7280'] };
  const [label, color] = map[quality] || map.unknown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color }}>
      <SignalIcon size={14} quality={quality} />
      {label}
    </span>
  );
};

/** Loader spinner */
const Spinner = ({ size = 20, color = 'var(--accent-primary)' }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    border: `2.5px solid transparent`,
    borderTopColor: color,
    animation: 'spin 0.8s linear infinite',
  }} />
);

/** Empty state card */
const EmptyState = ({ icon: IconCmp, title, subtitle, action, onAction }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 14, padding: '48px 24px', textAlign: 'center',
  }}>
    <div style={{
      width: 64, height: 64, borderRadius: '50%',
      background: 'linear-gradient(135deg, rgba(108,99,255,0.2), rgba(167,139,250,0.1))',
      border: '1px solid rgba(108,99,255,0.25)',
      display: 'grid', placeItems: 'center',
      color: 'var(--accent-primary)',
      boxShadow: '0 0 30px rgba(108,99,255,0.15)',
    }}>
      <IconCmp size={28} />
    </div>
    <div style={{ maxWidth: 300 }}>
      <h3 style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{subtitle}</p>
    </div>
    {action && onAction && (
      <button onClick={onAction} style={{
        marginTop: 4, padding: '10px 22px',
        background: 'linear-gradient(135deg, var(--accent-primary), #a78bfa)',
        color: '#fff', border: 'none', borderRadius: '999px',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(108,99,255,0.4)',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(108,99,255,0.55)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,99,255,0.4)'; }}
      >
        {action}
      </button>
    )}
  </div>
);

// ─── Glass card wrapper ───────────────────────────────────────────────────────
const GlassCard = ({ children, style = {}, ...rest }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    ...style,
  }} {...rest}>
    {children}
  </div>
);

// ─── Stat chip ────────────────────────────────────────────────────────────────
const StatChip = ({ icon: IconCmp, label, value, accent = false }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px',
    background: accent ? 'rgba(108,99,255,0.12)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${accent ? 'rgba(108,99,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
    borderRadius: 10,
    minWidth: 0,
  }}>
    <span style={{ color: accent ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
      <IconCmp size={14} />
    </span>
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{value}</div>
    </div>
  </div>
);

// ─── Main LiveMonitoring page ─────────────────────────────────────────────────
const LiveMonitoring = () => {
  const {
    user, mode, streamer, viewerInfo, viewerList, liveUsers,
    connectionStatus, connectionQuality, sessionDuration,
    error, sharingState,
    startSharing, stopSharing, startWatching, stopWatching,
    refreshLiveUsers, localStreamRef, pcRef,
  } = useLiveMonitoring();

  const [fullscreen, setFullscreen] = useState(false);
  const panelRef = useRef(null);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFullscreen(false);
      } else if (panelRef.current) {
        await panelRef.current.requestFullscreen();
        setFullscreen(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <>
      {/* Injected keyframe animations */}
      <style>{`
        @keyframes pulse-live {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          70%  { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .mon-btn {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; border: none; cursor: pointer;
          font-size: 13px; font-weight: 600; border-radius: 10px;
          padding: 10px 20px; transition: all 0.18s ease;
        }
        .mon-btn:hover { transform: translateY(-1px); }
        .mon-btn:active { transform: translateY(0); }
        .mon-btn-primary {
          background: linear-gradient(135deg, #6c63ff, #a78bfa);
          color: #fff;
          box-shadow: 0 4px 18px rgba(108,99,255,0.4);
        }
        .mon-btn-primary:hover { box-shadow: 0 6px 24px rgba(108,99,255,0.6); }
        .mon-btn-danger {
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.35);
          color: #ef4444;
        }
        .mon-btn-danger:hover { background: rgba(239,68,68,0.25); }
        .mon-btn-ghost {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-secondary);
          padding: 8px 14px;
        }
        .mon-btn-ghost:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
        .mon-icon-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border: none; cursor: pointer;
          border-radius: 8px; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: var(--text-secondary); transition: all 0.15s;
        }
        .mon-icon-btn:hover { background: rgba(255,255,255,0.12); color: var(--text-primary); }
        .user-card-btn {
          display: flex; align-items: center; gap: 12px; width: 100%;
          padding: 10px 12px; border: none; cursor: pointer; text-align: left;
          background: transparent; color: inherit; border-radius: 10px;
          transition: background 0.15s;
        }
        .user-card-btn:hover { background: rgba(255,255,255,0.05); }
        .user-card-btn.active { background: rgba(108,99,255,0.12); border: 1px solid rgba(108,99,255,0.25); }
        .search-input {
          width: 100%; padding: 8px 12px 8px 34px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; color: var(--text-primary);
          font-size: 13px; outline: none; transition: border 0.15s;
        }
        .search-input:focus { border-color: rgba(108,99,255,0.5); }
        .search-input::placeholder { color: var(--text-muted); }
        /* Hide all scrollbars in monitoring module */
        .mon-page-wrapper,
        .mon-page-wrapper * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .mon-page-wrapper::-webkit-scrollbar,
        .mon-page-wrapper *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>

      <div className="app-layout">
        <Sidebar />
        <main className="mon-page-wrapper" style={{
          flex: 1, minWidth: 0, height: '100vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-primary)',
        }}>

          {/* ── Header ──────────────────────────────────────────────── */}
          <header style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', height: 58, flexShrink: 0,
            background: 'rgba(255,255,255,0.02)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'linear-gradient(135deg, #6c63ff22, #a78bfa22)',
                border: '1px solid rgba(108,99,255,0.3)',
                display: 'grid', placeItems: 'center', color: '#a78bfa',
              }}>
                <MonitorIcon size={18} />
              </div>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.2px' }}>
                Live Monitoring
              </h1>
              {mode && (
                <span style={{
                  padding: '3px 10px', borderRadius: '999px', fontSize: 11, fontWeight: 700,
                  background: mode === 'streamer' ? 'rgba(108,99,255,0.15)' : 'rgba(34,197,94,0.12)',
                  color: mode === 'streamer' ? '#a78bfa' : '#22c55e',
                  border: `1px solid ${mode === 'streamer' ? 'rgba(108,99,255,0.3)' : 'rgba(34,197,94,0.3)'}`,
                }}>
                  {mode === 'streamer' ? '● Broadcasting' : '● Viewing'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {mode === 'streamer' && (
                <>
                  {sharingState === 'sharing' && <LiveBadge small />}
                  <ConnectionBadge status={connectionStatus} quality={connectionQuality} />
                </>
              )}
              {mode === 'viewer' && streamer && (
                <>
                  <ConnectionBadge status={connectionStatus} quality={connectionQuality} />
                  <button className="mon-icon-btn" onClick={toggleFullscreen} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                    <FullscreenIcon exit={fullscreen} size={16} />
                  </button>
                  <button className="mon-btn mon-btn-ghost" onClick={stopWatching} style={{ gap: 6 }}>
                    <XIcon size={14} /> Stop Viewing
                  </button>
                </>
              )}
            </div>
          </header>

          {/* ── Error banner ─────────────────────────────────────────── */}
          {error && (
            <div style={{
              margin: '10px 20px 0',
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 10,
              color: '#fca5a5', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
              animation: 'fadeInUp 0.2s ease',
            }}>
              <ShieldIcon size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* ── Content area ──────────────────────────────────────────── */}
          <div style={{
            flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
            overflow: 'hidden', padding: '16px 20px',
            background: 'radial-gradient(ellipse at 80% 0%, rgba(108,99,255,0.08) 0%, transparent 60%)',
          }}>
            {mode === null && (
              <MonitoringLanding onStartSharing={startSharing} liveUsers={liveUsers} onWatch={startWatching} onRefresh={refreshLiveUsers} />
            )}
            {mode === 'streamer' && (
              <StreamerPanel onStop={stopSharing} localStreamRef={localStreamRef} />
            )}
            {mode === 'viewer' && (
              <ViewerPanel panelRef={panelRef} fullscreen={fullscreen} onToggleFullscreen={toggleFullscreen} />
            )}
          </div>
        </main>
      </div>
    </>
  );
};

// ─── Landing page (no mode selected) ─────────────────────────────────────────
const MonitoringLanding = ({ onStartSharing, liveUsers, onWatch, onRefresh }) => {
  const [search, setSearch] = useState('');
  const filtered = liveUsers.filter((u) =>
    u.userName?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 360px',
      gap: 20,
      flex: 1,
      height: '100%',
      minHeight: 0,
      alignItems: 'stretch',
      animation: 'fadeInUp 0.25s ease',
    }}>

      {/* Left: Start sharing — Full Height */}
      <GlassCard style={{
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}>
        <div style={{
          flex: 1,
          minHeight: 0,
          padding: '20px 28px',
          background: 'linear-gradient(135deg, rgba(108,99,255,0.08) 0%, rgba(167,139,250,0.04) 100%)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 58, height: 58, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
            display: 'grid', placeItems: 'center', color: '#fff',
            boxShadow: '0 6px 22px rgba(108,99,255,0.45)',
          }}>
            <MonitorIcon size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
              Start Screen Monitoring
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 420, margin: '0 auto', lineHeight: 1.45 }}>
              Share your screen securely with authorized viewers in real time.
              No camera or microphone required — screen only.
            </p>
          </div>
          <button className="mon-btn mon-btn-primary" onClick={onStartSharing} style={{ fontSize: 13, padding: '10px 28px' }}>
            <MonitorIcon size={15} /> Start Sharing
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 7, fontSize: 11, color: 'var(--text-muted)',
          }}>
            <ShieldIcon size={12} />
            Browser will prompt for permission — required by browser security
          </div>
        </div>

        {/* Feature list pinned to bottom of left card — compact horizontal grid */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              ['Screen Only', 'No camera/mic'],
              ['Auto Reconnect', 'Smart reconnect'],
              ['WebRTC', 'Encrypted P2P'],
              ['Session Timer', 'Live duration'],
            ].map(([title, desc]) => (
              <div key={title} style={{
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap' }}>{title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Right: Live users — Full Height */}
      <GlassCard style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UsersIcon size={16} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Live Now</span>
            {liveUsers.length > 0 && (
              <span style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '999px', padding: '1px 7px', fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
                {liveUsers.length}
              </span>
            )}
          </div>
          <button className="mon-icon-btn" onClick={onRefresh} title="Refresh">
            <RefreshIcon size={14} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'relative', flexShrink: 0 }}>
          <span style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <SearchIcon size={14} />
          </span>
          <input
            className="search-input"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Scrollable live users list filling remaining vertical height */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {filtered.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>
              <MonitorIcon size={38} style={{ marginBottom: 12, opacity: 0.35 }} />
              <p style={{ margin: 0, fontSize: 13 }}>
                {liveUsers.length === 0 ? 'No one is sharing their screen right now.' : 'No results found.'}
              </p>
            </div>
          ) : (
            <div style={{ padding: '8px' }}>
              {filtered.map((u) => (
                <LiveUserCard key={u.userId} user={u} onWatch={() => onWatch(u.userId)} />
              ))}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

/** Single live user card in the list */
const LiveUserCard = ({ user, isActive = false, onWatch }) => {
  const since = user.sharingSince
    ? formatDistanceToNow(new Date(user.sharingSince), { addSuffix: true })
    : null;

  return (
    <button className={`user-card-btn ${isActive ? 'active' : ''}`} onClick={onWatch}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar user={{ name: user.userName, avatar: user.avatar }} size="md" />
        <span style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 9, height: 9, borderRadius: '50%',
          background: '#ef4444',
          border: '1.5px solid var(--bg-secondary)',
          animation: 'pulse-live 1.5s infinite',
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.userName}
          </span>
          {isActive && <LiveBadge small />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {since ? `Sharing ${since}` : 'Sharing now'}
          </span>
          {user.viewerCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-muted)' }}>
              <EyeIcon size={10} /> {user.viewerCount}
            </span>
          )}
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', padding: '3px 7px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6 }}>
        Watch
      </span>
    </button>
  );
};

// ─── Streamer panel ───────────────────────────────────────────────────────────
const StreamerPanel = ({ onStop, localStreamRef }) => {
  const { user, streamer, viewerList, connectionStatus, connectionQuality, sessionDuration, sharingState } = useLiveMonitoring();
  const previewRef = useRef(null);
  const isSharing = sharingState === 'sharing';

  // Attach local stream to preview video
  // Attach the local stream to the preview video element ONCE when it becomes
  // available. We must NOT use setInterval to reassign srcObject — that causes
  // the video to flicker/reset every tick.
  useEffect(() => {
    if (!isSharing) return;
    // Small delay allows the stream tracks to be fully active before attaching
    const timer = setTimeout(() => {
      if (previewRef.current && localStreamRef.current) {
        // Only assign if it changed — avoids resetting a playing video
        if (previewRef.current.srcObject !== localStreamRef.current) {
          previewRef.current.srcObject = localStreamRef.current;
          previewRef.current.play().catch(() => {});
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isSharing, localStreamRef]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20, flex: 1, height: '100%', minHeight: 0, alignItems: 'stretch', animation: 'fadeInUp 0.25s ease' }}>


      {/* Left: Sharing status card (NO live preview — avoids infinite mirror loop) */}
      <GlassCard style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MonitorIcon size={16} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Your Screen</span>
            {isSharing && <LiveBadge />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ConnectionBadge status={connectionStatus} quality={connectionQuality} />
          </div>
        </div>

        {/* Status area — no <video> here to prevent recursive mirror */}
        <div style={{
          flex: 1,
          minHeight: 0,
          background: 'linear-gradient(135deg, #0a0c16 0%, #0d0f1e 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Animated background glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: isSharing
              ? 'radial-gradient(ellipse at 50% 50%, rgba(108,99,255,0.12) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 70%)',
            transition: 'background 0.5s ease',
          }} />

          {sharingState === 'requesting' ? (
            /* Waiting for permission */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, zIndex: 1 }}>
              <Spinner size={40} color="#f59e0b" />
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#f59e0b', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                  Waiting for permission…
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  Click <strong style={{ color: 'var(--text-secondary)' }}>Share</strong> in the browser dialog to start
                </div>
              </div>
            </div>
          ) : isSharing ? (
            /* Actively sharing */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, zIndex: 1 }}>
              {/* Big animated monitor icon */}
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(108,99,255,0.25), rgba(167,139,250,0.15))',
                border: '1.5px solid rgba(108,99,255,0.4)',
                display: 'grid', placeItems: 'center',
                color: '#a78bfa',
                boxShadow: '0 0 40px rgba(108,99,255,0.25)',
                animation: 'pulse-live 2.5s infinite',
              }}>
                <MonitorIcon size={38} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                  Screen is being shared
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Viewers can see your browser tab in real time
                </div>
              </div>
              {/* Session timer large display */}
              <div style={{
                padding: '10px 24px',
                background: 'rgba(108,99,255,0.12)',
                border: '1px solid rgba(108,99,255,0.25)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <TimerIcon size={16} />
                <span style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800, color: '#a78bfa', letterSpacing: '2px' }}>
                  {formatDuration(sessionDuration)}
                </span>
              </div>
            </div>
          ) : (
            /* Not started */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, zIndex: 1, opacity: 0.5 }}>
              <MonitorIcon size={36} />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Not sharing</span>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <StatChip icon={TimerIcon} label="Session" value={formatDuration(sessionDuration)} accent />
          <StatChip icon={UsersIcon} label="Viewers" value={viewerList.length} />
          <StatChip icon={SignalIcon} label="Quality" value={
            { good: 'Good', medium: 'Medium', poor: 'Poor', unknown: '—' }[connectionQuality] || '—'
          } />
          <div style={{ marginLeft: 'auto' }}>
            <button className="mon-btn mon-btn-danger" onClick={onStop}>
              <StopIcon size={14} /> Stop Monitoring
            </button>
          </div>
        </div>
      </GlassCard>


      {/* Right: Viewers + info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>

        {/* User info */}
        <GlassCard style={{ padding: '14px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
              display: 'grid', placeItems: 'center',
              fontSize: 17, fontWeight: 700, color: '#fff',
              boxShadow: '0 4px 14px rgba(108,99,255,0.4)',
            }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{user?.name || 'You'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>Screen sharing active</div>
            </div>
            {isSharing && <div style={{ marginLeft: 'auto' }}><LiveBadge /></div>}
          </div>
        </GlassCard>

        {/* Viewers list */}
        <GlassCard style={{ overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <UsersIcon size={15} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Connected Viewers</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{viewerList.length} online</span>
          </div>

          {viewerList.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <UsersIcon size={28} style={{ marginBottom: 10, opacity: 0.3 }} />
              <p style={{ margin: 0 }}>No viewers connected yet</p>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '8px' }}>
              {viewerList.map((v) => (
                <div key={v.socketId} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 9,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  marginBottom: 5,
                }}>
                  <Avatar user={v} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {v.joinedAt ? `Joined ${formatDistanceToNow(new Date(v.joinedAt), { addSuffix: true })}` : 'Just joined'}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', padding: '2px 6px', background: 'rgba(34,197,94,0.1)', borderRadius: 5 }}>
                    LIVE
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

// ─── Viewer panel ─────────────────────────────────────────────────────────────
const ViewerPanel = ({ panelRef, fullscreen, onToggleFullscreen }) => {
  const {
    user, streamer, viewerInfo, liveUsers,
    connectionStatus, connectionQuality, sessionDuration,
    startWatching, stopWatching, pcRef,
  } = useLiveMonitoring();

  const videoRef = useRef(null);
  const [search, setSearch] = useState('');

  // Attach remote stream via pcRef.ontrack
  useEffect(() => {
    if (!pcRef.current) return;
    const pc = pcRef.current;
    pc.ontrack = (event) => {
      if (event.streams?.[0] && videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
        videoRef.current.play().catch(() => {});
      }
    };
  }, [pcRef.current, streamer]);

  const filtered = liveUsers.filter((u) =>
    u.userName?.toLowerCase().includes(search.toLowerCase()),
  );

  const isActive = connectionStatus === 'connected' || connectionStatus === 'completed';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20, flex: 1, height: '100%', minHeight: 0, alignItems: 'stretch', animation: 'fadeInUp 0.25s ease' }}>

      {/* Left: Video panel */}
      <GlassCard style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Video header */}
        {streamer && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar user={{ name: streamer.userName, avatar: streamer.avatar }} size="md" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {streamer.userName}
                </span>
                <LiveBadge small />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <ConnectionBadge status={connectionStatus} quality={connectionQuality} />
                <QualityLabel quality={connectionQuality} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                  <TimerIcon size={11} /> {formatDuration(sessionDuration)}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="mon-icon-btn" onClick={onToggleFullscreen} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                <FullscreenIcon exit={fullscreen} size={16} />
              </button>
              <button className="mon-icon-btn" onClick={stopWatching} title="Stop viewing">
                <XIcon size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Video surface */}
        <div
          ref={panelRef}
          style={{ position: 'relative', background: '#060810', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />

          {!streamer && (
            <EmptyState
              icon={MonitorIcon}
              title="No stream selected"
              subtitle="Choose a user from the panel to start viewing their screen in real time."
            />
          )}

          {streamer && connectionStatus === 'connecting' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,8,16,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <Spinner size={36} />
              <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>Connecting to live stream…</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Establishing WebRTC connection</span>
            </div>
          )}

          {streamer && (connectionStatus === 'disconnected' || connectionStatus === 'failed') && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,8,16,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'grid', placeItems: 'center', color: '#ef4444' }}>
                <WifiOffIcon size={26} />
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>
                {connectionStatus === 'failed' ? 'Connection failed' : 'Connection lost'}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Attempting to reconnect…</span>
            </div>
          )}
        </div>

        {/* Control bar */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {streamer && (
            <>
              <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                <StatChip icon={TimerIcon} label="Session" value={formatDuration(sessionDuration)} accent />
                <StatChip icon={SignalIcon} label="Connection" value={{ good: 'Good', medium: 'Medium', poor: 'Poor', unknown: '—' }[connectionQuality] || '—'} />
              </div>
              <button className="mon-btn mon-btn-ghost" onClick={onToggleFullscreen} style={{ gap: 6 }}>
                <FullscreenIcon size={14} /> Full Screen
              </button>
              <button className="mon-btn mon-btn-danger" onClick={stopWatching} style={{ gap: 6 }}>
                <XIcon size={14} /> Stop Viewing
              </button>
            </>
          )}
        </div>
      </GlassCard>

      {/* Right: Live users list */}
      <GlassCard style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <UsersIcon size={15} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Live Users</span>
            {liveUsers.length > 0 && (
              <span style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '999px', padding: '1px 7px', fontSize: 10, fontWeight: 700, color: '#ef4444' }}>
                {liveUsers.length}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <SearchIcon size={13} />
          </span>
          <input
            className="search-input"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <p style={{ margin: 0 }}>
                {liveUsers.length === 0 ? 'No users are sharing right now.' : 'No results found.'}
              </p>
            </div>
          ) : (
            <div style={{ padding: '8px' }}>
              {filtered.map((u) => {
                const isWatching = streamer?.userId === u.userId;
                return (
                  <LiveUserCard
                    key={u.userId}
                    user={u}
                    isActive={isWatching}
                    onWatch={() => {
                      if (!isWatching) {
                        stopWatching();
                        setTimeout(() => startWatching(u.userId), 200);
                      }
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default LiveMonitoring;
