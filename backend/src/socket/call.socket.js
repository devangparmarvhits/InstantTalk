const Conversation = require('../models/Conversation');
const User = require('../models/User');

const CALL_EVENTS = new Set([
  'call:invite',
  'call:accept',
  'call:reject',
  'call:busy',
  'call:offer',
  'call:answer',
  'call:ice-candidate',
  'call:end',
]);

const callSocket = (io, socket) => {
  socket.onAny(async (event, data = {}) => {
    if (!CALL_EVENTS.has(event)) return;

    const { targetUserId, conversationId } = data;
    if (!targetUserId || !conversationId || targetUserId.toString() === socket.userId.toString()) return;

    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        isGroup: false,
        participants: { $all: [socket.userId, targetUserId] },
      }).select('_id').lean();

      if (!conversation) return;

      const sender = event === 'call:invite'
        ? await User.findById(socket.userId).select('name avatar').lean()
        : null;
      io.to(`user_${targetUserId}`).emit(event, {
        ...data,
        fromUserId: socket.userId,
        ...(sender ? { fromUser: sender } : {}),
      });
    } catch (error) {
      socket.emit('call:error', { message: 'Unable to relay call signal' });
    }
  });
};

module.exports = callSocket;
