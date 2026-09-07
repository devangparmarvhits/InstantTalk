import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getSocket, onSocketConnect } from '../socket/socket';
import { recordGroupCall } from '../services/call.service';
import { AuthContext } from './AuthContext';

export const GroupCallContext = createContext(null);

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const MAX_PARTICIPANTS = 4;

const formatDuration = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

const mediaErrorMessage = (error, mediaType = 'audio') => {
  if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
    return mediaType === 'video'
      ? 'Microphone or camera not found. Connect or enable both, then try again.'
      : 'Microphone not found. Connect or enable a microphone, then try again.';
  }
  if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
    return 'Microphone permission was denied. Allow microphone access in the browser and try again.';
  }
  if (error.name === 'NotReadableError') {
    return 'Microphone is being used by another app. Close it and try again.';
  }
  return error.message || 'Unable to access the microphone.';
};

const initialGroupCallState = {
  status: 'idle',        // idle | ringing | incoming | connecting | connected | ended
  mediaType: null,       // audio | video
  conversationId: null,
  conversationName: null,
  localStream: null,
  remoteStreams: {},     // { userId: { stream, user } }
  participants: [],      // [{ userId, user }]
  error: '',
  isMuted: false,
  isCameraOff: false,
  connectedAt: null,
  elapsedSeconds: 0,
  direction: null,       // incoming | outgoing
  callerInfo: null,      // who initiated the call (for incoming)
};

