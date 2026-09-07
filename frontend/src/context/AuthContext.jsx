import React, { createContext, useState, useEffect, useCallback } from 'react';
import { login as loginApi, register as registerApi, getMe } from '../services/auth.service';
import { initSocket, disconnectSocket } from '../socket/socket';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
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
      if (token) {
        try {
          const data = await getMe();
          setUser(data.data.user);
          initSocket(token);
        } catch {
          localStorage.removeItem('it_token');
          localStorage.removeItem('it_user');
          setToken(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await loginApi(email, password);
    const { user: u, token: t } = data.data;
    setUser(u);
    setToken(t);
    localStorage.setItem('it_token', t);
    initSocket(t);
    return u;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await registerApi(name, email, password);
    const { user: u, token: t } = data.data;
    setUser(u);
    setToken(t);
    localStorage.setItem('it_token', t);
    initSocket(t);
    return u;
  }, []);

  const logout = useCallback(() => {
    disconnectSocket();
    setUser(null);
    setToken(null);
    localStorage.removeItem('it_token');
    localStorage.removeItem('it_user');
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, applyAppearance }}>
      {children}
    </AuthContext.Provider>
  );
};
