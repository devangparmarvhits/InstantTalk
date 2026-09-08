import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { StreamContext } from '../../context/StreamContext';
import { getSocket } from '../../socket/socket';
import StreamChat from './StreamChat';
import Avatar from '../user/Avatar';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

const StreamViewer = ({ stream }) => {
  const { user } = useContext(AuthContext);
  const { viewerCount } = useContext(StreamContext);
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const connectedRef = useRef(false);
  const retryStopRef = useRef(false);
  const pendingCandidatesRef = useRef([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0);
  const [showChat, setShowChat] = useState(true);

  // Setup WebRTC — wait for streamer to send us an offer
  useEffect(() => {
    if (!stream?._id) return;

    const socket = getSocket();
    if (!socket) {
      retryStopRef.current = true;
      setError('Not connected to server');
      return;
    }

    let cancelled = false;

    const createPeerConnection = () => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.ontrack = (event) => {
        if (!cancelled && videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().catch(() => {});
          connectedRef.current = true;
          setConnected(true);
          setError('');
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && stream.streamer) {
          const streamerId = stream.streamer?._id || stream.streamer;
          socket.emit('stream:ice-candidate', {
            streamId: stream._id,
            candidate: event.candidate,
            targetUserId: streamerId,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (cancelled) return;
        if (pc.connectionState === 'failed') {
          setError('Connection failed. Try refreshing.');
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    };

    const handleOffer = async ({ streamId, offer, fromUserId }) => {
      if (streamId !== stream._id) return;
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        const state = pc.signalingState;
        if (state !== 'stable' && state !== 'have-local-offer') {
          console.warn(`Ignoring offer — state: ${state}`);
          return;
        }
        if (state === 'have-local-offer') {
          await pc.setLocalDescription({ type: 'rollback' });
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Flush any ICE candidates that arrived before the offer
        const queue = pendingCandidatesRef.current;
        pendingCandidatesRef.current = [];
        queue.forEach((c) => {
          try {
            pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          } catch {}
        });
        if (pc.signalingState !== 'have-remote-offer') {
          console.warn(`Skipping answer — state after setRemoteDescription: ${pc.signalingState}`);
          return;
        }
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
    };

    const handleIceCandidate = ({ streamId, candidate, fromUserId }) => {
      if (streamId !== stream._id) return;
      const pc = peerConnectionRef.current;
      if (!pc) return;
      // Buffer candidates until we have the remote description so none are lost
      if (!pc.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      try {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    const handleStreamEnded = ({ streamId }) => {
      if (streamId !== stream._id) return;
      retryStopRef.current = true;
      setConnected(false);
      setError('Live stream has ended.');
    };

    const handleRemoved = ({ streamId: sid }) => {
      if (sid !== stream._id) return;
      retryStopRef.current = true;
      setError('You have been removed from this stream.');
      setConnected(false);
    };

    const handleBlocked = ({ streamId: sid }) => {
      if (sid !== stream._id) return;
      retryStopRef.current = true;
      setError('You have been blocked from this stream.');
      setConnected(false);
    };

    const handleStreamError = ({ message }) => {
      // Stop retrying when the stream is no longer joinable
      if (!message) return;
      const text = String(message).toLowerCase();
      if (text.includes('not live') || text.includes('blocked')) {
        retryStopRef.current = true;
        setConnected(false);
        setError(message);
      }
    };

    // Streamer toggled screen share or tracks changed — re-bind the stream to the video element
    const handleTracksChanged = ({ streamId: sid }) => {
      if (sid !== stream._id) return;
      const pc = peerConnectionRef.current;
      // Re-attach the current receiving stream so the video element picks up the new track
      const receivers = pc?.getReceivers?.() || [];
      const track = receivers.find((r) => r.track.kind === 'video')?.track;
      if (track && videoRef.current) {
        const newStream = new MediaStream([track, ...receivers.filter((r) => r.track.kind === 'audio').map((r) => r.track)]);
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(() => {});
        setConnected(true);
        setError('');
      }
    };

    // Join the stream room — this triggers the backend to tell the streamer
    const joinStream = () => {
      socket.emit('stream:join-as-viewer', { streamId: stream._id });
    };

    // Create the initial PeerConnection before joining
    createPeerConnection();

    // Reset connection state for reconnects
    connectedRef.current = false;

    socket.on('stream:offer', handleOffer);
    socket.on('stream:ice-candidate', handleIceCandidate);
    socket.on('stream:ended', handleStreamEnded);
    socket.on('stream:removed', handleRemoved);
    socket.on('stream:blocked', handleBlocked);
    socket.on('stream:tracks-changed', handleTracksChanged);
    socket.on('stream:error', handleStreamError);

    // Join the stream room — this triggers the backend to tell the streamer
    joinStream();

    // Streamer refreshed their page — quickly re-establish the connection
    const reconnect = () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      pendingCandidatesRef.current = [];
      connectedRef.current = false;
      createPeerConnection();
      joinStream();
    };

    const handleStreamerReconnected = ({ streamId: sid }) => {
      if (sid !== stream._id) return;
      reconnect();
    };

    socket.on('stream:streamer-reconnected', handleStreamerReconnected);

    // Retry: if not connected within 2.5 seconds, re-create PC and re-join.
    // Uses a ref so the interval always sees the latest connection state.
    const retryInterval = setInterval(() => {
      if (cancelled) return;
      if (retryStopRef.current) return;
      if (connectedRef.current) return;
      // Close old PC
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      // Create fresh PC
      createPeerConnection();
      // Re-join
      joinStream();
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(retryInterval);
      socket.off('stream:offer', handleOffer);
      socket.off('stream:ice-candidate', handleIceCandidate);
      socket.off('stream:ended', handleStreamEnded);
      socket.off('stream:removed', handleRemoved);
      socket.off('stream:blocked', handleBlocked);
      socket.off('stream:tracks-changed', handleTracksChanged);
      socket.off('stream:streamer-reconnected', handleStreamerReconnected);
      socket.off('stream:error', handleStreamError);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [stream?._id, stream?.streamer]);

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

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: stream.title, url });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  if (!stream) return null;

  return (
    <div className="stream-viewer-layout">
      <div className="stream-viewer-main">
        {/* Video Area */}
        <div className="stream-viewer-video-area">
          <video ref={videoRef} autoPlay muted playsInline className="stream-viewer-video" />

          {/* Connecting overlay */}
          {!connected && !error && (
            <div className="stream-viewer-connecting">
              <div className="loading-spinner" />
              <span>Connecting to stream...</span>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="stream-viewer-connecting" style={{ background: 'rgba(0,0,0,0.8)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32" style={{ color: 'var(--danger)' }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>{error}</span>
              <button
                className="stream-viewer-ctrl-btn"
                onClick={() => navigate('/live')}
                style={{ marginTop: '8px' }}
              >
                Back to Live Streams
              </button>
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
