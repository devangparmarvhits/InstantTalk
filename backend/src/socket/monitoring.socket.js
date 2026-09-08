const logger = require('../utils/logger');
const { ICE_SERVERS } = require('../config/monitoring.config');

// ─── In-memory state ────────────────────────────────────────────────────────
// streamerUserId → { socketId, userName, avatar, sharingSince, viewerCount,
//                    viewers: [], lastActive }
const streamerInfo = new Map();

// viewerSocketId → { userId, streamerId, joinedAt }
const viewerSockets = new Map();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build the public summary list of all active streamers */
const buildLiveUsersList = () =>
  Array.from(streamerInfo.entries()).map(([userId, info]) => ({
    userId,
    userName: info.userName,
    avatar: info.avatar || '',
    sharingSince: info.sharingSince,
    viewerCount: info.viewerCount || 0,
    lastActive: info.lastActive || info.sharingSince,
  }));

/** Broadcast updated live-users list to all sockets */
const broadcastLiveUsers = (io) => {
  io.emit('monitoring:live-users-update', { users: buildLiveUsersList() });
};

const ensureViewerEntry = (viewerSocketId) => {
  if (!viewerSockets.has(viewerSocketId)) {
    viewerSockets.set(viewerSocketId, { userId: null, streamerId: null, joinedAt: null });
  }
  return viewerSockets.get(viewerSocketId);
};

const addViewer = (io, streamerId, viewerSocketId, viewerUser) => {
  const info = streamerInfo.get(streamerId);
  if (!info) return;
  info.viewers = info.viewers || [];
  const existing = info.viewers.find((v) => v.socketId === viewerSocketId);
  if (!existing) {
    info.viewers.push({
      userId: viewerUser._id.toString(),
      name: viewerUser.name,
      avatar: viewerUser.avatar || '',
      joinedAt: Date.now(),
      socketId: viewerSocketId,
    });
    info.viewerCount = info.viewers.length;
  }
  notifyViewerList(io, streamerId);
};

const removeViewer = (io, streamerId, viewerSocketId) => {
  const info = streamerInfo.get(streamerId);
  if (!info) return;
  const idx = (info.viewers || []).findIndex((v) => v.socketId === viewerSocketId);
  if (idx > -1) {
    info.viewers.splice(idx, 1);
    info.viewerCount = info.viewers.length;
  }
  notifyViewerList(io, streamerId);
};

const notifyViewerList = (io, streamerId) => {
  const info = streamerInfo.get(streamerId);
  if (!info) return;
  io.to(info.socketId).emit('monitoring:viewer-list', {
    viewerCount: info.viewerCount,
    viewers: info.viewers || [],
  });
};

const cleanupStreamer = (io, streamerUserId) => {
  const info = streamerInfo.get(streamerUserId);
  if (!info) return;
  (info.viewers || []).forEach((v) => {
    io.to(v.socketId).emit('monitoring:stream-ended', { streamerUserId });
  });
  streamerInfo.delete(streamerUserId);
  broadcastLiveUsers(io);
  logger.info(`Monitoring: streamer ${streamerUserId} cleaned up`);
};

