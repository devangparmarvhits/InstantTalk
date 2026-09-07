import { io } from 'socket.io-client';

const DEFAULT_SOCKET_URL = 'http://localhost:5000';
const SOCKET_URL = (() => {
  const envValue = import.meta.env.VITE_SOCKET_URL;
  if (envValue && envValue.trim()) return envValue.trim();
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return DEFAULT_SOCKET_URL;
})();

let socket = null;
const listeners = new Set();

export const initSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    query: { token },
    autoConnect: true,
    path: '/socket.io',
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    listeners.forEach((cb) => cb(socket));
  });

  socket.on('connect_error', () => {
    // Silent — exponential backoff handles retries
  });

  return socket;
};

export const getSocket = () => socket;

export const onSocketConnect = (cb) => {
  listeners.add(cb);
  if (socket && socket.connected) {
    cb(socket);
  }
  return () => listeners.delete(cb);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
