import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request interceptor – attach access token & ngrok header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('it_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['ngrok-skip-browser-warning'] = 'true';
  return config;
});

const redirectToLogin = () => {
  localStorage.removeItem('it_token');
  localStorage.removeItem('it_refresh_token');
  localStorage.removeItem('it_user');
  window.location.href = '/login';
};

const persistTokens = (accessToken, refreshToken) => {
  if (accessToken) localStorage.setItem('it_token', accessToken);
  if (refreshToken) localStorage.setItem('it_refresh_token', refreshToken);
  window.dispatchEvent(
    new CustomEvent('it_tokens_refreshed', { detail: { accessToken, refreshToken } })
  );
};

const performRefresh = async () => {
  const refreshToken = localStorage.getItem('it_refresh_token');
  if (!refreshToken) throw new Error('No refresh token available');

  const res = await axios.post(
    `${BASE_URL}/api/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' } }
  );

  const { accessToken, refreshToken: newRefreshToken } = res.data;
  persistTokens(accessToken, newRefreshToken);
  return accessToken;
};

let refreshPromise = null;

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = performRefresh()
      .catch((err) => {
        redirectToLogin();
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Response interceptor – on 401, try to refresh the access token once and retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    if (!response || response.status !== 401 || !config || config._retry) {
      return Promise.reject(error);
    }

    const url = config.url || '';
    if (
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    try {
      const accessToken = await refreshAccessToken();
      config._retry = true;
      config.headers.Authorization = `Bearer ${accessToken}`;
      return api(config);
    } catch (err) {
      return Promise.reject(err);
    }
  }
);

export default api;