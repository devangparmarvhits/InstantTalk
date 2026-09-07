const Stream = require('../models/Stream');
const User = require('../models/User');
const logger = require('../utils/logger');

const streamSocket = (io, socket) => {
  // Streamer starts broadcasting
  socket.on('stream:join-as-streamer', async ({ streamId }) => {
    const stream = await Stream.findById(streamId);
    if (!stream) return;
    if (stream.streamer.toString() !== socket.userId.toString()) return;

    socket.join(`stream:${streamId}`);
    socket.join(`stream-chat:${streamId}`);
    socket.streamId = streamId;
    socket.streamRole = 'streamer';
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

      if (!stream.viewers.some((id) => id.toString() === userId)) {
        stream.viewers.push(userId);
      }
      stream.viewerCount = stream.viewers.length;
      await stream.save();

      socket.join(`stream:${streamId}`);
      socket.join(`stream-chat:${streamId}`);
      socket.streamId = streamId;
      socket.streamRole = 'viewer';

      const user = await User.findById(userId).select('name avatar').lean();
      io.to(`stream:${streamId}`).emit('stream:viewer-joined', {
        userId,
        user,
        viewerCount: stream.viewerCount,
      });

      const viewerIds = stream.viewers.map((id) => id.toString());
      socket.emit('stream:viewers-list', { viewers: viewerIds, viewerCount: stream.viewerCount });

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

  // WebRTC signaling for stream
  socket.on('stream:offer', ({ streamId, offer, targetUserId }) => {
    io.to(`user_${targetUserId}`).emit('stream:offer', {
      streamId,
      offer,
      fromUserId: socket.userId,
    });
  });

  socket.on('stream:answer', ({ streamId, answer, targetUserId }) => {
    io.to(`user_${targetUserId}`).emit('stream:answer', {
      streamId,
      answer,
      fromUserId: socket.userId,
    });
  });

  socket.on('stream:ice-candidate', ({ streamId, candidate, targetUserId }) => {
    io.to(`user_${targetUserId}`).emit('stream:ice-candidate:viewer', {
      streamId,
      candidate,
      fromUserId: socket.userId,
    });
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
          }
        } catch (error) {
          logger.error(`Stream disconnect cleanup error: ${error.message}`);
        }
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
          }
        } catch (error) {
          logger.error(`Viewer disconnect cleanup error: ${error.message}`);
        }
      }
    }
  });
};

module.exports = streamSocket;
