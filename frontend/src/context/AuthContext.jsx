import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  login as loginApi,
  register as registerApi,
  getMe,
  logout as logoutApi,
} from '../services/auth.service';
import { initSocket, disconnectSocket } from '../socket/socket';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('it_user'));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('it_token'));
  const [loading, setLoading] = useState(true);

  // Apply the user's appearance settings (theme + font size) to the document
  const applyAppearance = useCallback((settings) => {
    const appearance = settings?.appearance || {};
    const theme = appearance.theme || 'system';
    const fontSize = appearance.fontSize || 'medium';
    const root = document.documentElement;
    root.setAttribute('data-theme-pref', theme);
    root.setAttribute('data-font-size', fontSize);
    const resolved =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark'
        : theme;
    root.setAttribute('data-theme', resolved);
  }, []);

  // Keep appearance in sync with the system when "System" theme is selected
  const systemThemeQuery = useCallback(
    () => window.matchMedia('(prefers-color-scheme: light)'),
    []
  );

  // Apply appearance settings (theme + font size) ONLY while logged in.
  // When logged out (login/register pages), fall back to the default dark theme.
  useEffect(() => {
    const root = document.documentElement;

    if (!user) {
      root.removeAttribute('data-theme');
      root.removeAttribute('data-theme-pref');
      root.removeAttribute('data-font-size');
      return undefined;
    }

    applyAppearance(user.settings);
    const mq = systemThemeQuery();
    const onSystemThemeChange = () => {
      if ((user.settings?.appearance?.theme || 'system') === 'system') {
        applyAppearance(user.settings);
      }
    };
    mq.addEventListener('change', onSystemThemeChange);
    return () => mq.removeEventListener('change', onSystemThemeChange);
  }, [user, applyAppearance, systemThemeQuery]);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('it_token');
      if (storedToken) {
        try {
          const data = await getMe();
          setUser(data.data.user);
          localStorage.setItem('it_user', JSON.stringify(data.data.user));
          setToken(localStorage.getItem('it_token') || storedToken);
          initSocket(localStorage.getItem('it_token') || storedToken);
        } catch {
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  // Keep socket + tokens in sync whenever the access token is silently refreshed
  useEffect(() => {
    const onTokensRefreshed = () => {
      const newToken = localStorage.getItem('it_token');
      if (newToken) {
        setToken(newToken);
        initSocket(newToken);
      }
    };
    window.addEventListener('it_tokens_refreshed', onTokensRefreshed);
    return () => window.removeEventListener('it_tokens_refreshed', onTokensRefreshed);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await loginApi(email, password);
    const { user: u, accessToken, refreshToken } = data.data;
    setUser(u);
    setToken(accessToken);
    localStorage.setItem('it_token', accessToken);
    localStorage.setItem('it_refresh_token', refreshToken);
    localStorage.setItem('it_user', JSON.stringify(u));
    initSocket(accessToken);
    return u;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await registerApi(name, email, password);
    const { user: u, accessToken, refreshToken } = data.data;
    setUser(u);
    setToken(accessToken);
    localStorage.setItem('it_token', accessToken);
    localStorage.setItem('it_refresh_token', refreshToken);
    localStorage.setItem('it_user', JSON.stringify(u));
    initSocket(accessToken);
    return u;
  }, []);

  // Callbacks run right before the user is logged out, so contexts can clean up
  // active sessions (live streams, calls, group calls, etc.).
  const logoutCallbacks = useRef([]);
  const registerLogoutCallback = useCallback((cb) => {
    logoutCallbacks.current.push(cb);
    return () => {
      logoutCallbacks.current = logoutCallbacks.current.filter((c) => c !== cb);
    };
  }, []);

  const logout = useCallback(() => {
    // Let every registered context clean up before we wipe the session.
    logoutCallbacks.current.forEach((cb) => {
      try { cb(); } catch (err) { console.error('logout cleanup error:', err); }
    });
    logoutCallbacks.current = [];

    const refreshToken = localStorage.getItem('it_refresh_token');
    if (refreshToken) {
      logoutApi(refreshToken).catch(() => {});
    }

    disconnectSocket();
    setUser(null);
    setToken(null);
    localStorage.removeItem('it_token');
    localStorage.removeItem('it_refresh_token');
    localStorage.removeItem('it_user');
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('it_user', JSON.stringify(updatedUser));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, applyAppearance, registerLogoutCallback }}>
      {children}
    </AuthContext.Provider>
  );
};