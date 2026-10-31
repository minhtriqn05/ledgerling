import axios from 'axios';
import i18n from '../i18n/index.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach the JWT (if any) to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 (missing/invalid/expired token), drop the token and go to the login page.
// Requests to /auth/* are skipped: a wrong password (login) or a stale token at start-up (me)
// is handled by AuthContext and the login page, which show their own message.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRequest = error.config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('token');
      window.location.href = '/login';
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
