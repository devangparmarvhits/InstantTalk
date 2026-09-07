const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const chatSocket = require('./chat.socket');
const callSocket = require('./call.socket');
const groupCallSocket = require('./groupCall.socket');
const streamSocket = require('./stream.socket');
const { presenceSocket, setIO } = require('./presence.socket');
const logger = require('../utils/logger');
const { CLIENT_URL } = require('../config/env');
const { normalizeSettings } = require('../utils/settings');

let ioInstance = null;

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  ioInstance = io;
  setIO(io);

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = verifyToken(token);
      socket.userId = decoded.id.toString();
      const user = await User.findById(decoded.id).select('settings').lean();
      socket.userSettings = normalizeSettings(user?.settings);
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userIdStr = socket.userId.toString();
    logger.info(`Socket connected: ${socket.id}, User: ${userIdStr}`);

    socket.join(`user_${userIdStr}`);

    presenceSocket(io, socket);
    chatSocket(io, socket);
    callSocket(io, socket);
    groupCallSocket(io, socket);
    streamSocket(io, socket);
  });

  return io;
};

const getIO = () => ioInstance;

module.exports = { initSocket, getIO };
