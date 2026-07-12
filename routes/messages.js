const express = require('express');
const Message = require('../models/Message');
const protect = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/:userId  -> 1:1 chat history with a specific user
router.get('/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 30 } = req.query;

    const messages = await Message.find({
      room: null,
      $or: [
        { sender: req.userId, receiver: userId },
        { sender: userId, receiver: req.userId }
      ]
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('sender', 'username avatar');

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/messages/room/:roomId -> group chat history
router.get('/room/:roomId', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 30 } = req.query;

    const messages = await Message.find({ room: roomId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('sender', 'username avatar');

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
