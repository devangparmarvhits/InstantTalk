const Stream = require('../models/Stream');
const User = require('../models/User');
const logger = require('../utils/logger');

// Grace period timers for streamer disconnect (refresh tolerance)
const disconnectTimers = new Map();
const GRACE_PERIOD_MS = 30000; // 30 seconds

const streamSocket = (io, socket) => {
  // Streamer starts broadcasting
  socket.on('stream:join-as-streamer', async ({ streamId }) => {
    const stream = await Stream.findById(streamId);
    if (!stream) return;
    if (stream.streamer.toString() !== socket.userId.toString()) return;

    // If streamer reconnects during grace period, cancel the end timer
    if (disconnectTimers.has(streamId)) {
      clearTimeout(disconnectTimers.get(streamId));
      disconnectTimers.delete(streamId);
      logger.info(`Streamer reconnected to ${streamId}, grace period cancelled`);
    }

    socket.join(`stream:${streamId}`);
    socket.join(`stream-chat:${streamId}`);
    socket.streamId = streamId;
    socket.streamRole = 'streamer';

    // Streamer reconnected (e.g. after page refresh) — tell existing viewers
    // to re-establish their WebRTC connection right away instead of waiting
    // for their retry timer.
    const roomSockets = io.sockets.adapter.rooms.get(`stream:${streamId}`);
    if (roomSockets) {
      for (const sid of roomSockets) {
        const viewerSocket = io.sockets.sockets.get(sid);
        if (viewerSocket && viewerSocket.streamRole === 'viewer') {
          viewerSocket.emit('stream:streamer-reconnected', { streamId });
        }
      }
    }

    logger.info(`Streamer ${socket.userId} joined stream room ${streamId}`);
  });

  // Viewer joins a live stream
  socket.on('stream:join-as-viewer', async ({ streamId }) => {
    try {
      const stream = await Stream.findById(streamId);
      if (!stream || stream.status !== 'live') {
        socket.emit('stream:error', { message: 'Stream is not live' });
        return;
      }

      const userId = socket.userId.toString();

      if (stream.blockedViewers.some((id) => id.toString() === userId)) {
        socket.emit('stream:error', { message: 'You are blocked from this stream' });
        return;
      }

      // Use $addToSet at the DB level to guarantee no duplicates even if
      // multiple concurrent join requests arrive for the same user.
      const updated = await Stream.findByIdAndUpdate(
        streamId,
        { $addToSet: { viewers: userId } },
        { new: true, runValidators: true }
      ).lean();
      if (!updated) return;

      // Re-read the doc so in-memory state used below matches the DB.
      const freshStream = await Stream.findById(streamId);
      freshStream.viewerCount = freshStream.viewers.length;
      await freshStream.save();

      stream.viewers = freshStream.viewers;
      stream.viewerCount = freshStream.viewerCount;

      socket.join(`stream:${streamId}`);
      socket.join(`stream-chat:${streamId}`);
      socket.streamId = streamId;
      socket.streamRole = 'viewer';

      const user = await User.findById(userId).select('name avatar').lean();
      // Broadcast to everyone in the room *except* the socket that just joined,
      // so the new viewer doesn't receive their own join event.
      socket.to(`stream:${streamId}`).emit('stream:viewer-joined', {
        userId,
        user,
        viewerCount: stream.viewerCount,
      });

      // Send the current count directly to the joining viewer so their UI is
      // correct immediately (their own socket won't receive the broadcast above).
      socket.emit('stream:viewer-joined', {
        userId,
        user,
        viewerCount: stream.viewerCount,
      });

      // Tell the streamer a new viewer wants to connect via WebRTC
      io.to(`stream:${streamId}`).emit('stream:new-viewer', {
        viewerId: userId,
        streamId,
      });

      socket.emit('stream:streamer-info', {
        streamerId: stream.streamer.toString(),
      });

      logger.info(`Viewer ${userId} joined stream ${streamId}`);
    } catch (error) {
      logger.error(`Stream join error: ${error.message}`);
    }
  });

  // Viewer leaves the stream
  socket.on('stream:leave', async ({ streamId }) => {
    try {
      const userId = socket.userId.toString();
      const stream = await Stream.findById(streamId);
      if (!stream) return;

      await Stream.findByIdAndUpdate(streamId, { $pull: { viewers: userId } });

      const updatedStream = await Stream.findById(streamId);
      if (updatedStream) {
        updatedStream.viewerCount = updatedStream.viewers.length;
        await updatedStream.save();

        io.to(`stream:${streamId}`).emit('stream:viewer-left', {
          userId,
          viewerCount: updatedStream.viewerCount,
        });
      }

      // Notify streamer to close this viewer's PeerConnection
      io.to(`stream:${streamId}`).emit('stream:viewer-disconnected', {
        viewerId: userId,
        streamId,
      });

      socket.leave(`stream:${streamId}`);
      socket.leave(`stream-chat:${streamId}`);
      logger.info(`Viewer ${userId} left stream ${streamId}`);
    } catch (error) {
      logger.error(`Stream leave error: ${error.message}`);
    }
  });

  // Streamer ends the stream
  socket.on('stream:end', async ({ streamId }) => {
    try {
      const stream = await Stream.findById(streamId);
      if (!stream || stream.streamer.toString() !== socket.userId.toString()) return;

      stream.status = 'ended';
      stream.endedAt = new Date();
      stream.viewerCount = 0;
      stream.viewers = [];
      await stream.save();

      io.to(`stream:${streamId}`).emit('stream:ended', {
        streamId,
        endedAt: stream.endedAt,
      });

      socket.leave(`stream:${streamId}`);
      socket.leave(`stream-chat:${streamId}`);
      logger.info(`Stream ${streamId} ended by streamer`);
    } catch (error) {
      logger.error(`Stream end error: ${error.message}`);
    }
  });

  // Chat message during stream
  socket.on('stream:chat', async ({ streamId, content }) => {
    try {
      if (!content || !content.trim()) return;

      const user = await User.findById(socket.userId).select('name avatar').lean();
      if (!user) return;

      const message = {
        _id: `stream-msg-${Date.now()}-${socket.userId}`,
        userId: socket.userId.toString(),
        user: { _id: user._id, name: user.name, avatar: user.avatar },
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      io.to(`stream-chat:${streamId}`).emit('stream:chat-message', message);
    } catch (error) {
      logger.error(`Stream chat error: ${error.message}`);
    }
  });

  // Streamer removes a viewer
  socket.on('stream:remove-viewer', async ({ streamId, viewerId }) => {
    try {
      const stream = await Stream.findById(streamId);
      if (!stream || stream.streamer.toString() !== socket.userId.toString()) return;

      await Stream.findByIdAndUpdate(streamId, { $pull: { viewers: viewerId } });

      const updatedStream = await Stream.findById(streamId);
      if (updatedStream) {
        updatedStream.viewerCount = updatedStream.viewers.length;
        await updatedStream.save();
      }

      io.to(`user_${viewerId}`).emit('stream:removed', { streamId });

      io.to(`stream:${streamId}`).emit('stream:viewer-count-updated', {
        viewerCount: updatedStream ? updatedStream.viewerCount : 0,
      });
    } catch (error) {
      logger.error(`Remove viewer error: ${error.message}`);
    }
  });

  // Streamer blocks a viewer
  socket.on('stream:block-viewer', async ({ streamId, viewerId }) => {
    try {
      const stream = await Stream.findById(streamId);
      if (!stream || stream.streamer.toString() !== socket.userId.toString()) return;

      await Stream.findByIdAndUpdate(streamId, {
        $addToSet: { blockedViewers: viewerId },
        $pull: { viewers: viewerId },
      });

      const updatedStream = await Stream.findById(streamId);
      if (updatedStream) {
        updatedStream.viewerCount = updatedStream.viewers.length;
        await updatedStream.save();
      }

      io.to(`user_${viewerId}`).emit('stream:blocked', { streamId });

      io.to(`stream:${streamId}`).emit('stream:viewer-count-updated', {
        viewerCount: updatedStream ? updatedStream.viewerCount : 0,
      });
    } catch (error) {
      logger.error(`Block viewer error: ${error.message}`);
    }
  });

  // WebRTC signaling: Streamer sends offer to a specific viewer
  socket.on('stream:offer', ({ streamId, offer, targetUserId }) => {
    io.to(`user_${targetUserId}`).emit('stream:offer', {
      streamId,
      offer,
      fromUserId: socket.userId,
    });
  });

  // WebRTC signaling: Viewer sends answer to streamer
  socket.on('stream:answer', ({ streamId, answer, targetUserId }) => {
    io.to(`user_${targetUserId}`).emit('stream:answer', {
      streamId,
      answer,
      fromUserId: socket.userId,
    });
  });

  // WebRTC signaling: ICE candidate relay
  socket.on('stream:ice-candidate', ({ streamId, candidate, targetUserId }) => {
    io.to(`user_${targetUserId}`).emit('stream:ice-candidate', {
      streamId,
      candidate,
      fromUserId: socket.userId,
    });
  });

  // Streamer toggled screen share / tracks changed — notify viewers to re-bind stream
  socket.on('stream:tracks-changed', ({ streamId }) => {
    socket.to(`stream:${streamId}`).emit('stream:tracks-changed', { streamId });
  });

  // Streamer deletes an inappropriate chat message
  socket.on('stream:delete-chat', async ({ streamId, messageId }) => {
    try {
      const stream = await Stream.findById(streamId);
      if (!stream || stream.streamer.toString() !== socket.userId.toString()) return;
      io.to(`stream-chat:${streamId}`).emit('stream:chat-deleted', { messageId });
    } catch (error) {
      logger.error(`Delete chat message error: ${error.message}`);
    }
  });

  // Cleanup on disconnect
  socket.on('disconnect', async () => {
    if (socket.streamId) {
      const streamId = socket.streamId;
      const userId = socket.userId.toString();

      if (socket.streamRole === 'streamer') {
        // Don't end stream immediately — streamer might be refreshing
        // Wait 30 seconds, then end if streamer hasn't reconnected
        const timer = setTimeout(async () => {
          disconnectTimers.delete(streamId);
          try {
            const stream = await Stream.findById(streamId);
            if (stream && stream.status === 'live') {
              stream.status = 'ended';
              stream.endedAt = new Date();
              stream.viewerCount = 0;
              stream.viewers = [];
              await stream.save();

              io.to(`stream:${streamId}`).emit('stream:ended', {
                streamId,
                endedAt: stream.endedAt,
              });
              logger.info(`Stream ${streamId} ended after grace period`);
            }
          } catch (error) {
            logger.error(`Stream disconnect cleanup error: ${error.message}`);
          }
        }, GRACE_PERIOD_MS);

        disconnectTimers.set(streamId, timer);
        logger.info(`Streamer disconnected from ${streamId}, grace period started`);
      } else if (socket.streamRole === 'viewer') {
        try {
          await Stream.findByIdAndUpdate(streamId, { $pull: { viewers: userId } });
          const updatedStream = await Stream.findById(streamId);
          if (updatedStream) {
            updatedStream.viewerCount = updatedStream.viewers.length;
            await updatedStream.save();

            io.to(`stream:${streamId}`).emit('stream:viewer-left', {
              userId,
              viewerCount: updatedStream.viewerCount,
            });

            // Notify streamer to close this viewer's PeerConnection
            io.to(`stream:${streamId}`).emit('stream:viewer-disconnected', {
              viewerId: userId,
              streamId,
            });
          }
        } catch (error) {
          logger.error(`Viewer disconnect cleanup error: ${error.message}`);
        }
      }
    }
  });
};

module.exports = streamSocket;
