const Stream = require('../models/Stream');
const { successResponse, errorResponse } = require('../utils/response');

const getActiveStreams = async (req, res) => {
  try {
    const streams = await Stream.find({ status: 'live' })
      .populate('streamer', 'name avatar')
      .sort({ viewerCount: -1, startedAt: -1 })
      .lean();
    return successResponse(res, { streams }, 'Active streams fetched');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getStream = async (req, res) => {
  try {
    const stream = await Stream.findById(req.params.streamId)
      .populate('streamer', 'name avatar')
      .populate('viewers', 'name avatar')
      .lean();
    if (!stream) return errorResponse(res, 'Stream not found', 404);
    return successResponse(res, { stream }, 'Stream fetched');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const createStream = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim()) return errorResponse(res, 'Stream title is required', 400);

    const existingStream = await Stream.findOne({ streamer: req.user._id, status: 'live' });
    if (existingStream) return errorResponse(res, 'You already have an active stream', 400);

    const stream = await Stream.create({
      streamer: req.user._id,
      title: title.trim(),
      description: (description || '').trim(),
      status: 'live',
      startedAt: new Date(),
    });

    const populated = await Stream.findById(stream._id).populate('streamer', 'name avatar').lean();
    return successResponse(res, { stream: populated }, 'Stream started', 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const endStream = async (req, res) => {
  try {
    const stream = await Stream.findOne({
      _id: req.params.streamId,
      streamer: req.user._id,
      status: 'live',
    });
    if (!stream) return errorResponse(res, 'Active stream not found', 404);

    stream.status = 'ended';
    stream.endedAt = new Date();
    await stream.save();

    return successResponse(res, { stream: stream.toObject() }, 'Stream ended');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getMyActiveStream = async (req, res) => {
  try {
    const stream = await Stream.findOne({ streamer: req.user._id, status: 'live' })
      .populate('streamer', 'name avatar')
      .lean();
    return successResponse(res, { stream: stream || null }, 'Active stream fetched');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getRecentStreams = async (req, res) => {
  try {
    const streams = await Stream.find({ status: 'ended' })
      .populate('streamer', 'name avatar')
      .sort({ endedAt: -1 })
      .limit(20)
      .lean();
    return successResponse(res, { streams }, 'Recent streams fetched');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { getActiveStreams, getStream, createStream, endStream, getMyActiveStream, getRecentStreams };
