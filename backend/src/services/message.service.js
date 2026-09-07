const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const createMessage = async ({ conversationId, senderId, content, type = 'text', replyTo = null }) => {
  const message = await Message.create({
    conversationId,
    sender: senderId,
    content,
    type,
    replyTo,
  });

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: message._id,
    updatedAt: new Date(),
  });

  const populated = await Message.findById(message._id)
    .populate('sender', 'name avatar')
    .populate('replyTo')
    .lean();

  return populated;
};

const markMessagesRead = async (conversationId, userId, { notify = true } = {}) => {
  const filter = {
    conversationId,
    sender: { $ne: userId },
    readBy: { $ne: userId },
  };

  const messages = await Message.find(filter).select('_id').lean();

  if (messages.length > 0 && notify) {
    await Message.updateMany(filter, {
      $addToSet: { readBy: userId },
      $set: { readAt: new Date() },
    });
  }

  return {
    messages: messages.map((m) => ({
      _id: m._id,
      readAt: new Date(),
      readBy: [userId],
    })),
  };
};

const markMessagesDelivered = async (messageIds, userId) => {
  const filter = {
    _id: { $in: messageIds },
    deliveredAt: null,
  };

  await Message.updateMany(filter, { $set: { deliveredAt: new Date() } });

  const messages = await Message.find({ _id: { $in: messageIds } })
    .select('_id conversationId deliveredAt readAt')
    .lean();

  return { messages };
};

module.exports = { createMessage, markMessagesRead, markMessagesDelivered };
