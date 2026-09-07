import React, { useEffect, useRef, useState } from 'react';
import Avatar from '../user/Avatar';

const MicIcon = ({ muted = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {muted ? <><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9V5a3 3 0 0 0-5.65-1.48"/><path d="M17 12a5 5 0 0 1-8.24 3.82M12 19v4M8 23h8"/></> : <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10a7 7 0 0 1-14 0M12 17v5M8 22h8"/></>}
  </svg>
);

const CameraIcon = ({ off = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {off ? <><path d="M3 3l18 18M10.66 10.66A2 2 0 0 0 12 14a2 2 0 0 0 1.34-.52M9.9 4H17l4 3v10"/><path d="M3 7h3l1.5-2h2"/><rect x="3" y="7" width="18" height="13" rx="2"/></> : <><path d="M15 10l4.5-3A1 1 0 0 1 21 7.83v8.34a1 1 0 0 1-1.5.83L15 14"/><rect x="3" y="5" width="12" height="14" rx="2"/></>}
  </svg>
);

const PhoneOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.93 2.86l1.06-.95a2 2 0 0 1 2.12-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22.4 17v2.92a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.59 19 19.5 19.5 0 0 1 5 12.41 19.8 19.8 0 0 1 2.08 3.78 2 2 0 0 1 4.08 1.6H7a2 2 0 0 1 1.53 2.93c.34.96.57 1.9.7 2.81a2 2 0 0 1-.45 2.12l-.95 1.06M3 3l18 18"/></svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.63 4.35 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.9a16 16 0 0 0 6.1 6.1l1.06-.95a2 2 0 0 1 2.12-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
);

const SpeakerIcon = ({ off = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    {off ? <><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></> : <><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></>}
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

const MinimizeIcon = ({ expanded = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {expanded ? <><polyline points="8 3 8 8 3 8" /><polyline points="16 21 16 16 21 16" /><line x1="8" y1="8" x2="3" y2="3" /><line x1="16" y1="16" x2="21" y2="21" /></> : <><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="10" y1="14" x2="4" y2="20" /><line x1="14" y1="10" x2="20" y2="4" /></>}
  </svg>
);

const FullscreenIcon = ({ exit = false }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {exit ? <><polyline points="8 3 8 8 3 8" /><polyline points="16 21 16 16 21 16" /><line x1="8" y1="8" x2="3" y2="3" /><line x1="16" y1="16" x2="21" y2="21" /></> : <><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></>}
  </svg>
);

const formatDuration = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

const getInitial = (name) => {
  const value = (name || 'G').trim();
  return value.charAt(0).toUpperCase() || 'G';
};

const CallPanel = ({ call, other, onAccept, onReject, onEnd, onToggleMute, onToggleSpeaker, onToggleCamera }) => {
  const panelRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === panelRef.current);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await panelRef.current?.requestFullscreen();
    } catch (error) {
      console.error('Fullscreen unavailable:', error);
    }
  };

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = call.remoteStream || null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = call.remoteStream || null;
      remoteAudioRef.current.volume = 1;
      remoteAudioRef.current.play().catch(() => {});
      remoteAudioRef.current.onloadedmetadata = () => remoteAudioRef.current?.play().catch(() => {});
    }
  }, [call.remoteStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.muted = !call.isSpeakerOn;
    if (remoteAudioRef.current) remoteAudioRef.current.muted = !call.isSpeakerOn;
  }, [call.isSpeakerOn]);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = call.localStream || null;
  }, [call.localStream]);

  const isVideo = call.mediaType === 'video';
  const participant = call.remoteUser || other;
  const isIncoming = call.status === 'incoming';
  const isActive = ['ringing', 'connecting', 'connected'].includes(call.status);
  const displayName = participant?.name || 'Contact';
  const isConnected = call.status === 'connected';
  const callType = isVideo ? 'Video' : 'Audio';
  const statusText = isIncoming ? `Incoming ${callType} Call` : isConnected ? 'Call connected' : call.status === 'connecting' ? 'Connecting...' : 'Calling...';
  const timerText = formatDuration(call.elapsedSeconds);
  const titleText = isIncoming ? `Incoming ${callType} Call` : `Outgoing ${callType} Call`;

  if (call.status === 'idle' && !call.error) return null;

  return (
    <section ref={panelRef} className={`call-panel call-panel-audio ${isIncoming ? 'call-panel-incoming' : 'call-panel-outgoing'} ${isVideo ? 'call-panel-video' : ''} ${isMinimized ? 'call-panel-minimized' : ''}`} aria-label="Call">
      {isVideo && <video ref={remoteVideoRef} className="call-remote-video" autoPlay playsInline />}
      {!isVideo && <audio ref={remoteAudioRef} autoPlay playsInline />}

      {!isIncoming && !isVideo && (
        <button className="call-panel-back" onClick={onReject} title="Back" aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}

      <div className="call-panel-top-actions">
        <button className="call-panel-tool" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          <FullscreenIcon exit={isFullscreen} />
        </button>
        <button className="call-panel-tool" onClick={onEnd} title="End call" aria-label="End call">
          <CloseIcon />
        </button>
      </div>

      {isMinimized && (
        <div className="call-minimized-content">
          <span className="call-minimized-status" />
          <strong>{displayName}</strong>
          <span>{isConnected ? timerText : statusText}</span>
          <button className="call-minimized-end" onClick={onEnd} title="End call" aria-label="End call"><PhoneOffIcon /></button>
        </div>
      )}

      {!isMinimized && <div className="call-panel-header">
        <h3>{titleText}</h3>
      </div>}

      {!isMinimized && <div className="call-avatar-shell">
        <div className="call-avatar-ring" />
        <div className={`call-avatar-core ${isIncoming ? 'incoming' : 'outgoing'}`}>
          {getInitial(displayName)}
        </div>
      </div>}

      {!isMinimized && <div className="call-contact-block">
        <div className="call-contact-name">{displayName}</div>
      </div>}

      {!isMinimized && <div className="call-status-row">
        <span className="call-status-icon"><PhoneIcon /></span>
        <span>{statusText}</span>
      </div>}

      {!isMinimized && isConnected && (
        <div className="call-timer-pill">
          <span className="call-timer-icon"><PhoneIcon /></span>
          <span>{timerText}</span>
        </div>
      )}

      {call.error && <button className="call-panel-close" onClick={onEnd} title="Close call message" aria-label="Close call message"><CloseIcon /></button>}

      {!isMinimized && isVideo && <video ref={localVideoRef} className="call-local-video" muted autoPlay playsInline />}
      {!isMinimized && !isIncoming && call.error && <div className="call-error">{call.error}</div>}

      {!isMinimized && <div className="call-controls call-controls-modern">
        {isIncoming ? <>
          <button className="call-control-item call-control-decline" onClick={onReject} title="Decline call">
            <span className="call-control-icon"><PhoneOffIcon /></span>
            <span className="call-control-label">Decline</span>
          </button>
          <button className="call-control-item call-control-accept" onClick={onAccept} title="Accept call">
            <span className="call-control-icon"><PhoneIcon /></span>
            <span className="call-control-label">Accept</span>
          </button>
        </> : isActive && <>
          <button className={`call-control-item ${call.isMuted ? 'is-off' : ''}`} onClick={onToggleMute} title={call.isMuted ? 'Unmute microphone' : 'Mute microphone'}>
            <span className="call-control-icon"><MicIcon muted={call.isMuted} /></span>
            <span className="call-control-label">Mute</span>
          </button>
          <button className={`call-control-item ${call.isCameraOff ? 'is-off' : ''}`} onClick={onToggleCamera} title={call.isCameraOff ? 'Turn camera on' : 'Turn camera off'}>
            <span className="call-control-icon"><CameraIcon off={call.isCameraOff} /></span>
            <span className="call-control-label">Camera</span>
          </button>
          <button className="call-control-item call-control-decline" onClick={onEnd} title="End call">
            <span className="call-control-icon"><PhoneOffIcon /></span>
            <span className="call-control-label">End Call</span>
          </button>
          <div className="call-more-wrap">
            <button className="call-control-item" onClick={() => setShowMoreMenu((prev) => !prev)} title="More options">
              <span className="call-control-icon"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></span>
              <span className="call-control-label">More</span>
            </button>
            {showMoreMenu && (
              <div className="call-more-menu" role="menu" aria-label="Call options">
                <button onClick={() => { onToggleMute?.(); setShowMoreMenu(false); }}>
                  {call.isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button onClick={() => { onToggleSpeaker?.(); setShowMoreMenu(false); }}>
                  {call.isSpeakerOn ? 'Speaker off' : 'Speaker on'}
                </button>
                <button onClick={() => { onToggleCamera?.(); setShowMoreMenu(false); }}>
                  {call.isCameraOff ? 'Camera on' : 'Camera off'}
                </button>
                <button className="danger" onClick={() => { onEnd?.(); setShowMoreMenu(false); }}>
                  End call
                </button>
              </div>
            )}
          </div>
        </>}
      </div>}
    </section>
  );
};

export default CallPanel;
