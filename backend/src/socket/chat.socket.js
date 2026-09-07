const messageService = require('../services/message.service');
const logger = require('../utils/logger');

const chatSocket = (io, socket) => {
  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
  });

  socket.on('leave_conversation', (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on('send_message', async (data) => {
    try {
      const { conversationId, content, type, replyTo } = data;
      const message = await messageService.createMessage({
        conversationId,
        senderId: socket.userId,
        content,
        type,
        replyTo,
      });

      const Conversation = require('../models/Conversation');
      const conv = await Conversation.findById(conversationId);
      if (conv) {
        conv.participants.forEach((pId) => {
          io.to(`user_${pId.toString()}`).emit('new_message', message);
        });
      }
    } catch (error) {
      socket.emit('message_error', { error: error.message });
    }
  });

  socket.on('typing_start', ({ conversationId }) => {
    socket.to(conversationId).emit('user_typing', {
      userId: socket.userId,
      conversationId,
    });
  });

  socket.on('typing_stop', ({ conversationId }) => {
    socket.to(conversationId).emit('user_stop_typing', { conversationId });
  });

  socket.on('mark_read', async ({ conversationId }) => {
    try {
      const { messages } = await messageService.markMessagesRead(conversationId, socket.userId, {
        notify: socket.userSettings?.privacy?.readReceipts !== false,
      });
      const Conversation = require('../models/Conversation');
      const conv = await Conversation.findById(conversationId);
      if (conv) {
        conv.participants.forEach((pId) => {
          io.to(`user_${pId.toString()}`).emit('messages_read', {
            conversationId,
            userId: socket.userId,
            messages,
          });
        });
      }
    } catch (error) {
      logger.error(`Mark read error: ${error.message}`);
    }
  });

  socket.on('message_delivered', async ({ messageIds }) => {
    try {
      if (socket.userSettings?.privacy?.readReceipts === false) return;
      const { messages } = await messageService.markMessagesDelivered(messageIds, socket.userId);
      const byConv = messages.reduce((acc, m) => {
        const mId = m.conversationId ? m.conversationId.toString() : null;
        if (!mId) return acc;
        (acc[mId] = acc[mId] || []).push({
          _id: m._id.toString(),
          deliveredAt: m.deliveredAt,
          readAt: m.readAt,
        });
        return acc;
      }, {});

      Object.entries(byConv).forEach(([convId, msgs]) => {
        io.to(convId).emit('messages_status', { conversationId: convId, messages: msgs });
      });
    } catch (error) {
      logger.error(`Message delivered error: ${error.message}`);
    }
  });

  socket.on('edit_message', async ({ messageId, content }) => {
    try {
      const Message = require('../models/Message');
      const msg = await Message.findById(messageId);
      if (!msg || msg.sender.toString() !== socket.userId) {
        return socket.emit('message_error', { error: 'Not authorized' });
      }
      msg.content = content;
      msg.editedAt = new Date();
      await msg.save();
      io.to(msg.conversationId.toString()).emit('message_edited', {
        _id: msg._id,
        content: msg.content,
        editedAt: msg.editedAt,
      });
    } catch (error) {
      socket.emit('message_error', { error: error.message });
    }
  });

  socket.on('delete_message', async ({ messageId, deleteForEveryone }) => {
    try {
      const Message = require('../models/Message');
      const msg = await Message.findById(messageId);
      if (!msg) return;

      if (deleteForEveryone) {
        const Conversation = require('../models/Conversation');
        const conv = await Conversation.findById(msg.conversationId);
        const isCreator = conv?.createdBy?.toString() === socket.userId;
        const isAdmin = conv?.admins?.some((a) => a.toString() === socket.userId);
        if (msg.sender.toString() !== socket.userId && !isCreator && !isAdmin) {
          return socket.emit('message_error', { error: 'Not authorized' });
        }
        msg.deleted = true;
        msg.content = '';
        await msg.save();
        io.to(msg.conversationId.toString()).emit('message_deleted', {
          _id: msg._id,
          conversationId: msg.conversationId.toString(),
        });
      } else {
        if (!msg.deletedFor.some((id) => id.toString() === socket.userId)) {
          msg.deletedFor.push(socket.userId);
          await msg.save();
        }
        socket.emit('message_deleted_for_me', { _id: msg._id });
      }
    } catch (error) {
      socket.emit('message_error', { error: error.message });
    }
  });

  socket.on('message_reaction', async ({ messageId, emoji }) => {
    try {
      const groupService = require('../services/group.service');
      const Conversation = require('../models/Conversation');
      const Message = require('../models/Message');
      const result = await groupService.toggleReaction(messageId, socket.userId, emoji);
      const msg = await Message.findById(messageId);
      if (msg) {
        const conv = await Conversation.findById(msg.conversationId);
        if (conv) {
          conv.participants.forEach((pId) => {
            io.to(`user_${pId.toString()}`).emit('message_reaction', {
              messageId,
              reactions: result.reactions,
            });
          });
        }
      }
    } catch (error) {
      socket.emit('message_error', { error: error.message });
    }
  });

  socket.on('forward_message', async ({ messageId, conversationIds }) => {
    try {
      const Message = require('../models/Message');
      const Conversation = require('../models/Conversation');
      const original = await Message.findById(messageId);
      if (!original) return;
      for (const convId of conversationIds) {
        const message = await messageService.createMessage({
          conversationId: convId,
          senderId: socket.userId,
          content: original.content,
          type: original.type,
        });
        const conv = await Conversation.findById(convId);
        if (conv) {
          conv.participants.forEach((pId) => {
            io.to(`user_${pId.toString()}`).emit('new_message', message);
          });
        }
      }
    } catch (error) {
      socket.emit('message_error', { error: error.message });
    }
  });
};

module.exports = chatSocket;
