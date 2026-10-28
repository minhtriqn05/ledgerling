import api from './axios.js';

// Calls to the /categories endpoints (docs/api-plan.md, endpoints 5–9).
// Each function returns the `data` part of the API answer ({ success: true, data }).
// When a request fails, the axios error is thrown: show it with getErrorMessage() from ./axios.js.

export async function getCategories() {
  const response = await api.get('/categories');
  return response.data.data;
}

// category: { name, type, color }
export async function createCategory(category) {
  const response = await api.post('/categories', category);
  return response.data.data;
}

// changes: { name, color } (the type cannot be changed)
export async function updateCategory(id, changes) {
  const response = await api.patch(`/categories/${id}`, changes);
  return response.data.data;
}

// Returns { _id } of the deleted category.
export async function deleteCategory(id) {
  const response = await api.delete(`/categories/${id}`);
  return response.data.data;
}
