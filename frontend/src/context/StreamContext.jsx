import React, { createContext, useState, useCallback, useContext, useRef, useEffect } from 'react';
import { getSocket } from '../socket/socket';
import { onSocketConnect } from '../socket/socket';
import { AuthContext } from './AuthContext';
import { createStream as createStreamApi, endStream as endStreamApi, getMyActiveStream } from '../services/stream.service';

// When the user logs out, end any active stream so it doesn't stay live in the DB.
const StreamContext = createContext(null);

export { StreamContext };

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export const StreamProvider = ({ children }) => {
  const { user, registerLogoutCallback } = useContext(AuthContext);
  const [myStream, setMyStream] = useState(null);
  const [activeStream, setActiveStream] = useState(null);
  const [streamChatMessages, setStreamChatMessages] = useState([]);
  const [streamViewers, setStreamViewers] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [isStreamer, setIsStreamer] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);

  // Streamer WebRTC state
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenShareError, setScreenShareError] = useState('');
  const [duration, setDuration] = useState(0);

  // Refs
  const activeStreamRef = useRef(activeStream);
  activeStreamRef.current = activeStream;
  const peerConnectionsRef = useRef(new Map());
  const mediaStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const myStreamRef = useRef(myStream);
  myStreamRef.current = myStream;
  const cameraOnRef = useRef(cameraOn);
  cameraOnRef.current = cameraOn;
  const micOnRef = useRef(micOn);
  micOnRef.current = micOn;
  const screenSharingRef = useRef(screenSharing);
  screenSharingRef.current = screenSharing;

  // Sync viewerCount from myStream when it changes (e.g. after a refresh via
  // checkMyStream). This keeps the streamer's count correct even if socket events
  // haven't arrived yet. Socket events still take precedence once they fire.
  useEffect(() => {
    if (myStream?.viewerCount != null && isStreamer) {
      setViewerCount(myStream.viewerCount);
    }
  }, [myStream?.viewerCount, isStreamer]);

  // Duration timer
  useEffect(() => {
    if (!myStream?.startedAt || !isStreamer) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(myStream.startedAt).getTime()) / 1000);
      setDuration(elapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [myStream?.startedAt, isStreamer]);

  // Start camera (reuses an existing stream so it's safe to call repeatedly)
  const startCamera = useCallback(async () => {
    if (mediaStreamRef.current) return mediaStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('Failed to access camera:', err);
      return null;
    }
  }, []);

  // Get the active media stream (camera or screen share)
  const getActiveStream = useCallback(() => {
    if (screenSharingRef.current && screenStreamRef.current) {
      return screenStreamRef.current;
    }
    return mediaStreamRef.current;
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOn(videoTrack.enabled);
      }
    }
  }, []);

  // Toggle mic
  const toggleMic = useCallback(() => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  }, []);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (screenSharingRef.current) {
      // Stop screen sharing, revert to camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (mediaStreamRef.current) {
        const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
        if (videoTrack) videoTrack.enabled = true;
      }
      // Replace tracks on all peer connections with camera
      const camVideo = mediaStreamRef.current?.getVideoTracks()[0];
      const camAudio = mediaStreamRef.current?.getAudioTracks()[0];
      peerConnectionsRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        if (camVideo) {
          const vs = senders.find((s) => s.track?.kind === 'video');
          if (vs) vs.replaceTrack(camVideo).catch(console.error);
        }
        if (camAudio) {
          const as = senders.find((s) => s.track?.kind === 'audio');
          if (as) as.replaceTrack(camAudio).catch(console.error);
        }
      });
      setScreenSharing(false);
      setCameraOn(true);

      // Notify viewers so they re-bind the stream to their video element
      const socket = getSocket();
      if (socket && activeStreamRef.current) {
        socket.emit('stream:tracks-changed', { streamId: activeStreamRef.current._id });
      }
    } else {
      try {
        let screenStream;
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        } catch {
          // Fallback: try without audio if user denied audio permission
          screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        }
        screenStreamRef.current = screenStream;
        setScreenShareError('');

        screenStream.getVideoTracks()[0].onended = () => {
          // Revert to camera
          if (mediaStreamRef.current) {
            const vt = mediaStreamRef.current.getVideoTracks()[0];
            if (vt) vt.enabled = true;
          }
          const cv = mediaStreamRef.current?.getVideoTracks()[0];
          const ca = mediaStreamRef.current?.getAudioTracks()[0];
          peerConnectionsRef.current.forEach((pc) => {
            const senders = pc.getSenders();
            if (cv) { const vs = senders.find((s) => s.track?.kind === 'video'); if (vs) vs.replaceTrack(cv).catch(console.error); }
            if (ca) { const as = senders.find((s) => s.track?.kind === 'audio'); if (as) as.replaceTrack(ca).catch(console.error); }
          });
          setScreenSharing(false);
          setCameraOn(true);

          const socket = getSocket();
          if (socket && activeStreamRef.current) {
            socket.emit('stream:tracks-changed', { streamId: activeStreamRef.current._id });
          }
        };

        // Replace tracks on all peer connections with screen share
        const screenVideoTrack = screenStream.getVideoTracks()[0];
        const screenAudioTrack = screenStream.getAudioTracks()[0];
        peerConnectionsRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track?.kind === 'video');
          if (videoSender) videoSender.replaceTrack(screenVideoTrack).catch(console.error);
          // Replace audio with screen audio if available, otherwise keep camera mic
          if (screenAudioTrack) {
            const audioSender = senders.find((s) => s.track?.kind === 'audio');
            if (audioSender) audioSender.replaceTrack(screenAudioTrack).catch(console.error);
          }
        });

        if (mediaStreamRef.current) {
          const vt = mediaStreamRef.current.getVideoTracks()[0];
          if (vt) vt.enabled = false;
        }
        setScreenSharing(true);
        setCameraOn(false);

        // Notify viewers so they re-bind the stream to their video element
        const socket = getSocket();
        if (socket && activeStreamRef.current) {
          socket.emit('stream:tracks-changed', { streamId: activeStreamRef.current._id });
        }
      } catch (err) {
        console.error('Screen share failed:', err);
        setScreenShareError('Failed to start screen share. Please try again.');
      }
    }
  }, []);

  // Start WebRTC for streamer (call after joining stream room)
  const startStreamerWebRTC = useCallback((streamId) => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewViewer = async ({ viewerId, streamId: sid }) => {
      if (sid !== streamId) return;

      // Wait for camera to be ready (up to 5 seconds)
      let mediaStream = getActiveStream();
      for (let i = 0; i < 50 && !mediaStream; i++) {
        await new Promise((r) => setTimeout(r, 100));
        mediaStream = getActiveStream();
      }
      if (!mediaStream) {
        console.error('Camera not ready for viewer', viewerId);
        return;
      }

      try {
        // Close any existing connection for this viewer before creating a new one
        const existingPc = peerConnectionsRef.current.get(viewerId);
        if (existingPc) {
          try { existingPc.close(); } catch {}
        }

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peerConnectionsRef.current.set(viewerId, pc);

        // Build a combined stream: video from active stream, audio from screen (if any) or camera mic
        const tracksToAdd = [];
        const videoTrack = screenSharingRef.current && screenStreamRef.current
          ? screenStreamRef.current.getVideoTracks()[0]
          : mediaStream.getVideoTracks()[0];
        if (videoTrack) tracksToAdd.push(videoTrack);

        let audioTrack = null;
        if (screenSharingRef.current && screenStreamRef.current) {
          audioTrack = screenStreamRef.current.getAudioTracks()[0];
        }
        if (!audioTrack) {
          audioTrack = mediaStream.getAudioTracks()[0];
        }
        if (audioTrack) tracksToAdd.push(audioTrack);

        tracksToAdd.forEach((track) => {
          pc.addTrack(track, mediaStream);
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('stream:ice-candidate', { streamId, candidate: event.candidate, targetUserId: viewerId });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            pc.close();
            peerConnectionsRef.current.delete(viewerId);
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('stream:offer', { streamId, offer: pc.localDescription, targetUserId: viewerId });
      } catch (err) {
        console.error('Error creating offer for viewer:', err);
      }
    };

    const handleViewerAnswer = async ({ streamId: sid, answer, fromUserId }) => {
      if (sid !== streamId) return;
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        // Flush any ICE candidates that arrived before the answer
        const pending = pc._pendingCandidates || [];
        pc._pendingCandidates = [];
        for (const c of pending) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch {}
        }
      } catch (err) {
        console.error('Error setting viewer answer:', err);
      }
    };

    const handleIceCandidate = async ({ streamId: sid, candidate, fromUserId }) => {
      if (sid !== streamId) return;
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (!pc) return;
      // Buffer candidates until we have the remote description so none are lost
      if (!pc.remoteDescription) {
        if (!pc._pendingCandidates) pc._pendingCandidates = [];
        pc._pendingCandidates.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    const handleViewerDisconnected = ({ viewerId, streamId: sid }) => {
      if (sid !== streamId) return;
      const pc = peerConnectionsRef.current.get(viewerId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(viewerId);
      }
    };

    // Remove old listeners first (safe to call multiple times)
    socket.off('stream:new-viewer');
    socket.off('stream:answer');
    socket.off('stream:ice-candidate');
    socket.off('stream:viewer-disconnected');

    socket.on('stream:new-viewer', handleNewViewer);
    socket.on('stream:answer', handleViewerAnswer);
    socket.on('stream:ice-candidate', handleIceCandidate);
    socket.on('stream:viewer-disconnected', handleViewerDisconnected);

    // Store cleanup function
    return () => {
      socket.off('stream:new-viewer', handleNewViewer);
      socket.off('stream:answer', handleViewerAnswer);
      socket.off('stream:ice-candidate', handleIceCandidate);
      socket.off('stream:viewer-disconnected', handleViewerDisconnected);
    };
  }, [getActiveStream]);

  // Start a new live stream
  const startStream = useCallback(async ({ title, description, stream }) => {
    try {
      const data = await createStreamApi({ title, description });
      const liveStream = data.data.stream;
      setMyStream(liveStream);
      setActiveStream(liveStream);
      setIsStreamer(true);
      setStreamChatMessages([]);
      setStreamViewers([]);
      setViewerCount(0);
      setStreamEnded(false);

      // Reuse the GoLiveModal preview stream (avoids a second camera acquisition
      // that can fail while the preview stream still holds the camera).
      if (stream) {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        mediaStreamRef.current = stream;
      } else {
        await startCamera();
      }

      // Join the stream room as streamer
      const socket = getSocket();
      if (socket) {
        socket.emit('stream:join-as-streamer', { streamId: liveStream._id });
        setupStreamListeners(socket, liveStream._id, true);
        startStreamerWebRTC(liveStream._id);
      }

      return liveStream;
    } catch (error) {
      throw error;
    }
  }, [startCamera, startStreamerWebRTC]);

  // End the current stream
  const endCurrentStream = useCallback(async () => {
    if (!myStreamRef.current) return;
    try {
      const socket = getSocket();
      if (socket) {
        socket.emit('stream:end', { streamId: myStreamRef.current._id });
      }
      await endStreamApi(myStreamRef.current._id);

      // Close all peer connections
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();

      // Stop media
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }

      setMyStream(null);
      setActiveStream(null);
      setIsStreamer(false);
      setStreamChatMessages([]);
      setStreamViewers([]);
      setViewerCount(0);
      setStreamEnded(true);
      setScreenSharing(false);
      setCameraOn(true);
      setMicOn(true);
    } catch (error) {
      throw error;
    }
  }, []);

  // Join a stream as viewer (sets state only, socket join happens in StreamViewer)
  const joinStream = useCallback(async (stream) => {
    setActiveStream(stream);
    setIsStreamer(false);
    setStreamChatMessages([]);
    setStreamViewers([]);
    setViewerCount(stream.viewerCount || 0);
    setStreamEnded(false);

    const socket = getSocket();
    if (socket) {
      setupStreamListeners(socket, stream._id, false);
    }
  }, []);

  // Leave a stream
  const leaveStream = useCallback(() => {
    const socket = getSocket();
    if (socket && activeStreamRef.current) {
      socket.emit('stream:leave', { streamId: activeStreamRef.current._id });
      cleanupStreamListeners(socket);
    }
    setActiveStream(null);
    setIsStreamer(false);
    setStreamChatMessages([]);
    setStreamViewers([]);
    setViewerCount(0);
    setStreamEnded(false);
  }, []);

  // Send a chat message
  const sendStreamChat = useCallback((content) => {
    const socket = getSocket();
    if (socket && activeStreamRef.current) {
      socket.emit('stream:chat', { streamId: activeStreamRef.current._id, content });
    }
  }, []);

  // Remove a viewer (streamer only)
  const removeStreamViewer = useCallback((viewerId) => {
    const socket = getSocket();
    if (socket && myStreamRef.current) {
      socket.emit('stream:remove-viewer', { streamId: myStreamRef.current._id, viewerId });
    }
  }, []);

  // Block a viewer (streamer only)
  const blockStreamViewer = useCallback((viewerId) => {
    const socket = getSocket();
    if (socket && myStreamRef.current) {
      socket.emit('stream:block-viewer', { streamId: myStreamRef.current._id, viewerId });
    }
  }, []);

  // Delete a chat message (streamer only)
  const deleteStreamChatMessage = useCallback((messageId) => {
    const socket = getSocket();
    if (socket && myStreamRef.current) {
      socket.emit('stream:delete-chat', { streamId: myStreamRef.current._id, messageId });
    }
  }, []);

  // Setup socket listeners for a stream
  const setupStreamListeners = useCallback((socket, streamId, isStreamerRole) => {
    if (!socket) return;

    // Stop streamer media/PeerConnections when the stream ends (idempotent, no-op for viewers)
    const teardownStreamerMedia = () => {
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setScreenSharing(false);
      setCameraOn(true);
      setMicOn(true);
    };

    socket.off('stream:chat-message');
    socket.off('stream:viewer-joined');
    socket.off('stream:viewer-left');
    socket.off('stream:viewer-count-updated');
    socket.off('stream:ended');
    socket.off('stream:removed');
    socket.off('stream:blocked');
    socket.off('stream:chat-deleted');
    socket.off('stream:viewers-list');
    socket.off('stream:streamer-info');
    socket.off('stream:error');

    socket.on('stream:chat-message', (message) => {
      setStreamChatMessages((prev) => [...prev, message]);
    });

    socket.on('stream:viewer-joined', ({ userId, user: u, viewerCount: count }) => {
      setViewerCount(count != null ? count : (streamViewers.length + 1));
      if (u) {
        setStreamViewers((prev) => {
          if (prev.some((v) => v._id === userId)) return prev;
          return [...prev, { _id: userId, name: u.name, avatar: u.avatar }];
        });
      }
    });


    socket.on('stream:viewer-left', ({ userId, viewerCount: count }) => {
      setViewerCount(count != null ? count : Math.max(0, streamViewers.length - 1));
      setStreamViewers((prev) => prev.filter((v) => v._id !== userId));
    });

    socket.on('stream:viewer-count-updated', ({ viewerCount: count }) => {
      setViewerCount(count);
    });

    socket.on('stream:ended', () => {
      setStreamEnded(true);
      setActiveStream(null);
      setMyStream(null);
      setIsStreamer(false);
      teardownStreamerMedia();
    });

    socket.on('stream:removed', () => {
      setActiveStream(null);
      setMyStream(null);
      setIsStreamer(false);
      setStreamEnded(true);
      teardownStreamerMedia();
    });

    socket.on('stream:blocked', () => {
      setActiveStream(null);
      setMyStream(null);
      setIsStreamer(false);
      setStreamEnded(true);
      teardownStreamerMedia();
    });

    socket.on('stream:chat-deleted', ({ messageId }) => {
      setStreamChatMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    socket.on('stream:viewers-list', ({ viewers: viewerIds, viewerCount: count }) => {
      setViewerCount(count || viewers.length);
    });

    socket.on('stream:error', ({ message }) => {
      console.error('Stream error:', message);
    });
  }, []);

  // Cleanup stream listeners
  const cleanupStreamListeners = useCallback((socket) => {
    if (!socket) return;
    socket.off('stream:chat-message');
    socket.off('stream:viewer-joined');
    socket.off('stream:viewer-left');
    socket.off('stream:viewer-count-updated');
    socket.off('stream:ended');
    socket.off('stream:removed');
    socket.off('stream:blocked');
    socket.off('stream:chat-deleted');
    socket.off('stream:viewers-list');
    socket.off('stream:streamer-info');
    socket.off('stream:error');
  }, []);

  // Check if user has an active stream (used to restore after a page refresh)
  const checkMyStream = useCallback(async () => {
    try {
      const data = await getMyActiveStream();
      const stream = data.data.stream;
      if (stream) {
        setMyStream(stream);
        setActiveStream(stream);
        setIsStreamer(true);
        setStreamEnded(false);
        setViewerCount(stream.viewerCount || 0);

        // Re-join the stream room as streamer + restore WebRTC handlers
        const socket = getSocket();
        if (socket) {
          socket.emit('stream:join-as-streamer', { streamId: stream._id });
          setupStreamListeners(socket, stream._id, true);
          startStreamerWebRTC(stream._id);
        }

        // Restart the camera so viewers have video again after a refresh
        startCamera();
      }
    } catch (err) {
      // No active stream
    }
  }, [startStreamerWebRTC, setupStreamListeners, startCamera]);

  // Restore a live stream after a page refresh so nothing changes until it ends
  useEffect(() => {
    if (!user?._id) return;
    let cancelled = false;
    const restore = async () => {
      if (cancelled) return;
      await checkMyStream();
    };
    const run = () => restore();
    // Run once the socket is connected, or immediately if it already is
    const socket = getSocket();
    if (socket?.connected) {
      run();
    } else {
      const unsub = onSocketConnect(() => run());
      return () => {
        cancelled = true;
        unsub();
      };
    }
    return () => {
      cancelled = true;
    };
  }, [user?._id, checkMyStream]);

  // End the active stream automatically when the user logs out (regardless of
  // the current isStreamer flag — the stream may have been started before this
  // component mounted or restored after a refresh).
  useEffect(() => {
    if (!user?._id) return;
    if (!registerLogoutCallback) return;
    return registerLogoutCallback(() => {
      endCurrentStream().catch((err) => console.error('Stream end on logout failed:', err));
    });
  }, [user?._id, endCurrentStream, registerLogoutCallback]);

  return (
    <StreamContext.Provider
      value={{
        myStream,
        setMyStream,
        activeStream,
        setActiveStream,
        streamChatMessages,
        setStreamChatMessages,
        streamViewers,
        setStreamViewers,
        viewerCount,
        setViewerCount,
        isStreamer,
        setIsStreamer,
        streamEnded,
        setStreamEnded,
        cameraOn,
        micOn,
        screenSharing,
        screenShareError,
        setScreenShareError,
        duration,
        mediaStreamRef,
        checkMyStream,
        startStream,
        endCurrentStream,
        joinStream,
        leaveStream,
        sendStreamChat,
        removeStreamViewer,
        blockStreamViewer,
        deleteStreamChatMessage,
        startCamera,
        toggleCamera,
        toggleMic,
        toggleScreenShare,
        startStreamerWebRTC,
        getActiveStream,
        setupStreamListeners,
      }}
    >
      {children}
    </StreamContext.Provider>
  );
};
