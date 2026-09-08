import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { AuthContext } from './AuthContext';
import { monitoringService } from '../services/monitoring.service';
import { buildIceServers } from '../utils/webrtc-utils';

const LiveMonitoringContext = createContext(null);

// ─── WebRTC factory ──────────────────────────────────────────────────────────
const createPeerConnection = (iceServers) => {
  const pc = new RTCPeerConnection({ iceServers });
  return pc;
};

// ─── Format seconds as HH:MM:SS ─────────────────────────────────────────────
export const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
};

// ─── Provider ────────────────────────────────────────────────────────────────
const LiveMonitoringProvider = ({ children }) => {
  const { user, token, registerLogoutCallback } = useContext(AuthContext);

  // Core mode state
  const [mode, setMode] = useState(null);           // 'streamer' | 'viewer' | null
  const [sharingState, setSharingState] = useState('idle'); // 'idle'|'requesting'|'sharing'|'stopped'

  // Streamer info
  const [streamer, setStreamer] = useState(null);   // { userId, userName, avatar, sharingSince }

  // Viewer info
  const [viewerInfo, setViewerInfo] = useState(null);
  const [viewerList, setViewerList] = useState([]); // Connected viewers (for streamer side)

  // Admin/Viewer live users list
  const [liveUsers, setLiveUsers] = useState([]);  // All users currently sharing

  // Connection status & quality
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  // 'disconnected' | 'connecting' | 'connected' | 'failed'
  const [connectionQuality, setConnectionQuality] = useState('unknown');
  // 'unknown' | 'good' | 'medium' | 'poor'

  // Session duration (in seconds, increments while sharing/connected)
  const [sessionDuration, setSessionDuration] = useState(0);

  // Error
  const [error, setError] = useState(null);

  // ── Refs ────────────────────────────────────────────────────────────────
  const localStreamRef  = useRef(null);
  const pcRef           = useRef(null);
  const iceServersRef   = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const sessionTimerRef = useRef(null);
  const heartbeatRef    = useRef(null);
  const currentStreamerRef = useRef(null); // for reconnect

  // ── Helpers ─────────────────────────────────────────────────────────────

  const stopSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const startSessionTimer = useCallback(() => {
    stopSessionTimer();
    setSessionDuration(0);
    sessionTimerRef.current = setInterval(() => {
      setSessionDuration((s) => s + 1);
    }, 1000);
  }, [stopSessionTimer]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatRef.current = setInterval(() => {
      monitoringService.emitHeartbeat(connectionQuality);
    }, 10000);
  }, [connectionQuality, stopHeartbeat]);

  const closePc = useCallback(() => {
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
  }, []);

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      try { localStreamRef.current.getTracks().forEach((t) => t.stop()); } catch {}
      localStreamRef.current = null;
    }
  }, []);

  /** Derive connection quality from WebRTC connectionState */
  const deriveQuality = (state) => {
    if (state === 'connected' || state === 'completed') return 'good';
    if (state === 'connecting') return 'medium';
    return 'poor';
  };

  /** Attach connection state change listeners to a PeerConnection */
  const attachPcListeners = useCallback((pc) => {
    const update = () => {
      if (!pc) return;
      const s = pc.connectionState;
      if (s === 'connected' || s === 'completed') {
        setConnectionStatus('connected');
        setConnectionQuality('good');
      } else if (s === 'connecting' || s === 'new') {
        setConnectionStatus('connecting');
        setConnectionQuality('medium');
      } else if (s === 'disconnected') {
        setConnectionStatus('disconnected');
        setConnectionQuality('poor');
      } else if (s === 'failed') {
        setConnectionStatus('failed');
        setConnectionQuality('poor');
      }
    };
    pc.onconnectionstatechange = update;
    pc.oniceconnectionstatechange = update;
    return update;
  }, []);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    stopSessionTimer();
    stopHeartbeat();
    stopLocalStream();
    closePc();

    setMode(null);
    setStreamer(null);
    setViewerInfo(null);
    setViewerList([]);
    setConnectionStatus('disconnected');
    setConnectionQuality('unknown');
    setError(null);
    setSharingState('idle');
    setSessionDuration(0);
    iceServersRef.current = null;
    reconnectAttemptRef.current = 0;
    currentStreamerRef.current = null;
  }, [stopSessionTimer, stopHeartbeat, stopLocalStream, closePc]);

  // ── Streamer: Start sharing ──────────────────────────────────────────────
  const startSharing = useCallback(() => {
    if (!user || !token) return;
    setError(null);
    setMode('streamer');
    setStreamer(null);
    setViewerList([]);
    setConnectionStatus('connecting');
    setConnectionQuality('unknown');
    setSharingState('requesting');
    closePc();
    stopLocalStream();

    monitoringService.emitStartSharing({
      userName: user.name,
      avatar: user.avatar || '',
    });

    // preferCurrentTab: true  → Chrome 107+ pre-selects this tab, no picker shown
    // displaySurface: 'browser' → limits options to browser tabs only
    // selfBrowserSurface: 'include' → allows capturing the current page itself
    navigator.mediaDevices
      .getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'browser',
        },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        surfaceSwitching: 'exclude',
        systemAudio: 'exclude',
      })
      .then((stream) => {
        localStreamRef.current = stream;
        setSharingState('sharing');

        // When the user stops sharing via the browser UI
        stream.getVideoTracks()[0].onended = () => {
          stopSharing();
        };
      })
      .catch((err) => {
        const denied = err.name === 'NotAllowedError' || err.name === 'NotFoundError';
        setSharingState(denied ? 'stopped' : 'idle');
        setError(
          denied
            ? 'Screen sharing permission denied. Please allow screen share when prompted.'
            : 'Unable to start screen sharing: ' + err.message,
        );
        setMode(null);
        monitoringService.emitStopSharing();
      });
  }, [user, token, closePc, stopLocalStream]);

  // ── Streamer: Stop sharing ───────────────────────────────────────────────
  const stopSharing = useCallback(() => {
    stopLocalStream();
    closePc();
    stopSessionTimer();
    stopHeartbeat();
    monitoringService.emitStopSharing();
    setSharingState('idle');
    setMode(null);
    setConnectionStatus('disconnected');
    setConnectionQuality('unknown');
    setViewerList([]);
    setStreamer(null);
    setSessionDuration(0);
  }, [stopLocalStream, closePc, stopSessionTimer, stopHeartbeat]);

  // ── Viewer: Start watching ───────────────────────────────────────────────
  const startWatching = useCallback(
    (streamerUserId) => {
      if (!user || !token) return;
      setError(null);
      setMode('viewer');
      setStreamer(null);
      setViewerInfo(null);
      setConnectionStatus('connecting');
      closePc();
      currentStreamerRef.current = streamerUserId;
      monitoringService.emitViewerJoin(streamerUserId);
    },
    [user, token, closePc],
  );

  // ── Viewer: Stop watching ────────────────────────────────────────────────
  const stopWatching = useCallback(() => {
    closePc();
    stopSessionTimer();
    monitoringService.emitViewerLeave();
    setMode(null);
    setStreamer(null);
    setViewerInfo(null);
    setConnectionStatus('disconnected');
    setConnectionQuality('unknown');
    setError(null);
    setSessionDuration(0);
    currentStreamerRef.current = null;
  }, [closePc, stopSessionTimer]);

  // ── Fetch live users ─────────────────────────────────────────────────────
  const refreshLiveUsers = useCallback(() => {
    monitoringService.emitGetLiveUsers();
  }, []);

  // ── Streamer socket event handlers ───────────────────────────────────────
  useEffect(() => {
    if (mode !== 'streamer') return;

    const unsubStarted = monitoringService.onStarted((payload) => {
      iceServersRef.current =
        payload.iceServers ||
        buildIceServers(
          import.meta.env?.VITE_TURN_URL,
          import.meta.env?.VITE_TURN_USERNAME,
          import.meta.env?.VITE_TURN_CREDENTIAL,
        );

      setStreamer({
        userId: payload.streamerUserId,
        userName: payload.userName,
        avatar: payload.avatar,
        sharingSince: payload.sharingSince,
      });

      startSessionTimer();
      startHeartbeat();
      setConnectionStatus('connecting');
    });

    const unsubViewerList = monitoringService.onViewerList((listPayload) => {
      setViewerList(listPayload?.viewers || []);
    });

    // Viewer sends an SDP offer → streamer creates answer
    const unsubSdpOffer = monitoringService.onSdpOffer((data) => {
      if (!localStreamRef.current) return;

      // Create a fresh pc for this viewer
      const iceServers = iceServersRef.current || [{ urls: 'stun:stun.l.google.com:19302' }];
      const pc = createPeerConnection(iceServers);
      pcRef.current = pc;
      attachPcListeners(pc);

      // Add local screen tracks
      localStreamRef.current.getTracks().forEach((track) => {
        try { pc.addTrack(track, localStreamRef.current); } catch {}
      });

      // Relay ICE candidates to this specific viewer
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          monitoringService.emitIceCandidateFromStreamer({
            viewerSocketId: data.viewerSocketId,
            candidate: event.candidate,
          });
        }
      };

      const desc = new RTCSessionDescription({ type: data.type || 'offer', sdp: data.sdp });
      pc.setRemoteDescription(desc)
        .then(() => pc.createAnswer())
        .then((answer) => pc.setLocalDescription(answer))
        .then(() => {
          monitoringService.emitSdpAnswer({
            viewerSocketId: data.viewerSocketId,
            sdp: pc.localDescription.sdp,
            type: 'answer',
          });
          setConnectionStatus('connecting');
        })
        .catch(() => setConnectionStatus('failed'));
    });

    // Viewer ICE candidates → add to pc
    const unsubViewerIce = monitoringService.onIceCandidateFromViewer((data) => {
      if (!pcRef.current || !data.candidate) return;
      pcRef.current.addIceCandidate(data.candidate).catch(() => {});
    });

    const unsubStopped = monitoringService.onStopped(() => cleanup());
    const unsubError   = monitoringService.onError((err) => setError(err?.message || 'Monitoring error'));

    return () => {
      unsubStarted();
      unsubViewerList();
      unsubSdpOffer();
      unsubViewerIce();
      unsubStopped();
      unsubError();
    };
  }, [mode, attachPcListeners, startSessionTimer, startHeartbeat, cleanup]);

  // ── Viewer socket event handlers ─────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'viewer') return;

    const unsubReady = monitoringService.onViewerReady((payload) => {
      setStreamer({
        userId: payload.streamerUserId,
        userName: payload.streamer?.userName,
        avatar:   payload.streamer?.avatar,
        sharingSince: payload.streamer?.sharingSince,
      });
      setViewerInfo({
        userId: payload.viewer?.userId,
        name:   payload.viewer?.name,
        avatar: payload.viewer?.avatar,
      });

      const iceServers =
        payload.streamer?.iceServers ||
        buildIceServers(
          import.meta.env?.VITE_TURN_URL,
          import.meta.env?.VITE_TURN_USERNAME,
          import.meta.env?.VITE_TURN_CREDENTIAL,
        );
      iceServersRef.current = iceServers;

      const pc = createPeerConnection(iceServers);
      pcRef.current = pc;
      attachPcListeners(pc);

      // Relay viewer ICE → server → streamer
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          monitoringService.emitIceCandidateFromViewer({ candidate: event.candidate });
        }
      };

      // Receive remote stream from streamer
      pc.ontrack = (event) => {
        if (event.streams?.[0]) {
          // Context exposes pcRef so LiveMonitoring.jsx can attach to a <video>
        }
      };

      // Create offer
      pc.createOffer({ offerToReceiveVideo: 1, offerToReceiveAudio: 0 })
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          monitoringService.emitSdpOffer({
            sdp: pc.localDescription.sdp,
            type: 'offer',
          });
          setConnectionStatus('connecting');
        })
        .catch(() => setConnectionStatus('failed'));

      startSessionTimer();
    });

    const unsubAnswer = monitoringService.onSdpAnswer((data) => {
      if (!pcRef.current) return;
      const desc = new RTCSessionDescription({ type: data.type || 'answer', sdp: data.sdp });
      pcRef.current.setRemoteDescription(desc).catch(() => {});
    });

    const unsubStreamerIce = monitoringService.onIceCandidateFromStreamer((data) => {
      if (!pcRef.current || !data.candidate) return;
      pcRef.current.addIceCandidate(data.candidate).catch(() => {});
    });

    const unsubEnded = monitoringService.onStreamEnded((data) => {
      if (data?.streamerUserId === currentStreamerRef.current) {
        setConnectionStatus('disconnected');
        setConnectionQuality('unknown');
        setStreamer(null);
        setViewerInfo(null);
        stopSessionTimer();
        // Schedule reconnect attempt
        reconnectAttemptRef.current += 1;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current - 1), 30000);
        reconnectTimerRef.current = setTimeout(() => {
          if (currentStreamerRef.current && mode === 'viewer') {
            monitoringService.emitViewerJoin(currentStreamerRef.current);
          }
        }, delay);
      }
    });

    const unsubViewerLeft = monitoringService.onViewerLeft(() => {
      setConnectionStatus('disconnected');
      setStreamer(null);
      setViewerInfo(null);
      stopSessionTimer();
    });

    const unsubError = monitoringService.onError((err) => setError(err?.message || 'Monitoring error'));

    return () => {
      unsubReady();
      unsubAnswer();
      unsubStreamerIce();
      unsubEnded();
      unsubViewerLeft();
      unsubError();
    };
  }, [mode, attachPcListeners, startSessionTimer, stopSessionTimer]);

  // ── Live users list listener (always active) ─────────────────────────────
  useEffect(() => {
    if (!user) return;

    const unsubLiveUsers = monitoringService.onLiveUsersUpdate((payload) => {
      setLiveUsers(payload?.users || []);
    });

    // Fetch on mount
    monitoringService.emitGetLiveUsers();

    return () => unsubLiveUsers();
  }, [user]);

  // ── Logout cleanup ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const unregister = registerLogoutCallback(cleanup);
    return unregister;
  }, [user, registerLogoutCallback, cleanup]);

  // ── Context value ────────────────────────────────────────────────────────
  const value = {
    user,
    mode,
    sharingState,
    streamer,
    viewerInfo,
    viewerList,
    liveUsers,
    connectionStatus,
    connectionQuality,
    sessionDuration,
    error,
    startSharing,
    stopSharing,
    startWatching,
    stopWatching,
    refreshLiveUsers,
    localStreamRef,
    pcRef,
    iceServersRef,
  };

  return (
    <LiveMonitoringContext.Provider value={value}>
      {children}
    </LiveMonitoringContext.Provider>
  );
};

export const useLiveMonitoring = () => {
  const ctx = useContext(LiveMonitoringContext);
  if (!ctx) throw new Error('useLiveMonitoring must be used within LiveMonitoringProvider');
  return ctx;
};

export default LiveMonitoringProvider;