export const GroupCallProvider = ({ children }) => {
  const { user } = useContext(AuthContext);

  const [groupCall, setGroupCall] = useState(initialGroupCallState);
  const groupCallRef = useRef(initialGroupCallState);
  const peerRefsRef = useRef({});       // { userId: RTCPeerConnection }
  const localStreamRef = useRef(null);
  const remoteStreamsRef = useRef({});   // { userId: { stream, user } }
  const pendingCandidatesRef = useRef({}); // { userId: [candidates] }
  const activeConversationRef = useRef(null);
  const loggedCallRef = useRef(false);
  const socketListenersSetupRef = useRef(false);
  const ringtoneRef = useRef(null);
  const timerRef = useRef(null);
  const disconnectTimersRef = useRef({}); // { userId: timeoutId }

  const updateGroupCall = useCallback((next) => {
    groupCallRef.current = { ...groupCallRef.current, ...next };
    setGroupCall({ ...groupCallRef.current });
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      clearInterval(ringtoneRef.current.timer);
      ringtoneRef.current.context.close().catch(() => {});
      ringtoneRef.current = null;
    }
  }, []);

  const stopMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  }, []);

  const closePeer = useCallback((userId) => {
    if (disconnectTimersRef.current[userId]) {
      clearTimeout(disconnectTimersRef.current[userId]);
      delete disconnectTimersRef.current[userId];
    }
    if (peerRefsRef.current[userId]) {
      peerRefsRef.current[userId].close();
      delete peerRefsRef.current[userId];
    }
    if (remoteStreamsRef.current[userId]) {
      delete remoteStreamsRef.current[userId];
    }
    if (pendingCandidatesRef.current[userId]) {
      delete pendingCandidatesRef.current[userId];
    }
  }, []);

  const cleanup = useCallback((notify = false, reason = 'completed') => {
    const current = groupCallRef.current;
    stopRingtone();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Log group call to history
    if (current.conversationId && !loggedCallRef.current) {
      loggedCallRef.current = true;
      const status =
        reason === 'declined' ? 'declined'
        : reason === 'busy' ? 'busy'
        : reason === 'failed' ? 'failed'
        : reason === 'missed' ? 'missed'
        : current.status === 'connected' ? 'completed'
        : current.status === 'incoming' ? 'missed'
        : 'missed';
      const participantUserIds = current.participants.map((p) => p.userId);
      recordGroupCall({
        conversationId: current.conversationId,
        type: current.mediaType || 'audio',
        status,
        duration: current.elapsedSeconds || 0,
        startedAt: current.connectedAt ? new Date(current.connectedAt).toISOString() : undefined,
        endedAt: new Date().toISOString(),
        participantIds: participantUserIds,
      }).catch(() => {});
    }

    // Notify server
    if (notify && current.conversationId) {
      const socket = getSocket();
      if (socket) {
        socket.emit('group-call:leave', { conversationId: current.conversationId });
      }
    }

    // Close all peers
    Object.keys(peerRefsRef.current).forEach(closePeer);
    peerRefsRef.current = {};
    remoteStreamsRef.current = {};
    pendingCandidatesRef.current = {};
    disconnectTimersRef.current = {};

    stopMedia();
    activeConversationRef.current = null;
    groupCallRef.current = { ...initialGroupCallState };
    setGroupCall({ ...initialGroupCallState });
  }, [stopRingtone, stopMedia, closePeer]);

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
    updateGroupCall({ localStream: stream });
    return stream;
  }, [updateGroupCall]);

  const addPendingCandidates = useCallback(async (peer, userId) => {
    const candidates = (pendingCandidatesRef.current[userId] || []).splice(0);
    await Promise.all(candidates.map((candidate) => peer.addIceCandidate(candidate).catch(() => {})));
  }, []);

  const createPeerForUser = useCallback((remoteUserId, remoteUser, mediaType) => {
    // Close existing peer for this user if any
    closePeer(remoteUserId);

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRefsRef.current[remoteUserId] = peer;

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.enabled = true;
        peer.addTrack(track, localStreamRef.current);
      });
    }

    peer.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream();
      if (!event.streams[0] && !stream.getTracks().includes(event.track)) stream.addTrack(event.track);
      event.track.enabled = true;
      remoteStreamsRef.current[remoteUserId] = { stream, user: remoteUser };
      updateGroupCall({ remoteStreams: { ...remoteStreamsRef.current } });
    };

    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        const socket = getSocket();
        socket?.emit('group-call:ice-candidate', {
          targetUserId: remoteUserId,
          conversationId: activeConversationRef.current,
          candidate,
        });
      }
    };

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === 'connected') {
        if (disconnectTimersRef.current[remoteUserId]) {
          clearTimeout(disconnectTimersRef.current[remoteUserId]);
          delete disconnectTimersRef.current[remoteUserId];
        }
      }
      if (state === 'failed') {
        // Mark this participant as having connection issues
        updateGroupCall({ error: `Connection to ${remoteUser?.name || 'a participant'} is unstable.` });
      }
      if (state === 'disconnected' || state === 'failed') {
        if (!disconnectTimersRef.current[remoteUserId] && groupCallRef.current.status === 'connected') {
          disconnectTimersRef.current[remoteUserId] = setTimeout(() => {
            // If still disconnected, close this peer
            if (!peerRefsRef.current[remoteUserId] || peerRefsRef.current[remoteUserId].connectionState === 'disconnected' || peerRefsRef.current[remoteUserId].connectionState === 'failed') {
              closePeer(remoteUserId);
              const remaining = Object.keys(peerRefsRef.current);
              if (remaining.length === 0) {
                cleanup(false);
              }
            }
          }, 8000);
        }
      }
    };

    return peer;
  }, [cleanup, closePeer, updateGroupCall]);

  // ─── Start a group call ───
  const startGroupCall = useCallback(async (conversationId, mediaType = 'audio', conversationName = 'Group') => {
    if (!conversationId || groupCallRef.current.status !== 'idle') return;

    activeConversationRef.current = conversationId;
    loggedCallRef.current = false;

    updateGroupCall({
      status: 'ringing',
      mediaType,
      conversationId,
      conversationName,
      direction: 'outgoing',
      error: '',
    });

    try {
      await requestMedia(mediaType);
      const socket = getSocket();
      if (!socket) throw new Error('Socket not connected');
      socket.emit('group-call:invite', { conversationId, mediaType });
    } catch (error) {
      cleanup(false);
      setGroupCall({ ...initialGroupCallState, error: mediaErrorMessage(error, mediaType) });
    }
  }, [requestMedia, updateGroupCall, cleanup]);

  // ─── Accept incoming group call ───
  const acceptGroupCall = useCallback(async () => {
    const current = groupCallRef.current;
    if (current.status !== 'incoming') return;
    stopRingtone();
    updateGroupCall({ status: 'connecting' });

    try {
      await requestMedia(current.mediaType);
      const socket = getSocket();
      socket?.emit('group-call:accept', {
        conversationId: current.conversationId,
      });
    } catch (error) {
      const socket = getSocket();
      socket?.emit('group-call:reject', { conversationId: current.conversationId });
      cleanup(false);
      setGroupCall({ ...initialGroupCallState, error: mediaErrorMessage(error, current.mediaType) });
    }
  }, [requestMedia, updateGroupCall, cleanup, stopRingtone]);

  // ─── Reject incoming group call ───
  const rejectGroupCall = useCallback(() => {
    const current = groupCallRef.current;
    const socket = getSocket();
    socket?.emit('group-call:reject', { conversationId: current.conversationId });
    cleanup(false);
  }, [cleanup]);

  // ─── Leave active group call ───
  const leaveGroupCall = useCallback(() => cleanup(true), [cleanup]);

  // ─── End group call (caller only) ───
  const endGroupCall = useCallback(() => {
    const socket = getSocket();
    const current = groupCallRef.current;
    socket?.emit('group-call:end', { conversationId: current.conversationId });
    cleanup(false);
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const nextMuted = !groupCallRef.current.isMuted;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
    updateGroupCall({ isMuted: nextMuted });
  }, [updateGroupCall]);

  const toggleCamera = useCallback(() => {
    const nextOff = !groupCallRef.current.isCameraOff;
    localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = !nextOff; });
    updateGroupCall({ isCameraOff: nextOff });
  }, [updateGroupCall]);

  // ─── Socket.IO listeners ───
  useEffect(() => {
    if (!user) return;

    const setupSocketListeners = (socket) => {
      if (!socket || socketListenersSetupRef.current) return;
      socketListenersSetupRef.current = true;

      // Remove old listeners
      ['group-call:invite', 'group-call:invite-sent', 'group-call:accepted',
       'group-call:participant-joined', 'group-call:participant-left',
       'group-call:participant-rejected', 'group-call:offer', 'group-call:answer',
       'group-call:ice-candidate', 'group-call:ended', 'group-call:error',
       'group-call:reject'].forEach((e) => socket.off(e));

      const handleInvite = (data) => {
        const current = groupCallRef.current;
        if (current.status !== 'idle') {
          socket.emit('group-call:reject', { conversationId: data.conversationId });
          return;
        }
        activeConversationRef.current = data.conversationId;
        loggedCallRef.current = false;
        updateGroupCall({
          status: 'incoming',
          mediaType: data.mediaType,
          conversationId: data.conversationId,
          direction: 'incoming',
          callerInfo: data.fromUser,
          participantIds: data.participantIds,
          error: '',
        });
      };

      const handleInviteSent = (data) => {
        updateGroupCall({
          conversationId: data.conversationId,
          mediaType: data.mediaType,
          status: 'ringing',
        });
      };

      // Deterministic tie-break: the participant with the SMALLER user id acts
      // as the "offerer" for a given peer pair, the other acts as "answerer".
      // This prevents both sides creating offers at the same time and avoids
      // the glare/race you get in a naive mesh.
      const shouldBeOfferer = (remoteUserId) => {
        const myId = user._id.toString();
        return myId.localeCompare(remoteUserId.toString()) < 0;
      };

      const createOfferTo = async (remoteUserId, remoteUser, mediaType) => {
        if (peerRefsRef.current[remoteUserId]) return;
        const peer = createPeerForUser(remoteUserId, remoteUser, mediaType);
        const socket = getSocket();
        try {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          socket?.emit('group-call:offer', {
            targetUserId: remoteUserId,
            conversationId: groupCallRef.current.conversationId,
            offer,
            mediaType,
          });
        } catch {
          closePeer(remoteUserId);
        }
      };

      const handleAccepted = async (data) => {
        const current = groupCallRef.current;
        if (data.conversationId !== current.conversationId) return;
        stopRingtone();

        // This client is joining an active call — build peers with everyone
        // currently in the call. Whoever has the smaller id creates the offer.
        updateGroupCall({ status: 'connecting' });
        const existingParticipants = (data.participantIds || []).filter(
          (pId) => pId !== user._id.toString()
        );
        for (const pId of existingParticipants) {
          if (shouldBeOfferer(pId)) {
            await createOfferTo(pId, null, current.mediaType);
          } else {
            // We wait for their offer; just ensure a peer object exists later
            // (created lazily in handleOffer) — nothing to do here.
          }
        }
      };

      const handleParticipantJoined = async (data) => {
        const current = groupCallRef.current;
        if (data.conversationId !== current.conversationId) return;

        // Update participants list
        const newParticipants = (data.participantIds || []).map((pId) => ({
          userId: pId,
          user: pId === data.userId ? data.user : (current.participants.find((p) => p.userId === pId) || {}).user,
        }));
        updateGroupCall({ participants: newParticipants });

        // If we are already connecting/connected, connect with the new participant.
        // Deterministic offerer rule prevents double-offers.
        if (['connecting', 'connected'].includes(current.status) && data.userId !== user._id.toString()) {
          if (peerRefsRef.current[data.userId]) return; // already connected
          if (shouldBeOfferer(data.userId)) {
            await createOfferTo(data.userId, data.user, current.mediaType);
          }
          // else: their smaller-id client will send us an offer
        }
      };

      const handleParticipantLeft = (data) => {
        const current = groupCallRef.current;
        if (data.conversationId !== current.conversationId) return;

        closePeer(data.userId);
        const newParticipants = (data.participants || data.participantIds || [])
          .map((p) => (typeof p === 'string' ? { userId: p } : p))
          .filter((p) => p.userId !== user._id.toString());
        updateGroupCall({
          participants: newParticipants,
          remoteStreams: { ...remoteStreamsRef.current },
        });

        // If no remote participants left, clean up
        if (newParticipants.length === 0) {
          cleanup(false);
        }
      };

      const handleParticipantRejected = (data) => {
        // Just a notification, no action needed
      };

      const handleOffer = async (data) => {
        const current = groupCallRef.current;
        if (data.conversationId !== current.conversationId) return;

        // Create a peer only if we don't already have one for this user.
        // This client is the "answerer" for this pair.
        let peer = peerRefsRef.current[data.fromUserId];
        if (!peer) {
          peer = createPeerForUser(data.fromUserId, data.fromUser, current.mediaType);
        }
        try {
          await peer.setRemoteDescription(data.offer);
          await addPendingCandidates(peer, data.fromUserId);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          const socket = getSocket();
          socket?.emit('group-call:answer', {
            targetUserId: data.fromUserId,
            conversationId: data.conversationId,
            answer,
          });
        } catch {
          closePeer(data.fromUserId);
        }
      };

      const handleAnswer = async (data) => {
        const current = groupCallRef.current;
        if (data.conversationId !== current.conversationId) return;
        const peer = peerRefsRef.current[data.fromUserId];
        if (!peer) return;
        try {
          await peer.setRemoteDescription(data.answer);
          await addPendingCandidates(peer, data.fromUserId);
        } catch {
          closePeer(data.fromUserId);
        }
      };

      const handleCandidate = async (data) => {
        const current = groupCallRef.current;
        if (data.conversationId !== current.conversationId) return;
        const peer = peerRefsRef.current[data.fromUserId];
        if (peer?.remoteDescription) {
          await peer.addIceCandidate(data.candidate).catch(() => {});
        } else {
          if (!pendingCandidatesRef.current[data.fromUserId]) {
            pendingCandidatesRef.current[data.fromUserId] = [];
          }
          pendingCandidatesRef.current[data.fromUserId].push(data.candidate);
        }
      };

      const handleEnded = (data) => {
        const current = groupCallRef.current;
        if (data.conversationId !== current.conversationId) return;
        stopRingtone();
        cleanup(false);
      };

      const handleError = (data) => updateGroupCall({ error: data.message || 'Group call signaling failed' });

      socket.on('group-call:invite', handleInvite);
      socket.on('group-call:invite-sent', handleInviteSent);
      socket.on('group-call:accepted', handleAccepted);
      socket.on('group-call:participant-joined', handleParticipantJoined);
      socket.on('group-call:participant-left', handleParticipantLeft);
      socket.on('group-call:participant-rejected', handleParticipantRejected);
      socket.on('group-call:offer', handleOffer);
      socket.on('group-call:answer', handleAnswer);
      socket.on('group-call:ice-candidate', handleCandidate);
      socket.on('group-call:ended', handleEnded);
      socket.on('group-call:error', handleError);
    };

    const unsubscribe = onSocketConnect(setupSocketListeners);

    return () => {
      unsubscribe();
      socketListenersSetupRef.current = false;
      const socket = getSocket();
      if (socket) {
        ['group-call:invite', 'group-call:invite-sent', 'group-call:accepted',
         'group-call:participant-joined', 'group-call:participant-left',
         'group-call:participant-rejected', 'group-call:offer', 'group-call:answer',
         'group-call:ice-candidate', 'group-call:ended', 'group-call:error',
         'group-call:reject'].forEach((e) => socket.off(e));
      }
    };
  }, [user, addPendingCandidates, cleanup, createPeerForUser, updateGroupCall, stopRingtone, closePeer]);

  // ─── Timer for connected calls ───
  useEffect(() => {
    if (groupCall.status !== 'connected' || !groupCall.connectedAt) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = setInterval(() => {
      updateGroupCall({ elapsedSeconds: Math.floor((Date.now() - groupCall.connectedAt) / 1000) });
    }, 1000);
    return () => { clearInterval(timerRef.current); timerRef.current = null; };
  }, [groupCall.status, groupCall.connectedAt, updateGroupCall]);

  // ─── Auto-transition to connected when participants exist ───
  useEffect(() => {
    if (groupCall.status === 'connecting' && Object.keys(remoteStreamsRef.current).length > 0) {
      updateGroupCall({ status: 'connected', connectedAt: groupCall.connectedAt || Date.now(), error: '' });
    }
  }, [groupCall.status, groupCall.remoteStreams, updateGroupCall]);

  // Also transition to connected when we get our first peer connection
  useEffect(() => {
    if (groupCall.status === 'connecting' && Object.keys(peerRefsRef.current).length > 0) {
      const timer = setTimeout(() => {
        if (groupCallRef.current.status === 'connecting') {
          updateGroupCall({ status: 'connected', connectedAt: groupCallRef.current.connectedAt || Date.now(), error: '' });
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [groupCall.status, groupCall.participants, updateGroupCall]);

  // ─── Ringtone for incoming calls ───
  useEffect(() => {
    if (groupCall.status !== 'incoming' || ringtoneRef.current) return;
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
  }, [groupCall.status, stopRingtone]);

  // ─── 60s timeout for unanswered calls ───
  useEffect(() => {
    if (!['ringing', 'incoming'].includes(groupCall.status)) return;
    const timeout = setTimeout(() => {
      cleanup(true, 'missed');
    }, 60000);
    return () => clearTimeout(timeout);
  }, [groupCall.status, cleanup]);

  // ─── Cleanup on unmount ───
  useEffect(() => () => cleanup(false), [cleanup]);

  const value = {
    groupCall,
    startGroupCall,
    acceptGroupCall,
    rejectGroupCall,
    leaveGroupCall,
    endGroupCall,
    toggleMute,
    toggleCamera,
    formatDuration,
  };

  return <GroupCallContext.Provider value={value}>{children}</GroupCallContext.Provider>;
};

export const useGroupCallContext = () => {
  const ctx = useContext(GroupCallContext);
  if (!ctx) throw new Error('useGroupCallContext must be used within a GroupCallProvider');
  return ctx;
};
