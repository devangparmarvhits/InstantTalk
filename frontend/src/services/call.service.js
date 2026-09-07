import api from './api';

export const getCallHistory = async () => {
  const res = await api.get('/api/calls');
  return res.data;
};

export const recordCall = async (call) => {
  const res = await api.post('/api/calls', call);
  return res.data;
};

export const recordGroupCall = async (call) => {
  const res = await api.post('/api/calls/group', call);
  return res.data;
};

export const deleteCall = async (callId) => {
  const res = await api.delete(`/api/calls/${callId}`);
  return res.data;
};

export const clearCallHistory = async () => {
  const res = await api.delete('/api/calls/history');
  return res.data;
};
