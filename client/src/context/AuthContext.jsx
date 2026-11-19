import { createContext, useContext, useEffect, useState } from 'react';
import { getMe, login as loginRequest, loginDemo, register as registerRequest } from '../api/auth.js';
import { clearApiCache } from '../utils/apiCache.js';
import { SESSION_EXPIRED_EVENT } from '../utils/sessionEvents.js';

// Holds the signed-in user and the JWT for the whole app.
// The token is also kept in localStorage (a choice of the project brief) so the session survives a page refresh;
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

  // The stored token could not be checked: no answer at all (offline, the free server is down or restarting) or a server
  // error. The token says nothing yet, so it is kept and checked again; ProtectedRoute shows a "waiting" screen meanwhile.
  const [unreachable, setUnreachable] = useState(false);
  const [checkKey, setCheckKey] = useState(0);

  // On first load: if a token is stored, ask the API who it belongs to.
  useEffect(() => {
    if (!localStorage.getItem('token')) return;

    let cancelled = false; // StrictMode runs effects twice in dev; ignore the first run's answer
    let timer = null;
    let attempt = 0;

    function check() {
      // Logged out meanwhile: nothing to check any more
      if (!localStorage.getItem('token')) {
        setUnreachable(false);
        setLoading(false);
        return;
      }
      getMe()
        .then((me) => {
          if (cancelled) return;
          setUser(me);
          setUnreachable(false);
        })
        .catch((error) => {
          if (cancelled) return;
          const status = error.response?.status;
          // Invalid, expired or unknown token: forget it
          if (status === 401) {
            clearSession();
            setUnreachable(false);
            return;
          }
          // No answer, or the server failed: ask again a little later (1, 2, 4, 8, then every 10 seconds), so the app
          // opens by itself once the server is back. Any other answer (403, 404) is final.
          if (!error.response || status >= 500) {
            setUnreachable(true);
            attempt += 1;
            timer = setTimeout(check, Math.min(1000 * 2 ** (attempt - 1), 10000));
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    check();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [checkKey]);

  // "Try again" on the waiting screen: check at once instead of waiting for the next try
  function retryCheck() {
    setCheckKey((key) => key + 1);
  }

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
    saveSession(await loginRequest({ email, password }));
  }

  // "Try the demo": the API signs in to the shared demo account (503 when it has not been seeded on that server).
  // The first call can take a minute while the free Render server wakes up, so no timeout is set.
  async function loginAsDemo() {
    saveSession(await loginDemo());
  }

  async function register(name, email, password) {
    saveSession(await registerRequest({ name, email, password }));
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
    unreachable,
    retryCheck,
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
