const Conversation = require('../models/Conversation');
const { successResponse, errorResponse } = require('../utils/response');

const createGroup = async (req, res) => {
  try {
    const { name, description, participantIds } = req.body;
    if (!name) return errorResponse(res, 'Group name is required', 400);

    const conversation = await Conversation.create({
      participants: [req.user._id, ...(participantIds || [])],
      isGroup: true,
      groupName: name,
      groupDescription: description || '',
      createdBy: req.user._id,
      admins: [req.user._id],
    });

    const populated = await Conversation.findById(conversation._id)
      .populate('participants', 'name avatar isOnline lastSeen');

    return successResponse(res, { conversation: populated }, 'Group created', 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getUserGroups = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      isGroup: true,
      participants: req.user._id,
      hiddenFor: { $ne: req.user._id },
    })
      .populate('participants', 'name avatar isOnline lastSeen')
      .populate('createdBy', 'name avatar')
      .populate('lastMessage', 'content sender createdAt')
      .sort({ updatedAt: -1 })
      .lean();

    return successResponse(res, { conversations }, 'User groups fetched');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getGroupInfo = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.groupId)
      .populate('participants', 'name avatar isOnline lastSeen')
      .populate('createdBy', 'name avatar')
      .lean();

    if (!conversation || !conversation.isGroup) {
      return errorResponse(res, 'Group not found', 404);
    }

    return successResponse(res, { conversation }, 'Group info fetched');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const updateGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.groupId, isGroup: true, admins: req.user._id },
      { groupName: name, groupDescription: description },
      { new: true }
    ).populate('participants', 'name avatar isOnline lastSeen');

    if (!conversation) return errorResponse(res, 'Group not found or not authorized', 404);
    return successResponse(res, { conversation }, 'Group updated');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { createGroup, getUserGroups, getGroupInfo, updateGroup };
