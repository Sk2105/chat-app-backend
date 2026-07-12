const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // for 1:1 chat
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null }, // for group chat
    message: { type: String, required: true, trim: true },
    seen: { type: Boolean, default: false },
    delivered: { type: Boolean, default: false }
  },
  { timestamps: true }
);

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
