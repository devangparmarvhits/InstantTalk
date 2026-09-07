import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request interceptor – attach token & ngrok header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('it_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['ngrok-skip-browser-warning'] = 'true';
  return config;
});

// Response interceptor – handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      // Don't redirect if already on login/register (wrong credentials = normal 401)
      const isAuthPage = path === '/login' || path === '/register' || path.startsWith('/auth');
      if (!isAuthPage) {
        localStorage.removeItem('it_token');
        localStorage.removeItem('it_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
