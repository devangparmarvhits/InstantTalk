import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getSocket, onSocketConnect } from '../socket/socket';
import { recordCall } from '../services/call.service';
import { AuthContext } from './AuthContext';

export const CallContext = createContext(null);

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

const makeCallId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const mediaErrorMessage = (error, mediaType = 'audio') => {
  if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
    return mediaType === 'video'
      ? 'Microphone or camera not found. Connect or enable both, then try again.'
      : 'Microphone not found. Connect or enable a microphone, then try again.';
  }
  if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
    return mediaType === 'video'
      ? 'Microphone/camera permission was denied. Allow both permissions in the browser and try again.'
      : 'Microphone permission was denied. Allow microphone access in the browser and try again.';
  }
  if (error.name === 'NotReadableError') {
    return 'Microphone is being used by another app. Close it and try again.';
  }
  return error.message || 'Unable to access the microphone.';
};

const formatDuration = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

const initialCallState = {
  status: 'idle',       // idle | ringing | incoming | connecting | connected | ended | declined | busy | missed
  mediaType: null,      // audio | video
  callId: null,
  remoteUserId: null,
  remoteUser: null,
  conversationId: null,
  localStream: null,
  remoteStream: null,
  error: '',
  isMuted: false,
  isSpeakerOn: true,
  isCameraOff: false,
  connectedAt: null,
  elapsedSeconds: 0,
  direction: null,      // incoming | outgoing
};

