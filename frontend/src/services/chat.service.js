import api from './api';

export const getUsers = async () => {
  const res = await api.get('/api/users');
  return res.data;
};

export const getConversations = async () => {
  const res = await api.get('/api/messages/conversations');
  return res.data;
};

export const getOrCreateConversation = async (userId) => {
  const res = await api.get(`/api/messages/conversations/${userId}`);
  return res.data;
};

export const getMessages = async (conversationId) => {
  const res = await api.get(`/api/messages/${conversationId}`);
  return res.data;
};

export const sendMessage = async (conversationId, content, type = 'text', replyTo = null) => {
  const res = await api.post('/api/messages', { conversationId, content, type, replyTo });
  return res.data;
};

export const uploadFile = async (formData) => {
  const res = await api.post('/api/messages/upload/file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const clearConversation = async (conversationId) => {
  const res = await api.delete(`/api/messages/conversations/${conversationId}/messages`);
  return res.data;
};

export const deleteConversation = async (conversationId) => {
  const res = await api.delete(`/api/messages/conversations/${conversationId}`);
  return res.data;
};

export const editMessage = async (messageId, content) => {
  const res = await api.put(`/api/messages/${messageId}`, { content });
  return res.data;
};

export const deleteMessage = async (messageId, deleteForEveryone = false) => {
  const res = await api.delete(`/api/messages/${messageId}`, { data: { deleteForEveryone } });
  return res.data;
};

export const forwardMessage = async (messageId, conversationIds) => {
  const res = await api.post('/api/messages/forward', { messageId, conversationIds });
  return res.data;
};

export const updateProfile = async (formData) => {
  const res = await api.put('/api/users/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const updateSettings = async (section, data) => {
  const res = await api.put(`/api/users/settings/${section}`, data);
  return res.data;
};
