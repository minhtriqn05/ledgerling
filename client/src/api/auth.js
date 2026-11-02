import api from './axios.js';

// Signing in and out (see docs/api-plan.md, "Auth"). Each of the first three returns { token, user }.

export async function register({ name, email, password }) {
  const response = await api.post('/auth/register', { name, email, password });
  return response.data.data;
}

export async function login({ email, password }) {
  const response = await api.post('/auth/login', { email, password });
  return response.data.data;
}

// "Try the demo": the shared demo account, without a password (503 DEMO_UNAVAILABLE when it was not seeded)
export async function loginDemo() {
  const response = await api.post('/auth/demo');
  return response.data.data;
}

// The user the stored token belongs to (401 when the token no longer works)
export async function getMe() {
  const response = await api.get('/auth/me');
  return response.data.data;
}
