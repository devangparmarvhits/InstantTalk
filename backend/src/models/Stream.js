const mongoose = require('mongoose');

const streamSchema = new mongoose.Schema(
  {
    streamer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Stream title is required'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['live', 'ended'],
      default: 'live',
    },
    viewerCount: {
      type: Number,
      default: 0,
    },
    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    blockedViewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

streamSchema.index({ status: 1, createdAt: -1 });
streamSchema.index({ streamer: 1 });
streamSchema.index({ status: 1, viewerCount: -1 });

module.exports = mongoose.model('Stream', streamSchema);
