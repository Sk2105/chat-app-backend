const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');

// Map of userId -> Set of socketIds (supports multiple tabs/devices per user)
const onlineUsers = new Map();

const addSocket = (userId, socketId) => {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
};

const removeSocket = (userId, socketId) => {
  const set = onlineUsers.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) onlineUsers.delete(userId);
};

function initSocket(io) {
  // Authenticate every socket connection using the JWT issued at login
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: no token'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`Socket connected: user ${userId} (${socket.id})`);

    addSocket(userId, socket.id);
    socket.join(userId); // personal room, used for direct messages

    // Mark user online and notify their contacts
    await User.findByIdAndUpdate(userId, { isOnline: true });
    socket.broadcast.emit('user_online', { userId });

    // ---- 1:1 direct messages ----
    socket.on('send_message', async ({ receiverId, message }, callback) => {
      try {
        const saved = await Message.create({
          sender: userId,
          receiver: receiverId,
          message
        });

        const populated = await saved.populate('sender', 'username avatar');

        // Deliver to receiver if online
        io.to(receiverId).emit('receive_message', populated);
        // Echo back to sender (so other tabs/devices of sender also update)
        socket.to(userId).emit('receive_message', populated);

        if (onlineUsers.has(receiverId)) {
          await Message.findByIdAndUpdate(saved._id, { delivered: true });
        }

        if (typeof callback === 'function') callback({ status: 'ok', message: populated });
      } catch (err) {
        if (typeof callback === 'function') callback({ status: 'error', error: err.message });
      }
    });

    // ---- Group/room messages ----
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
    });

    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
    });

    socket.on('room_message', async ({ roomId, message }, callback) => {
      try {
        const saved = await Message.create({ sender: userId, room: roomId, message });
        const populated = await saved.populate('sender', 'username avatar');

        io.to(roomId).emit('room_message', populated);
        if (typeof callback === 'function') callback({ status: 'ok', message: populated });
      } catch (err) {
        if (typeof callback === 'function') callback({ status: 'error', error: err.message });
      }
    });

    // ---- Typing indicators ----
    socket.on('typing', ({ receiverId, roomId }) => {
      const payload = { userId, roomId: roomId || null };
      if (roomId) socket.to(roomId).emit('typing', payload);
      else if (receiverId) socket.to(receiverId).emit('typing', payload);
    });

    socket.on('stop_typing', ({ receiverId, roomId }) => {
      const payload = { userId, roomId: roomId || null };
      if (roomId) socket.to(roomId).emit('stop_typing', payload);
      else if (receiverId) socket.to(receiverId).emit('stop_typing', payload);
    });

    // ---- Read receipts ----
    socket.on('message_seen', async ({ messageId, senderId }) => {
      await Message.findByIdAndUpdate(messageId, { seen: true });
      io.to(senderId).emit('message_seen', { messageId });
    });

    // ---- Disconnect ----
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: user ${userId} (${socket.id})`);
      removeSocket(userId, socket.id);

      // Only mark offline if user has no other active sockets/tabs
      if (!onlineUsers.has(userId)) {
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        socket.broadcast.emit('user_offline', { userId });
      }
    });
  });
}

module.exports = initSocket;
