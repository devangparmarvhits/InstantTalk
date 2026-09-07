const Conversation = require('../models/Conversation');
const User = require('../models/User');

const groupCallSocket = (io, socket) => {
  const GC_EVENTS = [
    'group-call:invite',
    'group-call:accept',
    'group-call:reject',
    'group-call:offer',
    'group-call:answer',
    'group-call:ice-candidate',
    'group-call:end',
    'group-call:join',
    'group-call:leave',
  ];

  GC_EVENTS.forEach((event) => {
    socket.on(event, async (data = {}) => {
      const { conversationId, targetUserId } = data;
      if (!conversationId) return;

      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          isGroup: true,
          participants: socket.userId,
        }).select('_id participants').lean();

        if (!conversation) return;

        if (targetUserId) {
          io.to(`user_${targetUserId}`).emit(event, {
            ...data,
            fromUserId: socket.userId,
          });
        } else {
          conversation.participants.forEach((pId) => {
            const pIdStr = pId._id ? pId._id.toString() : pId.toString();
            if (pIdStr !== socket.userId.toString()) {
              io.to(`user_${pIdStr}`).emit(event, {
                ...data,
                fromUserId: socket.userId,
              });
            }
          });
        }
      } catch (error) {
        socket.emit('group-call:error', { message: 'Unable to relay signal' });
      }
    });
  });
};

module.exports = groupCallSocket;
