const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const { syncUserPresence, updateUserSettingsOnSockets } = require('../socket/presence.socket');

const getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('name avatar isOnline lastSeen bio')
      .lean();
    return successResponse(res, { users }, 'Users fetched');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, bio } = req.body;
    const update = {};
    if (name) update.name = name;
    if (bio !== undefined) update.bio = bio;

    if (req.file) {
      update.avatar = `/uploads/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    return successResponse(res, { user }, 'Profile updated');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const updateSettings = async (req, res) => {
  try {
    const { section } = req.params;
    const settingsUpdate = {};

    if (section === 'privacy') {
      settingsUpdate['settings.privacy'] = req.body;
    } else if (section === 'notifications') {
      settingsUpdate['settings.notifications'] = req.body;
    } else if (section === 'appearance') {
      settingsUpdate['settings.appearance'] = req.body;
    } else {
      return errorResponse(res, 'Invalid settings section', 400);
    }

    const user = await User.findByIdAndUpdate(req.user._id, settingsUpdate, { new: true });
    
    if (section === 'privacy') {
      syncUserPresence(req.user._id).catch(console.error);
    }
    updateUserSettingsOnSockets(req.user._id, user.settings);

    return successResponse(res, { user }, 'Settings updated');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { getUsers, updateProfile, updateSettings };
