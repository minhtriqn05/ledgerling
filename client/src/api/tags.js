import api from './axios.js';

// GET /tags (docs/api-plan.md, endpoint 23).
// Returns the tags the user has used, most used first: [{ tag: 'work', count: 12 }, ...]
export async function getTags() {
  const response = await api.get('/tags');
  return response.data.data;
}
