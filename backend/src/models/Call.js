const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isGroup: { type: Boolean, default: false },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    type: { type: String, enum: ['audio', 'video'], default: 'audio' },
    status: { type: String, enum: ['completed', 'missed', 'declined', 'busy', 'failed'], required: true },
    duration: { type: Number, min: 0, default: 0 },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: Date.now },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });
callSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Call', callSchema);
