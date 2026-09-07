const User = require('../models/User');

const setOnlineStatus = async (userId, isOnline) => {
  await User.findByIdAndUpdate(userId, {
    isOnline,
    lastSeen: new Date(),
  });
};

module.exports = { setOnlineStatus };
