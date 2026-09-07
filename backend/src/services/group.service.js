const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const toggleReaction = async (messageId, userId, emoji) => {
  const message = await Message.findById(messageId);
  if (!message) throw new Error('Message not found');

  if (!message.reactions) message.reactions = new Map();

  const reactions = message.reactions;
  const existing = reactions.get(emoji) || [];
  const userObjId = require('mongoose').Types.ObjectId(userId);

  const idx = existing.findIndex((id) => id.toString() === userId.toString());
  if (idx >= 0) {
    existing.splice(idx, 1);
    if (existing.length === 0) {
      reactions.delete(emoji);
    } else {
      reactions.set(emoji, existing);
    }
  } else {
    existing.push(userObjId);
    reactions.set(emoji, existing);
  }

  message.reactions = reactions;
  await message.save();

  return { reactions: message.reactions };
};

const createGroup = async ({ name, description, participantIds, creatorId }) => {
  const conversation = await Conversation.create({
    participants: [creatorId, ...participantIds],
    isGroup: true,
    groupName: name,
    groupDescription: description || '',
    createdBy: creatorId,
    admins: [creatorId],
  });

  return conversation;
};

module.exports = { toggleReaction, createGroup };
