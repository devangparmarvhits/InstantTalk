import api from './api';

export const getActiveStreams = async () => {
  const res = await api.get('/api/streams/active');
  return res.data;
};

export const getRecentStreams = async () => {
  const res = await api.get('/api/streams/recent');
  return res.data;
};

export const getStream = async (streamId) => {
  const res = await api.get(`/api/streams/${streamId}`);
  return res.data;
};

export const createStream = async ({ title, description }) => {
  const res = await api.post('/api/streams', { title, description });
  return res.data;
};

export const endStream = async (streamId) => {
  const res = await api.post(`/api/streams/${streamId}/end`);
  return res.data;
};

export const getMyActiveStream = async () => {
  const res = await api.get('/api/streams/me');
  return res.data;
};

export const blockViewer = async (streamId, viewerId) => {
  const res = await api.post(`/api/streams/${streamId}/block/${viewerId}`);
  return res.data;
};

export const removeViewer = async (streamId, viewerId) => {
  const res = await api.post(`/api/streams/${streamId}/remove/${viewerId}`);
  return res.data;
};
