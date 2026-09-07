const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const messageService = require('../services/message.service');
const { successResponse, errorResponse } = require('../utils/response');

const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      hiddenFor: { $ne: req.user._id },
    })
      .populate('participants', 'name avatar isOnline lastSeen')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .lean();

    return successResponse(res, { conversations }, 'Conversations fetched');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, userId] },
    }).populate('participants', 'name avatar isOnline lastSeen');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, userId],
      });
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name avatar isOnline lastSeen');
    }

    return successResponse(res, { conversation }, 'Conversation fetched');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: req.user._id },
    })
      .populate('sender', 'name avatar')
      .populate('replyTo')
      .sort({ createdAt: 1 })
      .lean();

    return successResponse(res, { messages }, 'Messages fetched');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, type, replyTo } = req.body;
    const message = await messageService.createMessage({
      conversationId,
      senderId: req.user._id,
      content,
      type,
      replyTo,
    });
    return successResponse(res, { message }, 'Message sent', 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const editMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const msg = await Message.findById(req.params.messageId);
    if (!msg || msg.sender.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Not authorized', 403);
    }
    msg.content = content;
    msg.editedAt = new Date();
    await msg.save();
    return successResponse(res, { message: msg }, 'Message edited');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { deleteForEveryone } = req.body;
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return errorResponse(res, 'Message not found', 404);

    if (deleteForEveryone) {
      msg.deleted = true;
      msg.content = '';
    } else {
      msg.deletedFor.push(req.user._id);
    }
    await msg.save();
    return successResponse(res, {}, 'Message deleted');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const forwardMessage = async (req, res) => {
  try {
    const { messageId, conversationIds } = req.body;
    const original = await Message.findById(messageId);
    if (!original) return errorResponse(res, 'Message not found', 404);

    for (const convId of conversationIds) {
      await messageService.createMessage({
        conversationId: convId,
        senderId: req.user._id,
        content: original.content,
        type: original.type,
      });
    }

    return successResponse(res, {}, 'Message forwarded');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const toggleFavorite = async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.conversationId);
    if (!conv) return errorResponse(res, 'Conversation not found', 404);

    const current = conv.isFavorite?.get(req.user._id.toString()) || false;
    conv.isFavorite = conv.isFavorite || new Map();
    conv.isFavorite.set(req.user._id.toString(), !current);
    await conv.save();

    return successResponse(res, { isFavorite: !current }, 'Favorite toggled');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const clearConversation = async (req, res) => {
  try {
    await Message.deleteMany({ conversationId: req.params.conversationId });
    return successResponse(res, {}, 'Conversation cleared');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const deleteConversation = async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.conversationId);
    if (!conv) return errorResponse(res, 'Conversation not found', 404);

    conv.hiddenFor = conv.hiddenFor || [];
    if (!conv.hiddenFor.includes(req.user._id)) {
      conv.hiddenFor.push(req.user._id);
    }
    await conv.save();

    return successResponse(res, {}, 'Conversation deleted');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const uploadFile = async (req, res) => {
  try {
    if (!req.file) return errorResponse(res, 'No file uploaded', 400);
    return successResponse(res, { url: `/uploads/${req.file.filename}` }, 'File uploaded', 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  forwardMessage,
  toggleFavorite,
  clearConversation,
  deleteConversation,
  uploadFile,
};
