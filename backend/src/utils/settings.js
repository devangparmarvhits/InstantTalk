const normalizeSettings = (settings) => {
  if (!settings) return {};
  return {
    privacy: {
      lastSeen: settings.privacy?.lastSeen || 'everyone',
      onlineStatus: settings.privacy?.onlineStatus !== false,
      readReceipts: settings.privacy?.readReceipts !== false,
      profilePhoto: settings.privacy?.profilePhoto || 'everyone',
    },
    notifications: {
      messages: settings.notifications?.messages !== false,
      sound: settings.notifications?.sound !== false,
      preview: settings.notifications?.preview !== false,
    },
    appearance: {
      theme: settings.appearance?.theme || 'dark',
      fontSize: settings.appearance?.fontSize || 'medium',
    },
  };
};

module.exports = { normalizeSettings };
