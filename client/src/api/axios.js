import axios from 'axios';

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

// The text to show the user when a request failed.
// The API always answers errors with { success: false, message }; no response at all means the server is unreachable.
export function getErrorMessage(error) {
  if (error.response) {
    return error.response.data?.message || 'Something went wrong. Please try again.';
  }
  return 'Cannot reach the server. Please try again.';
}

export default api;
