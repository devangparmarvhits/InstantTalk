import api from './api';

export const login = async (email, password) => {
  const res = await api.post('/api/auth/login', { email, password });
  return res.data;
};

export const register = async (name, email, password) => {
  const res = await api.post('/api/auth/register', { name, email, password });
  return res.data;
};

export const getMe = async () => {
  const res = await api.get('/api/auth/me');
  return res.data;
};

export const refresh = async (refreshToken) => {
  const res = await api.post('/api/auth/refresh', { refreshToken });
  return res.data;
};

export const logout = async (refreshToken) => {
  const res = await api.post('/api/auth/logout', { refreshToken });
  return res.data;
};