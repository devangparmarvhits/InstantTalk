import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket, onSocketConnect } from '../socket/socket';
import { recordCall } from '../services/call.service';

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
    return 'Microphone permission was denied. Allow microphone access in the browser and try again.';
  }
  if (error.name === 'NotReadableError') {
    return 'Microphone is being used by another app. Close it and try again.';
  }
  return error.message || 'Unable to access the microphone.';
};

const initialState = {
  status: 'idle',
  mediaType: null,
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
};

const useCall = ({ conversationId, targetUserId, user, listenIncoming = true }) => {
  const [call, setCall] = useState(initialState);
  const callRef = useRef(initialState);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const remoteStreamRef = useRef(null);
  const activeTargetRef = useRef(targetUserId);
  const activeConversationRef = useRef(conversationId);
  const loggedCallIdsRef = useRef(new Set());
  const ringtoneRef = useRef(null);

  useEffect(() => { activeTargetRef.current = targetUserId; }, [targetUserId]);
  useEffect(() => { activeConversationRef.current = conversationId; }, [conversationId]);

  const updateCall = useCallback((next) => {
    callRef.current = { ...callRef.current, ...next };
    setCall(callRef.current);
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

  const cleanup = useCallback((notify = false, reason = 'completed') => {
    const current = callRef.current;
    stopRingtone();
    if (current.callId && current.remoteUserId && !loggedCallIdsRef.current.has(current.callId)) {
      loggedCallIdsRef.current.add(current.callId);
      const status = reason === 'declined'
        ? 'declined'
        : reason === 'busy'
          ? 'busy'
          : reason === 'failed'
            ? 'failed'
            : current.status === 'connected'
              ? 'completed'
              : 'missed';
      recordCall({
        conversationId: activeConversationRef.current,
        peerId: current.remoteUserId,
        direction: current.status === 'incoming' ? 'incoming' : 'outgoing',
        type: current.mediaType || 'audio',
        status,
        duration: current.elapsedSeconds || 0,
        startedAt: current.connectedAt ? new Date(current.connectedAt).toISOString() : undefined,
        endedAt: new Date().toISOString(),
      }).catch(() => {});
    }
    if (notify && current.callId && current.remoteUserId && current.conversationId) {
      getSocket()?.emit('call:end', {
        targetUserId: current.remoteUserId,
        conversationId: current.conversationId,
        callId: current.callId,
      });
    }
    peerRef.current?.close();
    peerRef.current = null;
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    stopMedia();
    const resetState = { ...initialState };
    callRef.current = resetState;
    setCall(resetState);
  }, [stopMedia, stopRingtone]);

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
      if (peer.connectionState === 'failed') {
        updateCall({ error: 'Connection is unstable. You can end the call and try again.' });
      }
      if (peer.connectionState === 'connected') {
        const nextConnectedAt = callRef.current.connectedAt || Date.now();
        updateCall({ status: 'connected', connectedAt: nextConnectedAt, elapsedSeconds: 0, error: '' });
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

  const startCall = useCallback(async (mediaType) => {
    if (!conversationId || !targetUserId || callRef.current.status !== 'idle') return;
    const callId = makeCallId();
    updateCall({ status: 'ringing', mediaType, callId, remoteUserId: targetUserId, error: '' });
    try {
      await requestMedia(mediaType);
      const socket = getSocket();
      socket?.emit('call:invite', { targetUserId, conversationId, callId, mediaType });
    } catch (error) {
      cleanup(false);
      setCall({ ...initialState, error: mediaErrorMessage(error, mediaType) });
    }
  }, [conversationId, createPeer, targetUserId, requestMedia, updateCall, cleanup]);

  const acceptCall = useCallback(async () => {
    const current = callRef.current;
    if (current.status !== 'incoming') return;
    stopRingtone();
    updateCall({ status: 'connecting' });
    try {
      await requestMedia(current.mediaType);
      getSocket()?.emit('call:accept', {
        targetUserId: current.remoteUserId,
        conversationId: current.conversationId || conversationId,
        callId: current.callId,
        mediaType: current.mediaType,
      });
      createPeer(current.remoteUserId, current.callId, current.mediaType);
    } catch (error) {
      getSocket()?.emit('call:reject', { targetUserId: current.remoteUserId, conversationId, callId: current.callId });
      cleanup(false);
      setCall({ ...initialState, error: mediaErrorMessage(error, current.mediaType) });
    }
  }, [conversationId, createPeer, requestMedia, updateCall, cleanup, stopRingtone]);

  const rejectCall = useCallback(() => {
    const current = callRef.current;
    if (current.remoteUserId) {
      getSocket()?.emit('call:reject', { targetUserId: current.remoteUserId, conversationId, callId: current.callId });
    }
    cleanup(false);
  }, [conversationId, cleanup]);

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

  useEffect(() => {
    const removeConnectListener = onSocketConnect((socket) => {
      const handleInvite = (data) => {
        if (!listenIncoming) return;
        const current = callRef.current;
        if (current.status !== 'idle' && current.callId !== data.callId) {
          socket.emit('call:busy', { targetUserId: data.fromUserId, conversationId: data.conversationId, callId: data.callId });
          return;
        }
        activeTargetRef.current = data.fromUserId;
        activeConversationRef.current = data.conversationId;
        updateCall({ status: 'incoming', mediaType: data.mediaType, callId: data.callId, remoteUserId: data.fromUserId, remoteUser: data.fromUser, conversationId: data.conversationId, error: '' });
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
          socket.emit('call:answer', { targetUserId: data.fromUserId, conversationId: data.conversationId, callId: data.callId, answer });
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
        if (peerRef.current?.remoteDescription) await peerRef.current.addIceCandidate(data.candidate).catch(() => {});
        else pendingCandidatesRef.current.push(data.candidate);
      };
      const handleReject = (data) => { if (data.callId === callRef.current.callId) { stopRingtone(); cleanup(false, 'declined'); } };
      const handleBusy = (data) => { if (data.callId === callRef.current.callId) { stopRingtone(); cleanup(false, 'busy'); } };
      const handleEnd = (data) => { if (data.callId === callRef.current.callId) { stopRingtone(); cleanup(false); } };
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
      return () => {
        socket.off('call:invite', handleInvite);
        socket.off('call:accept', handleAccept);
        socket.off('call:offer', handleOffer);
        socket.off('call:answer', handleAnswer);
        socket.off('call:ice-candidate', handleCandidate);
        socket.off('call:reject', handleReject);
        socket.off('call:busy', handleBusy);
        socket.off('call:end', handleEnd);
        socket.off('call:error', handleError);
      };
    });
    return () => {
      removeConnectListener();
      const socket = getSocket();
      ['call:invite', 'call:accept', 'call:offer', 'call:answer', 'call:ice-candidate', 'call:reject', 'call:busy', 'call:end', 'call:error']
        .forEach((event) => socket?.off(event));
      cleanup(false);
    };
  }, [addPendingCandidates, cleanup, listenIncoming, updateCall]);

  useEffect(() => {
    if (call.status !== 'connected' || !call.connectedAt) return undefined;
    const timer = setInterval(() => {
      updateCall({ elapsedSeconds: Math.floor((Date.now() - call.connectedAt) / 1000) });
    }, 1000);
    return () => clearInterval(timer);
  }, [call.status, call.connectedAt, updateCall]);

  useEffect(() => {
    if (call.status !== 'incoming' || ringtoneRef.current) return undefined;
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

  useEffect(() => {
    if (!['ringing', 'incoming'].includes(call.status)) return undefined;
    const timeout = setTimeout(() => cleanup(true, 'missed'), 30000);
    return () => clearTimeout(timeout);
  }, [call.status, cleanup]);

  useEffect(() => () => cleanup(false), [cleanup]);

  return { call, startCall, acceptCall, rejectCall, endCall, toggleMute, toggleSpeaker, toggleCamera };
};

export default useCall;
