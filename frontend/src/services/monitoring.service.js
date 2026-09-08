import { getSocket } from '../socket/socket';

const EVENTS = {
  // Emit (client → server)
  START_SHARING:               'monitoring:start-sharing',
  STOP_SHARING:                'monitoring:stop-sharing',
  VIEWER_JOIN:                 'monitoring:viewer-join',
  VIEWER_LEAVE:                'monitoring:viewer-leave',
  SDP_OFFER:                   'monitoring:sdp-offer',
  SDP_ANSWER:                  'monitoring:sdp-answer',
  ICE_CANDIDATE_FROM_VIEWER:   'monitoring:ice-candidate-from-viewer',
  ICE_CANDIDATE_FROM_STREAMER: 'monitoring:ice-candidate-from-streamer',
  GET_LIVE_USERS:              'monitoring:get-live-users',
  HEARTBEAT:                   'monitoring:heartbeat',

  // Listen (server → client)
  STARTED:                     'monitoring:started',
  STOPPED:                     'monitoring:stopped',
  VIEWER_READY:                'monitoring:viewer-ready',
  VIEWER_LEFT:                 'monitoring:viewer-left',
  VIEWER_LIST:                 'monitoring:viewer-list',
  STREAM_ENDED:                'monitoring:stream-ended',
  STREAMER_UPDATED:            'monitoring:streamer-updated',
  LIVE_USERS_UPDATE:           'monitoring:live-users-update',
  SDP_ANSWER_FROM_STREAMER:    'monitoring:sdp-answer',
  ICE_FROM_STREAMER:           'monitoring:ice-candidate-from-streamer',
  ICE_FROM_VIEWER:             'monitoring:ice-candidate-from-viewer',
  ERROR:                       'monitoring:error',
};

/** Helper — subscribe once and return unsubscribe fn */
const sub = (event, cb) => {
  const socket = getSocket();
  if (!socket) return () => {};
  socket.on(event, cb);
  return () => socket.off(event, cb);
};

export const monitoringService = {
  // ── Emit helpers ───────────────────────────────────────────────────────
  emitStartSharing(payload) {
    getSocket()?.emit(EVENTS.START_SHARING, payload);
  },

  emitStopSharing() {
    getSocket()?.emit(EVENTS.STOP_SHARING);
  },

  emitViewerJoin(streamerUserId) {
    getSocket()?.emit(EVENTS.VIEWER_JOIN, { streamerUserId });
  },

  emitViewerLeave() {
    getSocket()?.emit(EVENTS.VIEWER_LEAVE);
  },

  emitSdpOffer(data) {
    getSocket()?.emit(EVENTS.SDP_OFFER, data);
  },

  emitSdpAnswer(data) {
    getSocket()?.emit(EVENTS.SDP_ANSWER, data);
  },

  emitIceCandidateFromViewer(data) {
    getSocket()?.emit(EVENTS.ICE_CANDIDATE_FROM_VIEWER, data);
  },

  emitIceCandidateFromStreamer(data) {
    getSocket()?.emit(EVENTS.ICE_CANDIDATE_FROM_STREAMER, data);
  },

  emitGetLiveUsers() {
    getSocket()?.emit(EVENTS.GET_LIVE_USERS);
  },

  emitHeartbeat(quality = 'unknown') {
    getSocket()?.emit(EVENTS.HEARTBEAT, { quality });
  },

  // ── Listener helpers ───────────────────────────────────────────────────
  onStarted:              (cb) => sub(EVENTS.STARTED, cb),
  onStopped:              (cb) => sub(EVENTS.STOPPED, cb),
  onViewerReady:          (cb) => sub(EVENTS.VIEWER_READY, cb),
  onViewerLeft:           (cb) => sub(EVENTS.VIEWER_LEFT, cb),
  onViewerList:           (cb) => sub(EVENTS.VIEWER_LIST, cb),
  onStreamEnded:          (cb) => sub(EVENTS.STREAM_ENDED, cb),
  onStreamerUpdated:       (cb) => sub(EVENTS.STREAMER_UPDATED, cb),
  onLiveUsersUpdate:      (cb) => sub(EVENTS.LIVE_USERS_UPDATE, cb),
  onSdpOffer:             (cb) => sub(EVENTS.SDP_OFFER, cb),
  onSdpAnswer:            (cb) => sub(EVENTS.SDP_ANSWER_FROM_STREAMER, cb),
  onIceCandidateFromViewer:   (cb) => sub(EVENTS.ICE_FROM_VIEWER, cb),
  onIceCandidateFromStreamer:  (cb) => sub(EVENTS.ICE_FROM_STREAMER, cb),
  onError:                (cb) => sub(EVENTS.ERROR, cb),
};
