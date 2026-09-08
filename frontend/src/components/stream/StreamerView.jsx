import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { StreamContext } from '../../context/StreamContext';
import { getSocket } from '../../socket/socket';
import StreamChat from './StreamChat';
import Avatar from '../user/Avatar';

const StreamerView = () => {
  const { user } = useContext(AuthContext);
  const {
    myStream, viewerCount, removeStreamViewer, blockStreamViewer, endCurrentStream,
    cameraOn, micOn, screenSharing, screenShareError, setScreenShareError, duration, mediaStreamRef,
    toggleCamera, toggleMic, toggleScreenShare, startStreamerWebRTC, getActiveStream,
  } = useContext(StreamContext);
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const miniBarRef = useRef(null);
  const dragRef = useRef({ isDragging: false, hasMoved: false, offsetX: 0, offsetY: 0 });
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);

  // Drag handlers for mini bar
  const handleDragStart = (e) => {
    const el = miniBarRef.current;
    if (!el) return;
    // Convert from centered transform to absolute position on first drag
    if (!dragRef.current.hasMoved) {
      const rect = el.getBoundingClientRect();
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.top}px`;
      el.style.bottom = 'auto';
      el.style.transform = 'none';
    }
    const rect = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { isDragging: true, hasMoved: true, offsetX: clientX - rect.left, offsetY: clientY - rect.top };
    el.style.cursor = 'grabbing';
    el.style.transition = 'none';
  };

  const handleDragMove = (e) => {
    if (!dragRef.current.isDragging) return;
    const el = miniBarRef.current;
    if (!el) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - dragRef.current.offsetX;
    const y = clientY - dragRef.current.offsetY;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.bottom = 'auto';
    el.style.transform = 'none';
  };

  const handleDragEnd = () => {
    dragRef.current.isDragging = false;
    const el = miniBarRef.current;
    if (el) el.style.cursor = 'grab';
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, []);

  // Show camera in video element (never show the screen-share capture locally to avoid
  // infinite recursion: the screen-share MediaStream is a capture of this window, which
  // includes the <video> element itself — feeding back forever). Viewers still receive the
  // screen-share track via WebRTC from the streamer's PeerConnection.
  useEffect(() => {
    if (!videoRef.current) return;
    if (screenSharing) {
      // While sharing the screen, show the camera so the streamer can see themselves.
      // The screen share is already being sent to viewers; the local preview does not
      // need to render it.
      const camStream = mediaStreamRef.current;
      videoRef.current.srcObject = camStream;
    } else {
      const activeStream = getActiveStream();
      if (activeStream) {
        videoRef.current.srcObject = activeStream;
      }
    }
  }, [screenSharing, getActiveStream]);

  // Initialize camera + join socket room + start WebRTC on mount
  useEffect(() => {
    if (!myStream?._id) return;

    const init = async () => {
      if (!mediaStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
      }
      if (videoRef.current && mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
      }
      // Join socket room + start WebRTC (safe to call multiple times)
      const socket = getSocket();
      if (socket) {
        socket.emit('stream:join-as-streamer', { streamId: myStream._id });
      }
      startStreamerWebRTC(myStream._id);
    };
    init();
  }, [myStream?._id]);

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/live/${myStream?._id}`;
    if (navigator.share) {
      try { await navigator.share({ title: myStream?.title, url }); } catch {}
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  const handleEndStream = async () => {
    try {
      await endCurrentStream();
      navigate('/live');
    } catch (err) {
      console.error('Failed to end stream:', err);
    }
  };

  if (!myStream) return null;

  return (
    <div className="streamer-view">
      <div className="streamer-main">
        {/* Video Area — shows camera or screen share preview */}
        <div className={`streamer-video-area${screenSharing ? ' screen-sharing-active' : ''}`}>
          <video ref={videoRef} autoPlay muted playsInline className="streamer-video mirror" />

          <div className="streamer-overlay-top">
            <div className="streamer-live-badge"><span className="golive-dot" />LIVE</div>
            <div className="streamer-timer">{formatDuration(duration)}</div>
            <div className="streamer-viewer-count">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
              </svg>
              {viewerCount}
            </div>
          </div>

          {screenShareError && (
            <div className="streamer-error-banner">
              <span>{screenShareError}</span>
              <button onClick={() => setScreenShareError('')}>Dismiss</button>
            </div>
          )}

          <div className="streamer-overlay-info">
            <div className="streamer-info-user"><Avatar user={user} size="sm" /><span>{user?.name}</span></div>
            <h3 className="streamer-info-title">{myStream.title}</h3>
            {myStream.description && <p className="streamer-info-desc">{myStream.description}</p>}
          </div>

          <div className="streamer-controls">
            <button className={`stream-control-btn ${!cameraOn ? 'off' : ''}`} onClick={toggleCamera}>
              <div className="stream-control-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg></div><span>Camera</span>
            </button>
            <button className={`stream-control-btn ${!micOn ? 'off' : ''}`} onClick={toggleMic}>
              <div className="stream-control-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg></div><span>Mic</span>
            </button>
            <button className={`stream-control-btn ${screenSharing ? 'active' : ''}`} onClick={toggleScreenShare}>
              <div className="stream-control-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg></div><span>Screen</span>
            </button>
            <button className="stream-control-btn share" onClick={handleShare}>
              <div className="stream-control-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg></div><span>Share</span>
            </button>
            <button className="stream-control-btn end" onClick={() => setShowConfirmEnd(true)}>
              <div className="stream-control-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg></div><span>End</span>
            </button>
          </div>
        </div>

        {/* Floating mini bar when screen sharing */}
        {screenSharing && (
          <div className="streamer-mini-bar" ref={miniBarRef} onMouseDown={handleDragStart} onTouchStart={handleDragStart}>
            <div className="streamer-mini-bar-left">
              <span className="golive-dot" />
              <span className="streamer-mini-title">{myStream.title}</span>
              <span className="streamer-mini-timer">{formatDuration(duration)}</span>
              <span className="streamer-mini-viewers">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                {viewerCount}
              </span>
            </div>
            <div className="streamer-mini-controls">
              <button className={`mini-ctrl ${!cameraOn ? 'off' : ''}`} onClick={toggleCamera}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg></button>
              <button className={`mini-ctrl ${!micOn ? 'off' : ''}`} onClick={toggleMic}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg></button>
              <button className="mini-ctrl active" onClick={toggleScreenShare}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg></button>
              <button className="mini-ctrl share" onClick={handleShare}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg></button>
              <button className="mini-ctrl end" onClick={() => setShowConfirmEnd(true)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg></button>
            </div>
          </div>
        )}

        <StreamChat isStreamer={true} onRemoveViewer={removeStreamViewer} onBlockViewer={blockStreamViewer} />
      </div>

      {showConfirmEnd && (
        <div className="stream-modal-overlay">
          <div className="stream-confirm-modal">
            <div className="stream-confirm-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg></div>
            <h3>End Live Stream?</h3>
            <p>Your stream will be ended and viewers will be disconnected.</p>
            <div className="stream-confirm-actions">
              <button className="btn-secondary" onClick={() => setShowConfirmEnd(false)}>Keep Streaming</button>
              <button className="btn-danger" onClick={handleEndStream}>End Stream</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamerView;
