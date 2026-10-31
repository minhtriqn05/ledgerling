import axios from 'axios';
import i18n from '../i18n/index.js';
import { clearApiCache } from '../utils/apiCache.js';
import { requestFinished, requestStarted } from '../utils/requestTracker.js';
import { SESSION_EXPIRED_EVENT } from '../utils/sessionEvents.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Sent on `window` after a request that changed data succeeded (a transaction was added, a goal was funded...).
// The server may have created a notification because of it, so the bell listens and asks for the unread count again.
export const DATA_CHANGED_EVENT = 'ledgerling:data-changed';

// These never cause a notification (and the notification calls update the count themselves)
const QUIET_PREFIXES = ['/auth/', '/notifications', '/users/'];

// The open socket of this device (context/SocketContext.jsx). A write names it, so the server does not tell
// this device about its own change; the page already updated itself.
let socketId = null;
export function setSocketId(id) {
  socketId = id;
}

// The bell asks for its number in the background: that must not move the bar at the top of the page.
const BACKGROUND_PREFIXES = ['/notifications'];

function finishTracking(config) {
  if (!config?.tracked) return;
  config.tracked = false;
  requestFinished();
}

// Attach the JWT (if any) to every request.
api.interceptors.request.use((config) => {
  if (!BACKGROUND_PREFIXES.some((prefix) => config.url?.startsWith(prefix))) {
    config.tracked = true;
    requestStarted();
  }
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (socketId && config.method !== 'get') {
    config.headers['X-Socket-Id'] = socketId;
  }
  return config;
});

// On 401 (missing/invalid/expired token), drop the token and tell the app: AuthContext shows the "Session expired"
// dialog, so the page stays on screen and the login comes back to it.
// Requests to /auth/* are skipped: a wrong password (login) or a stale token at start-up (me)
// is handled by AuthContext and the login page, which show their own message.
api.interceptors.response.use(
  (response) => {
    finishTracking(response.config);
    const { method, url = '' } = response.config;
    if (method !== 'get' && !QUIET_PREFIXES.some((prefix) => url.startsWith(prefix))) {
      window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
    }
    return response;
  },
  (error) => {
    finishTracking(error.config);
    const isAuthRequest = error.config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('token');
      clearApiCache();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

// An error from the API in the user's language: { code, message, params } -> the translation of errors.<code>.
// A code the client does not know (or no code at all) shows the English message of the server.
export function translateApiError({ code, message, params } = {}) {
  if (code && i18n.exists(`errors.${code}`, params)) return i18n.t(`errors.${code}`, params);
  return message || i18n.t('errors.UNKNOWN');
}

// The text to show the user when a request failed.
// The API always answers errors with { success: false, message, code }; no response at all means the server is unreachable.
export function getErrorMessage(error) {
  if (error.response) return translateApiError(error.response.data);
  return i18n.t('errors.NETWORK');
}

export default api;
