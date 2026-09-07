import api from './api';

// ═══ CRUD ═══
export const createGroup = async (data) => {
  const res = await api.post('/api/groups', data);
  return res.data;
};

export const getUserGroups = async () => {
  const res = await api.get('/api/groups');
  return res.data;
};

export const getGroupById = async (groupId) => {
  const res = await api.get(`/api/groups/${groupId}`);
  return res.data;
};

export const updateGroup = async (groupId, data) => {
  const res = await api.put(`/api/groups/${groupId}`, data);
  return res.data;
};

export const deleteGroup = async (groupId) => {
  const res = await api.delete(`/api/groups/${groupId}`);
  return res.data;
};

// ═══ MEMBERS ═══
export const addMembers = async (groupId, memberIds) => {
  const res = await api.post(`/api/groups/${groupId}/members`, { memberIds });
  return res.data;
};

export const removeMember = async (groupId, userId) => {
  const res = await api.delete(`/api/groups/${groupId}/members/${userId}`);
  return res.data;
};

export const leaveGroup = async (groupId) => {
  const res = await api.post(`/api/groups/${groupId}/leave`);
  return res.data;
};

// ═══ ADMINS ═══
export const promoteToAdmin = async (groupId, userId) => {
  const res = await api.post(`/api/groups/${groupId}/admins/${userId}`);
  return res.data;
};

export const demoteFromAdmin = async (groupId, userId) => {
  const res = await api.delete(`/api/groups/${groupId}/admins/${userId}`);
  return res.data;
};

// ═══ MUTE ═══
export const toggleMute = async (groupId) => {
  const res = await api.post(`/api/groups/${groupId}/mute`);
  return res.data;
};

// ═══ PERMISSIONS ═══
export const updatePermissions = async (groupId, perms) => {
  const res = await api.put(`/api/groups/${groupId}/permissions`, perms);
  return res.data;
};

// ═══ INVITE LINK ═══
export const generateInviteLink = async (groupId) => {
  const res = await api.post(`/api/groups/${groupId}/invite`);
  return res.data;
};

export const joinByInviteLink = async (code) => {
  const res = await api.get(`/api/groups/join/${code}`);
  return res.data;
};

// ═══ PINNED MESSAGES ═══
export const getPinnedMessages = async (groupId) => {
  const res = await api.get(`/api/groups/${groupId}/pinned`);
  return res.data;
};

export const togglePinMessage = async (messageId, groupId) => {
  const res = await api.post(`/api/groups/messages/${messageId}/pin`, { groupId });
  return res.data;
};

// ═══ REACTIONS ═══
export const toggleReaction = async (messageId, emoji) => {
  const res = await api.post(`/api/groups/messages/${messageId}/reaction`, { emoji });
  return res.data;
};

// ═══ SEARCH ═══
export const searchMessages = async (groupId, query) => {
  const res = await api.get(`/api/groups/${groupId}/search?q=${encodeURIComponent(query)}`);
  return res.data;
};
