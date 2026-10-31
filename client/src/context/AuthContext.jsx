import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios.js';
import { clearApiCache } from '../utils/apiCache.js';
import { SESSION_EXPIRED_EVENT } from '../utils/sessionEvents.js';

// Holds the signed-in user and the JWT for the whole app.
// The token is also kept in localStorage (see CLAUDE.md) so the session survives a page refresh;
// api/axios.js reads it from there to send the Authorization header.

const AuthContext = createContext(null);

// Who the saved offline data belongs to: when another account signs in, that data is deleted first
const CACHE_OWNER_KEY = 'ledgerling.cacheOwner';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  // True while a stored token is being checked with GET /auth/me. Without a token there is nothing to wait for.
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));
  // The API refused the token while the app was open. The user stays, so the page stays behind the "Session expired"
  // dialog; the flag also tells ProtectedRoute to go to /login (and come back here) instead of the landing page.
  const [sessionExpired, setSessionExpired] = useState(false);

  // A request (api/axios.js) was answered with 401: the token is already gone. The closed token also ends the socket.
  useEffect(() => {
    function handleExpired() {
      setToken(null);
      setSessionExpired(true);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  // On first load: if a token is stored, ask the API who it belongs to.
  useEffect(() => {
    if (!localStorage.getItem('token')) return;

    let cancelled = false; // StrictMode runs effects twice in dev; ignore the first run's answer
    api
      .get('/auth/me')
      .then((response) => {
        if (!cancelled) setUser(response.data.data);
      })
      .catch((error) => {
        // Invalid, expired or unknown token: forget it. No answer at all (offline, server asleep) says nothing about the token.
        if (!cancelled && error.response?.status === 401) clearSession();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function saveSession({ token, user }) {
    if (localStorage.getItem(CACHE_OWNER_KEY) !== user._id) clearApiCache();
    localStorage.setItem(CACHE_OWNER_KEY, user._id);
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
    setSessionExpired(false);
  }

  function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem(CACHE_OWNER_KEY);
    clearApiCache();
    setToken(null);
    setUser(null);
  }

  // A normal "Log out": no trace of a session that expired before it
  function logout() {
    clearSession();
    setSessionExpired(false);
  }

  // The socket heard that the token stopped working (see SocketContext): the same dialog as a 401
  function expireSession() {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    localStorage.removeItem('token');
    clearApiCache();
  }

  // "Log in again" in the dialog: the user goes, sessionExpired stays, so ProtectedRoute remembers this page in state.from
  function endExpiredSession() {
    clearSession();
  }

  // login and register throw when the API answers with an error, so the page can show the message.
  async function login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    saveSession(response.data.data);
  }

  // "Try the demo": the API signs in to the shared demo account (503 when it has not been seeded on that server).
  // The first call can take a minute while the free Render server wakes up, so no timeout is set.
  async function loginAsDemo() {
    const response = await api.post('/auth/demo');
    saveSession(response.data.data);
  }

  async function register(name, email, password) {
    const response = await api.post('/auth/register', { name, email, password });
    saveSession(response.data.data);
  }

  // updateUser puts a fresh copy of the user in place (e.g. after the settings changed), without touching the token.
  // saveSession stores a new token with its user: the API sends one after the password changed or after
  // "log out of all devices", because the old token (the one in localStorage) stopped working at that moment.
  const value = {
    user,
    token,
    loading,
    login,
    loginAsDemo,
    register,
    logout,
    updateUser: setUser,
    saveSession,
    sessionExpired,
    expireSession,
    endExpiredSession,
  };

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
