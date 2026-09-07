import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { StreamContext } from '../../context/StreamContext';
import { getSocket } from '../../socket/socket';
import StreamChat from './StreamChat';
import Avatar from '../user/Avatar';

const StreamerView = () => {
  const { user } = useContext(AuthContext);
  const {
    myStream,
    viewerCount,
    removeStreamViewer,
    blockStreamViewer,
    endCurrentStream,
  } = useContext(StreamContext);
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [showViewerMenu, setShowViewerMenu] = useState(null);
  const screenStreamRef = useRef(null);

  // Initialize camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Failed to access camera:', err);
      }
    };
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Duration timer
  useEffect(() => {
    if (!myStream?.startedAt) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(myStream.startedAt).getTime()) / 1000);
      setDuration(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [myStream?.startedAt]);

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      // Stop screen sharing and revert to camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      // Re-enable camera
      if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (videoTrack) videoTrack.enabled = true;
        if (videoRef.current) videoRef.current.srcObject = streamRef.current;
      }
      setScreenSharing(false);
      setCameraOn(true);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;

        // When user stops sharing via browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          setScreenSharing(false);
          if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack) videoTrack.enabled = true;
            if (videoRef.current) videoRef.current.srcObject = streamRef.current;
          }
        };

        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }
        // Disable camera while screen sharing
        if (streamRef.current) {
          const videoTrack = streamRef.current.getVideoTracks()[0];
          if (videoTrack) videoTrack.enabled = false;
        }
        setScreenSharing(true);
        setCameraOn(false);
      } catch (err) {
        console.error('Screen share failed:', err);
      }
    }
  };

  const handleEndStream = async () => {
    try {
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      await endCurrentStream();
      navigate('/live');
    } catch (err) {
      console.error('Failed to end stream:', err);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/live/${myStream?._id}`;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/live/${myStream?._id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: myStream?.title, url });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const handleRemoveViewer = (viewerId) => {
    removeStreamViewer(viewerId);
  };

  const handleBlockViewer = (viewerId) => {
    blockStreamViewer(viewerId);
  };

  if (!myStream) return null;

  return (
    <div className="streamer-view">
      <div className="streamer-main">
        {/* Video Area */}
        <div className="streamer-video-area">
          <video ref={videoRef} autoPlay muted playsInline className="streamer-video" />

          {/* Overlay: LIVE badge + timer + viewer count */}
          <div className="streamer-overlay-top">
            <div className="streamer-live-badge">
              <span className="golive-dot" />
              LIVE
            </div>
            <div className="streamer-timer">{formatDuration(duration)}</div>
            <div className="streamer-viewer-count">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {viewerCount}
            </div>
          </div>

          {/* Stream info overlay */}
          <div className="streamer-overlay-info">
            <div className="streamer-info-user">
              <Avatar user={user} size="sm" />
              <span>{user?.name}</span>
            </div>
            <h3 className="streamer-info-title">{myStream.title}</h3>
            {myStream.description && (
              <p className="streamer-info-desc">{myStream.description}</p>
            )}
          </div>

          {/* Controls */}
          <div className="streamer-controls">
            <button
              className={`stream-control-btn ${!cameraOn ? 'off' : ''}`}
              onClick={toggleCamera}
              title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
            >
              <div className="stream-control-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <span>Camera</span>
            </button>
            <button
              className={`stream-control-btn ${!micOn ? 'off' : ''}`}
              onClick={toggleMic}
              title={micOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              <div className="stream-control-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
              <span>Mic</span>
            </button>
            <button
              className={`stream-control-btn ${screenSharing ? 'active' : ''}`}
              onClick={toggleScreenShare}
              title={screenSharing ? 'Stop sharing' : 'Share screen'}
            >
              <div className="stream-control-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <span>Screen</span>
            </button>
            <button className="stream-control-btn share" onClick={handleShare} title="Share stream">
              <div className="stream-control-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </div>
              <span>Share</span>
            </button>
            <button
              className="stream-control-btn end"
              onClick={() => setShowConfirmEnd(true)}
              title="End stream"
            >
              <div className="stream-control-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                </svg>
              </div>
              <span>End</span>
            </button>
          </div>
        </div>

        {/* Chat Sidebar */}
        <StreamChat
          isStreamer={true}
          onRemoveViewer={handleRemoveViewer}
          onBlockViewer={handleBlockViewer}
        />
      </div>

      {/* End Stream Confirmation */}
      {showConfirmEnd && (
        <div className="stream-modal-overlay">
          <div className="stream-confirm-modal">
            <div className="stream-confirm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              </svg>
            </div>
            <h3>End Live Stream?</h3>
            <p>Your stream will be ended and viewers will be disconnected.</p>
            <div className="stream-confirm-actions">
              <button className="btn-secondary" onClick={() => setShowConfirmEnd(false)}>
                Keep Streaming
              </button>
              <button className="btn-danger" onClick={handleEndStream}>
                End Stream
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamerView;
