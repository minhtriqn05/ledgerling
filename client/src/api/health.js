import api from './axios.js';

// true when the API answers GET /health. signal cancels the request; a slow answer counts as no answer after `timeout` ms.
export async function checkHealth({ signal, timeout }) {
  const response = await api.get('/health', { signal, timeout });
  return Boolean(response.data?.success);
}
