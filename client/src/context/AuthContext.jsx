import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios.js';

// Holds the signed-in user and the JWT for the whole app.
// The token is also kept in localStorage (see CLAUDE.md) so the session survives a page refresh;
// api/axios.js reads it from there to send the Authorization header.

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  // True while a stored token is being checked with GET /auth/me. Without a token there is nothing to wait for.
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));

  // On first load: if a token is stored, ask the API who it belongs to.
  useEffect(() => {
    if (!localStorage.getItem('token')) return;

    let cancelled = false; // StrictMode runs effects twice in dev; ignore the first run's answer
    api
      .get('/auth/me')
      .then((response) => {
        if (!cancelled) setUser(response.data.data);
      })
      .catch(() => {
        // Invalid, expired or unknown token: forget it
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function saveSession({ token, user }) {
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
  }

  function clearSession() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  // login and register throw when the API answers with an error, so the page can show the message.
  async function login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    saveSession(response.data.data);
  }

  async function register(name, email, password) {
    const response = await api.post('/auth/register', { name, email, password });
    saveSession(response.data.data);
  }

  // updateUser puts a fresh copy of the user in place (e.g. after the settings changed), without touching the token.
  // saveSession stores a new token with its user: the API sends one after the password changed or after
  // "log out of all devices", because the old token (the one in localStorage) stopped working at that moment.
  const value = { user, token, loading, login, register, logout: clearSession, updateUser: setUser, saveSession };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Usage: const { user, login, logout } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

// The first day of the week chosen in Settings: 'monday' (default) or 'sunday'.
// Unlike useAuth it works without a provider (it answers 'monday'), so a unit test of one component needs no setup.
export function useWeekStart() {
  const context = useContext(AuthContext);
  return context?.user?.preferences?.weekStartsOn === 'sunday' ? 'sunday' : 'monday';
}
