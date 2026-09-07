const userService = require('../services/user.service');
const logger = require('../utils/logger');
const { normalizeSettings } = require('../utils/settings');

const onlineUsers = new Map();
let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const isUserVisible = (socket) => socket.userSettings?.privacy?.onlineStatus !== false;

const presenceSocket = (io, socket) => {
  const userIdStr = socket.userId ? socket.userId.toString() : null;
  if (!userIdStr) return;

  const meta = onlineUsers.get(userIdStr) || { sockets: new Set(), visible: true };
  const wasOnline = meta.sockets.size > 0;
  meta.sockets.add(socket.id);
  const visible = isUserVisible(socket);
  meta.visible = wasOnline ? meta.visible || visible : visible;
  onlineUsers.set(userIdStr, meta);

  if (!wasOnline) {
    if (meta.visible) {
      userService.setOnlineStatus(userIdStr, true).catch(logger.error);
      io.emit('user_online', { userId: userIdStr });
    } else {
      userService.setOnlineStatus(userIdStr, false).catch(logger.error);
    }
  }

  socket.emit('online_users', getVisibleUserIds());

  socket.on('disconnect', async () => {
    const m = onlineUsers.get(userIdStr);
    if (m) {
      m.sockets.delete(socket.id);
      if (m.sockets.size === 0) {
        onlineUsers.delete(userIdStr);
        await userService.setOnlineStatus(userIdStr, false).catch(logger.error);
        if (m.visible) {
          io.emit('user_offline', { userId: userIdStr });
        }
      }
    }
  });
};

const getVisibleUserIds = () => {
  const ids = [];
  onlineUsers.forEach((meta, uid) => {
    if (meta.visible) ids.push(uid);
  });
  return ids;
};

const syncUserPresence = async (userId) => {
  if (!ioInstance) return;
  const uid = userId.toString();
  const meta = onlineUsers.get(uid);
  if (!meta || meta.sockets.size === 0) return;

  const User = require('../models/User');
  const user = await User.findById(uid).select('settings').lean();
  const settings = normalizeSettings(user?.settings);
  const nowVisible = settings.privacy.onlineStatus !== false;

  if (nowVisible === meta.visible) return;
  meta.visible = nowVisible;

  if (nowVisible) {
    await userService.setOnlineStatus(uid, true).catch(logger.error);
    ioInstance.emit('user_online', { userId: uid });
  } else {
    await userService.setOnlineStatus(uid, false).catch(logger.error);
    ioInstance.emit('user_offline', { userId: uid });
  }
};

const updateUserSettingsOnSockets = (userId, settings) => {
  if (!ioInstance) return;
  const uid = userId.toString();
  const meta = onlineUsers.get(uid);
  if (!meta) return;
  meta.sockets.forEach((socketId) => {
    const socket = ioInstance.sockets.sockets.get(socketId);
    if (socket) socket.userSettings = settings;
  });
};

module.exports = { presenceSocket, onlineUsers, getVisibleUserIds, syncUserPresence, updateUserSettingsOnSockets, setIO };