export const CallProvider = ({ children }) => {
  const { user } = useContext(AuthContext);

  const [call, setCall] = useState(initialCallState);
  const callRef = useRef(initialCallState);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const remoteStreamRef = useRef(null);
  const activeTargetRef = useRef(null);
  const activeConversationRef = useRef(null);
  const loggedCallIdsRef = useRef(new Set());
  const endedCallIdsRef = useRef(new Set());
  const ringtoneRef = useRef(null);
  const timerRef = useRef(null);
  const disconnectGraceTimerRef = useRef(null);
  const socketListenersSetupRef = useRef(false);

  const updateCall = useCallback((next) => {
    callRef.current = { ...callRef.current, ...next };
    setCall({ ...callRef.current });
  }, []);

  const stopMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      clearInterval(ringtoneRef.current.timer);
      ringtoneRef.current.context.close().catch(() => {});
      ringtoneRef.current = null;
    }
  }, []);

  const teardownPeer = useCallback(() => {
    if (disconnectGraceTimerRef.current) {
      clearTimeout(disconnectGraceTimerRef.current);
      disconnectGraceTimerRef.current = null;
    }
    peerRef.current?.close();
    peerRef.current = null;
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    stopMedia();
  }, [stopMedia]);

  const cleanup = useCallback((notify = false, reason = 'completed') => {
    const current = callRef.current;
    stopRingtone();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Log call to history
    if (current.callId && current.remoteUserId && !loggedCallIdsRef.current.has(current.callId)) {
      loggedCallIdsRef.current.add(current.callId);
      const status =
        reason === 'declined' ? 'declined'
        : reason === 'busy' ? 'busy'
        : reason === 'failed' ? 'failed'
        : reason === 'missed' ? 'missed'
        : current.status === 'connected' ? 'completed'
        : current.status === 'incoming' ? 'missed'
        : 'missed';
      const convId = current.conversationId || activeConversationRef.current;
      if (convId) {
        recordCall({
          conversationId: convId,
          peerId: current.remoteUserId,
          direction: current.direction || (current.status === 'incoming' ? 'incoming' : 'outgoing'),
          type: current.mediaType || 'audio',
          status,
          duration: current.elapsedSeconds || 0,
          startedAt: current.connectedAt ? new Date(current.connectedAt).toISOString() : undefined,
          endedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }

    // Notify remote user
    if (notify && current.callId && current.remoteUserId && current.conversationId) {
      getSocket()?.emit('call:end', {
        targetUserId: current.remoteUserId,
        conversationId: current.conversationId,
        callId: current.callId,
      });
    }

    // Remember this call as ended so a late/duplicate invite can't reopen it
    if (current.callId) {
      endedCallIdsRef.current.add(current.callId);
      // Keep the set from growing unbounded
      setTimeout(() => endedCallIdsRef.current.delete(current.callId), 20000);
    }

    teardownPeer();
    activeTargetRef.current = null;
    activeConversationRef.current = null;
    callRef.current = { ...initialCallState };
    setCall({ ...initialCallState });
  }, [stopRingtone, teardownPeer]);

  const addPendingCandidates = useCallback(async (peer) => {
    const candidates = pendingCandidatesRef.current.splice(0);
    await Promise.all(candidates.map((candidate) => peer.addIceCandidate(candidate).catch(() => {})));
  }, []);

  const createPeer = useCallback((remoteUserId, callId, mediaType) => {
    if (peerRef.current) return peerRef.current;
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer;

    localStreamRef.current?.getTracks().forEach((track) => {
      track.enabled = true;
      track.onended = () => updateCall({ error: 'Microphone stopped. Check your microphone connection and try again.' });
      track.onmute = () => updateCall({ error: 'Microphone is muted by the browser or system.' });
      track.onunmute = () => updateCall({ error: '' });
      peer.addTrack(track, localStreamRef.current);
    });

    peer.ontrack = (event) => {
      const stream = event.streams[0] || remoteStreamRef.current || new MediaStream();
      if (!event.streams[0] && !stream.getTracks().includes(event.track)) stream.addTrack(event.track);
      event.track.enabled = true;
      remoteStreamRef.current = stream;
      updateCall({ remoteStream: stream });
    };

    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        getSocket()?.emit('call:ice-candidate', {
          targetUserId: remoteUserId,
          conversationId: activeConversationRef.current,
          callId,
          candidate,
        });
      }
    };

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === 'failed') {
        updateCall({ error: 'Connection is unstable. You can end the call and try again.' });
      }
      if (state === 'connected') {
        if (disconnectGraceTimerRef.current) {
          clearTimeout(disconnectGraceTimerRef.current);
          disconnectGraceTimerRef.current = null;
        }
        const nextConnectedAt = callRef.current.connectedAt || Date.now();
        updateCall({ status: 'connected', connectedAt: nextConnectedAt, elapsedSeconds: 0, error: '' });
      }
      // When the remote peer hangs up / closes, the local peer reaches
      // 'disconnected' then 'closed'. Auto-end locally so the user no longer
      // has to hang up from both sides.
      if (state === 'closed') {
        cleanup(false);
        return;
      }
      if (state === 'disconnected' || state === 'failed') {
        if (!disconnectGraceTimerRef.current && callRef.current.status === 'connected') {
          // Give a short grace period for transient network blips.
          disconnectGraceTimerRef.current = setTimeout(() => {
            disconnectGraceTimerRef.current = null;
            if (!peerRef.current || peerRef.current.connectionState === 'disconnected' || peerRef.current.connectionState === 'failed') {
              cleanup(false);
            }
          }, 4000);
        }
      }
    };

    return peer;
  }, [cleanup, updateCall]);

  const requestMedia = useCallback(async (mediaType) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Calling requires a secure browser connection');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: mediaType === 'video',
    });
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) throw new Error('Microphone track was not created. Check your microphone settings.');
    audioTrack.enabled = true;
    if (audioTrack.readyState !== 'live') throw new Error('Microphone is not active. Check your microphone settings.');
    localStreamRef.current = stream;
    updateCall({ localStream: stream });
    return stream;
  }, [updateCall]);

  const ensureSocketReady = useCallback(async () => {
    const socket = getSocket();
    if (!socket) {
      throw new Error('Socket is not connected. Please reload and try again.');
    }
    if (socket.connected) return socket;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Call connection timed out. Please try again.')), 8000);
      socket.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once('connect_error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      if (!socket.connecting) socket.connect();
    });
    return getSocket();
  }, []);

  // Start an outgoing call
  const startCall = useCallback(async (conversationId, targetUserId, mediaType = 'audio', otherUser = null) => {
    if (!conversationId || !targetUserId || callRef.current.status !== 'idle') return;
    const callId = makeCallId();
    activeTargetRef.current = targetUserId;
    activeConversationRef.current = conversationId;

    updateCall({
      status: 'ringing',
      mediaType,
      callId,
      remoteUserId: targetUserId,
      remoteUser: otherUser,
      conversationId,
      direction: 'outgoing',
      error: '',
    });

    try {
      await requestMedia(mediaType);
      const socket = await ensureSocketReady();
      socket.emit('call:invite', { targetUserId, conversationId, callId, mediaType });
    } catch (error) {
      cleanup(false, 'failed');
      setCall({
        ...initialCallState,
        status: 'ended',
        mediaType,
        remoteUserId: targetUserId,
        remoteUser: otherUser,
        conversationId,
        direction: 'outgoing',
        error: mediaErrorMessage(error, mediaType),
      });
    }
  }, [requestMedia, updateCall, cleanup, ensureSocketReady]);

  // Accept an incoming call
  const acceptCall = useCallback(async () => {
    const current = callRef.current;
    if (current.status !== 'incoming') return;
    stopRingtone();
    updateCall({ status: 'connecting' });
    try {
      await requestMedia(current.mediaType);
      getSocket()?.emit('call:accept', {
        targetUserId: current.remoteUserId,
        conversationId: current.conversationId,
        callId: current.callId,
        mediaType: current.mediaType,
      });
      createPeer(current.remoteUserId, current.callId, current.mediaType);
    } catch (error) {
      getSocket()?.emit('call:reject', {
        targetUserId: current.remoteUserId,
        conversationId: current.conversationId,
        callId: current.callId,
      });
      cleanup(false);
      setCall({ ...initialCallState, error: mediaErrorMessage(error, current.mediaType) });
    }
  }, [createPeer, requestMedia, updateCall, cleanup, stopRingtone]);

  // Reject / decline a call
  const rejectCall = useCallback(() => {
    const current = callRef.current;
    if (current.remoteUserId) {
      getSocket()?.emit('call:reject', {
        targetUserId: current.remoteUserId,
        conversationId: current.conversationId,
        callId: current.callId,
      });
    }
    cleanup(false);
  }, [cleanup]);

  // End an active call
  const endCall = useCallback(() => cleanup(true), [cleanup]);

  const toggleMute = useCallback(() => {
    const nextMuted = !callRef.current.isMuted;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
    updateCall({ isMuted: nextMuted });
  }, [updateCall]);

  const toggleSpeaker = useCallback(() => {
    updateCall({ isSpeakerOn: !callRef.current.isSpeakerOn });
  }, [updateCall]);

  const toggleCamera = useCallback(() => {
    const nextOff = !callRef.current.isCameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = !nextOff; });
    updateCall({ isCameraOff: nextOff });
  }, [updateCall]);

  // ─── Socket.IO listeners (setup once) ───
  useEffect(() => {
    if (!user) return;

    const setupSocketListeners = (socket) => {
      if (!socket || socketListenersSetupRef.current) return;
      socketListenersSetupRef.current = true;

      // Remove previous listeners to prevent duplicates
      ['call:invite', 'call:accept', 'call:offer', 'call:answer', 'call:ice-candidate',
       'call:reject', 'call:busy', 'call:end', 'call:error'].forEach((e) => socket.off(e));

      const handleInvite = (data) => {
        const current = callRef.current;
        // Ignore a stale/duplicate invite for a call that was already ended
        // (prevents the pickup modal from reopening after hanging up).
        if (endedCallIdsRef.current.has(data.callId)) return;
        // If already in a call, send busy
        if (current.status !== 'idle' && current.callId !== data.callId) {
          socket.emit('call:busy', { targetUserId: data.fromUserId, conversationId: data.conversationId, callId: data.callId });
          return;
        }
        activeTargetRef.current = data.fromUserId;
        activeConversationRef.current = data.conversationId;
        updateCall({
          status: 'incoming',
          mediaType: data.mediaType,
          callId: data.callId,
          remoteUserId: data.fromUserId,
          remoteUser: data.fromUser,
          conversationId: data.conversationId,
          direction: 'incoming',
          error: '',
        });
      };

      const handleAccept = (data) => {
        if (data.callId !== callRef.current.callId) return;
        stopRingtone();
        updateCall({ status: 'connecting' });
        const peer = createPeer(data.fromUserId, data.callId, callRef.current.mediaType);
        peer.createOffer().then(async (offer) => {
          await peer.setLocalDescription(offer);
          socket.emit('call:offer', {
            targetUserId: data.fromUserId,
            conversationId: callRef.current.conversationId,
            callId: data.callId,
            mediaType: callRef.current.mediaType,
            offer,
          });
        }).catch(() => cleanup(false));
      };

      const handleOffer = async (data) => {
        if (data.callId !== callRef.current.callId || !peerRef.current) return;
        try {
          await peerRef.current.setRemoteDescription(data.offer);
          await addPendingCandidates(peerRef.current);
          const answer = await peerRef.current.createAnswer();
          await peerRef.current.setLocalDescription(answer);
          socket.emit('call:answer', {
            targetUserId: data.fromUserId,
            conversationId: data.conversationId,
            callId: data.callId,
            answer,
          });
        } catch { cleanup(false); }
      };

      const handleAnswer = async (data) => {
        if (data.callId !== callRef.current.callId || !peerRef.current) return;
        try {
          await peerRef.current.setRemoteDescription(data.answer);
          await addPendingCandidates(peerRef.current);
        } catch { cleanup(false); }
      };

      const handleCandidate = async (data) => {
        if (data.callId !== callRef.current.callId) return;
        if (peerRef.current?.remoteDescription) {
          await peerRef.current.addIceCandidate(data.candidate).catch(() => {});
        } else {
          pendingCandidatesRef.current.push(data.candidate);
        }
      };

      const handleReject = (data) => {
        if (data.callId === callRef.current.callId) {
          stopRingtone();
          cleanup(false, 'declined');
          updateCall({ status: 'ended', error: 'Call declined' });
          setTimeout(() => cleanup(false), 2000);
        }
      };

      const handleBusy = (data) => {
        if (data.callId === callRef.current.callId) {
          stopRingtone();
          cleanup(false, 'busy');
          updateCall({ status: 'ended', error: 'User is busy on another call' });
          setTimeout(() => cleanup(false), 2000);
        }
      };

      const handleEnd = (data) => {
        if (data.callId === callRef.current.callId) {
          stopRingtone();
          cleanup(false);
        }
      };

      const handleError = (data) => updateCall({ error: data.message || 'Call signaling failed' });

      socket.on('call:invite', handleInvite);
      socket.on('call:accept', handleAccept);
      socket.on('call:offer', handleOffer);
      socket.on('call:answer', handleAnswer);
      socket.on('call:ice-candidate', handleCandidate);
      socket.on('call:reject', handleReject);
      socket.on('call:busy', handleBusy);
      socket.on('call:end', handleEnd);
      socket.on('call:error', handleError);
    };

    const unsubscribe = onSocketConnect(setupSocketListeners);

    return () => {
      unsubscribe();
      socketListenersSetupRef.current = false;
      const socket = getSocket();
      if (socket) {
        ['call:invite', 'call:accept', 'call:offer', 'call:answer', 'call:ice-candidate',
         'call:reject', 'call:busy', 'call:end', 'call:error'].forEach((e) => socket.off(e));
      }
    };
  }, [user, addPendingCandidates, cleanup, createPeer, updateCall, stopRingtone]);

  // ─── Timer for connected calls ───
  useEffect(() => {
    if (call.status !== 'connected' || !call.connectedAt) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = setInterval(() => {
      updateCall({ elapsedSeconds: Math.floor((Date.now() - call.connectedAt) / 1000) });
    }, 1000);
    return () => { clearInterval(timerRef.current); timerRef.current = null; };
  }, [call.status, call.connectedAt, updateCall]);

  // ─── Ringtone for incoming calls ───
  useEffect(() => {
    if (call.status !== 'incoming' || ringtoneRef.current) return;
    const context = new window.AudioContext();
    const playTone = () => {
      if (context.state === 'suspended') context.resume().catch(() => {});
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.35);
    };
    playTone();
    ringtoneRef.current = { context, timer: setInterval(playTone, 900) };
    return stopRingtone;
  }, [call.status, stopRingtone]);

  // ─── 30s timeout for unanswered calls ───
  useEffect(() => {
    if (!['ringing', 'incoming'].includes(call.status)) return;
    const timeout = setTimeout(() => {
      cleanup(true, 'missed');
    }, 30000);
    return () => clearTimeout(timeout);
  }, [call.status, cleanup]);

  // ─── Cleanup on unmount ───
  useEffect(() => () => cleanup(false), [cleanup]);

  const value = {
    call,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    toggleCamera,
    formatDuration,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCallContext = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCallContext must be used within a CallProvider');
  return ctx;
};