// ─── Socket handler ───────────────────────────────────────────────────────────
module.exports = (io, socket) => {
  const streamerUserId = socket.userId.toString();

  // ── Streamer: Start sharing ──────────────────────────────────────────────
  socket.on('monitoring:start-sharing', async (payload = {}) => {
    if (!payload?.userName) {
      return socket.emit('monitoring:error', { message: 'Invalid start-sharing payload' });
    }

    // If an old session exists for this user, notify the old socket
    const existing = streamerInfo.get(streamerUserId);
    if (existing && existing.socketId !== socket.id) {
      try { io.to(existing.socketId).emit('monitoring:streamer-updated'); } catch {}
    }

    streamerInfo.set(streamerUserId, {
      socketId: socket.id,
      userName: payload.userName,
      avatar: payload.avatar || '',
      sharingSince: Date.now(),
      viewerCount: 0,
      viewers: [],
      lastActive: Date.now(),
    });

    socket.join(`monitoring:streamer:${streamerUserId}`);
    logger.info(`Monitoring: user ${streamerUserId} started sharing (socket ${socket.id})`);

    socket.emit('monitoring:started', {
      streamerUserId,
      userName: payload.userName,
      avatar: payload.avatar || '',
      sharingSince: Date.now(),
      iceServers: ICE_SERVERS,
    });

    broadcastLiveUsers(io);
  });

  // ── Streamer: Stop sharing ───────────────────────────────────────────────
  socket.on('monitoring:stop-sharing', () => {
    const info = streamerInfo.get(streamerUserId);
    if (!info || info.socketId !== socket.id) return;

    logger.info(`Monitoring: user ${streamerUserId} stopped sharing`);
    cleanupStreamer(io, streamerUserId);
    socket.emit('monitoring:stopped');
    socket.leave(`monitoring:streamer:${streamerUserId}`);
  });

  // ── Viewer: Request live users list ────────────────────────────────────
  socket.on('monitoring:get-live-users', () => {
    socket.emit('monitoring:live-users-update', { users: buildLiveUsersList() });
  });

  // ── Viewer: Join a stream ───────────────────────────────────────────────
  socket.on('monitoring:viewer-join', async (data = {}) => {
    const streamerId = data?.streamerUserId?.toString();
    if (!streamerId) {
      return socket.emit('monitoring:error', { message: 'Missing streamerUserId' });
    }
    if (streamerId === streamerUserId) {
      return socket.emit('monitoring:error', { message: 'Cannot watch your own stream' });
    }

    const streamer = streamerInfo.get(streamerId);
    if (!streamer) {
      return socket.emit('monitoring:error', {
        message: 'User is not currently sharing their screen',
      });
    }

    try {
      const User = require('../models/User');
      const viewerUser = await User.findById(socket.userId).select('name avatar').lean();
      if (!viewerUser) {
        return socket.emit('monitoring:error', { message: 'User not found' });
      }

      const entry = ensureViewerEntry(socket.id);
      entry.userId = socket.userId;
      entry.streamerId = streamerId;
      entry.joinedAt = Date.now();

      addViewer(io, streamerId, socket.id, viewerUser);
      socket.join(`monitoring:streamer:${streamerId}`);

      logger.info(`Monitoring: viewer ${socket.userId} joined streamer ${streamerId}`);

      socket.emit('monitoring:viewer-ready', {
        streamerUserId: streamerId,
        streamer: {
          userId: streamerId,
          userName: streamer.userName,
          avatar: streamer.avatar,
          sharingSince: streamer.sharingSince,
          iceServers: ICE_SERVERS,
        },
        viewer: {
          userId: socket.userId,
          name: viewerUser.name,
          avatar: viewerUser.avatar || '',
        },
      });
    } catch (err) {
      logger.error(`Monitoring viewer-join error: ${err.message}`);
      socket.emit('monitoring:error', { message: 'Unable to join monitoring session' });
    }
  });

  // ── Viewer: Leave a stream ──────────────────────────────────────────────
  socket.on('monitoring:viewer-leave', () => {
    const entry = viewerSockets.get(socket.id);
    if (!entry?.streamerId) return;

    removeViewer(io, entry.streamerId, socket.id);
    socket.leave(`monitoring:streamer:${entry.streamerId}`);
    viewerSockets.delete(socket.id);

    logger.info(`Monitoring: viewer ${socket.userId} left streamer ${entry.streamerId}`);
    socket.emit('monitoring:viewer-left');
  });

  // ── SDP: Viewer → Streamer (offer) ─────────────────────────────────────
  socket.on('monitoring:sdp-offer', (data) => {
    const entry = viewerSockets.get(socket.id);
    if (!entry?.streamerId) return;
    const streamer = streamerInfo.get(entry.streamerId);
    if (!streamer) return;

    // Update lastActive
    streamer.lastActive = Date.now();

    io.to(streamer.socketId).emit('monitoring:sdp-offer', {
      fromViewer: socket.userId,
      viewerSocketId: socket.id,
      sdp: data.sdp,
      type: data.type || 'offer',
    });
  });

  // ── SDP: Streamer → Viewer (answer) ────────────────────────────────────
  socket.on('monitoring:sdp-answer', (data) => {
    // Streamer answers a specific viewer
    const info = streamerInfo.get(streamerUserId);
    if (!info || info.socketId !== socket.id) return;

    const targetSocketId = data.viewerSocketId;
    if (targetSocketId) {
      // Answer to a specific viewer
      io.to(targetSocketId).emit('monitoring:sdp-answer', {
        sdp: data.sdp,
        type: data.type || 'answer',
      });
    } else {
      // Broadcast to everyone in the room (fallback)
      socket.to(`monitoring:streamer:${streamerUserId}`).emit('monitoring:sdp-answer', {
        sdp: data.sdp,
        type: data.type || 'answer',
      });
    }
  });

  // ── ICE: Viewer → Streamer ──────────────────────────────────────────────
  socket.on('monitoring:ice-candidate-from-viewer', (data) => {
    const entry = viewerSockets.get(socket.id);
    if (!entry?.streamerId) return;
    const streamer = streamerInfo.get(entry.streamerId);
    if (!streamer) return;

    io.to(streamer.socketId).emit('monitoring:ice-candidate-from-viewer', {
      fromViewer: socket.userId,
      viewerSocketId: socket.id,
      candidate: data.candidate,
    });
  });

  // ── ICE: Streamer → Specific Viewer ────────────────────────────────────
  socket.on('monitoring:ice-candidate-from-streamer', (data) => {
    const info = streamerInfo.get(streamerUserId);
    if (!info || info.socketId !== socket.id) return;

    // Update lastActive
    info.lastActive = Date.now();

    if (data.viewerSocketId) {
      io.to(data.viewerSocketId).emit('monitoring:ice-candidate-from-streamer', {
        candidate: data.candidate,
      });
    } else {
      // Relay to all viewers
      socket.to(`monitoring:streamer:${streamerUserId}`).emit('monitoring:ice-candidate-from-streamer', {
        candidate: data.candidate,
      });
    }
  });

  // ── Heartbeat / connection quality ──────────────────────────────────────
  socket.on('monitoring:heartbeat', (data = {}) => {
    const info = streamerInfo.get(streamerUserId);
    if (info && info.socketId === socket.id) {
      info.lastActive = Date.now();
      if (data.quality) info.connectionQuality = data.quality;
    }
  });

  // ── Disconnect ──────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    // If streamer
    const info = streamerInfo.get(streamerUserId);
    if (info && info.socketId === socket.id) {
      cleanupStreamer(io, streamerUserId);
    }

    // If viewer
    const entry = viewerSockets.get(socket.id);
    if (entry?.streamerId) {
      removeViewer(io, entry.streamerId, socket.id);
      viewerSockets.delete(socket.id);
    }
  });
};
