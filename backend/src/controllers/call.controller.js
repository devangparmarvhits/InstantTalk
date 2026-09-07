const Call = require('../models/Call');
const Conversation = require('../models/Conversation');
const messageService = require('../services/message.service');
const { getIO } = require('../socket/socket');
const { successResponse, errorResponse } = require('../utils/response');

const getCallHistory = async (req, res) => {
  try {
    const callFilter = {
      $or: [{ caller: req.user._id }, { receiver: req.user._id }, { participants: req.user._id }],
      deletedFor: { $ne: req.user._id },
    };
    const [calls, totalCount] = await Promise.all([
      Call.find(callFilter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('conversationId', 'groupName isGroup')
        .populate('caller', 'name avatar')
        .populate('receiver', 'name avatar')
        .populate('participants', 'name avatar')
        .lean(),
      Call.countDocuments(callFilter),
    ]);
    return successResponse(res, { calls, totalCount }, 'Call history fetched');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const deleteCall = async (req, res) => {
  try {
    const call = await Call.findOne({ _id: req.params.callId, $or: [{ caller: req.user._id }, { receiver: req.user._id }] });
    if (!call) return errorResponse(res, 'Call not found', 404);
    await Call.updateOne({ _id: call._id }, { $addToSet: { deletedFor: req.user._id } });
    return successResponse(res, {}, 'Call deleted');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const clearCallHistory = async (req, res) => {
  try {
    await Call.updateMany(
      { $or: [{ caller: req.user._id }, { receiver: req.user._id }] },
      { $addToSet: { deletedFor: req.user._id } }
    );
    return successResponse(res, {}, 'Call history cleared');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const createCallRecord = async (req, res) => {
  try {
    const { conversationId, peerId, type = 'audio', status, duration = 0, startedAt, endedAt } = req.body;
    const validStatuses = ['completed', 'missed', 'declined', 'busy', 'failed'];
    if (!conversationId || !peerId || !validStatuses.includes(status)) {
      return errorResponse(res, 'conversationId, peerId and valid status are required', 400);
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      isGroup: false,
      participants: { $all: [req.user._id, peerId] },
    }).select('_id participants').lean();
    if (!conversation) return errorResponse(res, 'Direct conversation not found', 404);

    const isCaller = req.body.direction === 'outgoing';
    const call = await Call.create({
      conversationId,
      caller: isCaller ? req.user._id : peerId,
      receiver: isCaller ? peerId : req.user._id,
      type: type === 'video' ? 'video' : 'audio',
      status,
      duration: Math.max(0, Number(duration) || 0),
      startedAt: startedAt || undefined,
      endedAt: endedAt || undefined,
    });

    const populated = await Call.findById(call._id)
      .populate('caller', 'name avatar')
      .populate('receiver', 'name avatar')
      .lean();

    if (isCaller) {
      const callMessage = await messageService.createMessage({
        conversationId,
        senderId: req.user._id,
        type: 'call',
        content: JSON.stringify({
          callType: type === 'video' ? 'video' : 'audio',
          status,
          duration: Math.max(0, Number(duration) || 0),
        }),
      });
      const io = getIO();
      conversation.participants.forEach((participantId) => {
        io?.to(`user_${participantId.toString()}`).emit('new_message', callMessage);
      });
    }

    return successResponse(res, { call: populated }, 'Call record created', 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const createGroupCallRecord = async (req, res) => {
  try {
    const { conversationId, type = 'audio', status, duration = 0, startedAt, endedAt, participantIds = [] } = req.body;
    const validStatuses = ['completed', 'missed', 'declined', 'busy', 'failed'];
    if (!conversationId || !validStatuses.includes(status)) {
      return errorResponse(res, 'conversationId and valid status are required', 400);
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      isGroup: true,
      participants: req.user._id,
    }).select('_id participants').lean();
    if (!conversation) return errorResponse(res, 'Group conversation not found', 404);

    const allParticipants = participantIds.length > 0
      ? participantIds
      : conversation.participants.map((p) => p._id || p);

    const call = await Call.create({
      conversationId,
      caller: req.user._id,
      isGroup: true,
      participants: allParticipants,
      type: type === 'video' ? 'video' : 'audio',
      status,
      duration: Math.max(0, Number(duration) || 0),
      startedAt: startedAt || undefined,
      endedAt: endedAt || undefined,
    });

    const populated = await Call.findById(call._id)
      .populate('caller', 'name avatar')
      .populate('participants', 'name avatar')
      .lean();

    const callMessage = await messageService.createMessage({
      conversationId,
      senderId: req.user._id,
      type: 'call',
      content: JSON.stringify({
        callType: type === 'video' ? 'video' : 'audio',
        status,
        duration: Math.max(0, Number(duration) || 0),
        isGroup: true,
        participantCount: allParticipants.length,
      }),
    });

    const io = getIO();
    conversation.participants.forEach((participantId) => {
      const pId = participantId._id ? participantId._id.toString() : participantId.toString();
      io?.to(`user_${pId}`).emit('new_message', callMessage);
    });

    return successResponse(res, { call: populated }, 'Group call record created', 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { getCallHistory, createCallRecord, createGroupCallRecord, deleteCall, clearCallHistory };
