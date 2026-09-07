import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { StreamContext } from '../../context/StreamContext';
import { getSocket } from '../../socket/socket';
import StreamChat from './StreamChat';
import Avatar from '../user/Avatar';

const StreamViewer = ({ stream }) => {
  const { user } = useContext(AuthContext);
  const { viewerCount, sendStreamChat } = useContext(StreamContext);
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showChat, setShowChat] = useState(true);

  // Setup WebRTC connection to receive stream
  useEffect(() => {
    if (!stream?._id) return;

    const setupWebRTC = async () => {
      try {
        const socket = getSocket();
        if (!socket) return;

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peerConnectionRef.current = pc;

        pc.ontrack = (event) => {
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
            setConnected(true);
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            // Find streamer socket and send candidate
            socket.emit('stream:ice-candidate', {
              streamId: stream._id,
              candidate: event.candidate,
              targetUserId: stream.streamer?._id || stream.streamer,
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            setConnected(true);
          }
        };

        // Listen for streamer's offer
        socket.off('stream:offer');
        socket.on('stream:offer', async ({ streamId, offer, fromUserId }) => {
          if (streamId !== stream._id) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('stream:answer', {
              streamId,
              answer: pc.localDescription,
              targetUserId: fromUserId,
            });
          } catch (err) {
            console.error('Error handling offer:', err);
          }
        });

        // Listen for ICE candidates from streamer
        socket.off('stream:ice-candidate:viewer');
        socket.on('stream:ice-candidate:viewer', ({ streamId, candidate }) => {
          if (streamId !== stream._id) return;
          try {
            pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        });

        // Request stream from the broadcaster
        // The streamer will respond with an offer
        socket.emit('stream:request-offer', {
          streamId: stream._id,
          viewerId: user?._id,
        });
      } catch (err) {
        console.error('WebRTC setup error:', err);
      }
    };

    setupWebRTC();

    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [stream?._id]);

  // Duration timer
  useEffect(() => {
    if (!stream?.startedAt) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(stream.startedAt).getTime()) / 1000);
      setDuration(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [stream?.startedAt]);

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).catch(() => {});
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: stream.title, url });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  if (!stream) return null;

  return (
    <div className="stream-viewer-layout">
      <div className="stream-viewer-main">
        {/* Video Area */}
        <div className="stream-viewer-video-area">
          <video ref={videoRef} autoPlay playsInline className="stream-viewer-video" />

          {!connected && (
            <div className="stream-viewer-connecting">
              <div className="loading-spinner" />
              <span>Connecting to stream...</span>
            </div>
          )}

          {/* Overlay badges */}
          <div className="stream-viewer-overlay-top">
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

          {/* Streamer info */}
          <div className="stream-viewer-overlay-info">
            <div className="streamer-info-user">
              <Avatar user={stream.streamer} size="sm" />
              <span>{stream.streamer?.name}</span>
            </div>
            <h3 className="streamer-info-title">{stream.title}</h3>
            {stream.description && (
              <p className="streamer-info-desc">{stream.description}</p>
            )}
          </div>

          {/* Bottom controls */}
          <div className="stream-viewer-bottom-controls">
            <button className="stream-viewer-ctrl-btn" onClick={handleShare} title="Share stream">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Share
            </button>
            <button
              className="stream-viewer-ctrl-btn chat-toggle"
              onClick={() => setShowChat(!showChat)}
              title="Toggle chat"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              Chat
            </button>
            <button
              className="stream-viewer-ctrl-btn leave"
              onClick={() => navigate('/live')}
              title="Leave stream"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Leave
            </button>
          </div>
        </div>

        {/* Chat */}
        {showChat && (
          <StreamChat isStreamer={false} />
        )}
      </div>
    </div>
  );
};

export default StreamViewer;
