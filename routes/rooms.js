const express = require('express');
const Room = require('../models/Room');
const protect = require('../middleware/auth');

const router = express.Router();

// POST /api/rooms  -> create a group room
router.post('/', protect, async (req, res) => {
  try {
    const { name, memberIds = [] } = req.body;

    if (!name) return res.status(400).json({ message: 'Room name is required' });

    const room = await Room.create({
      name,
      members: [...new Set([...memberIds, req.userId])],
      createdBy: req.userId
    });

    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/rooms -> rooms current user belongs to
router.get('/', protect, async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.userId }).populate(
      'members',
      'username avatar isOnline'
    );
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
