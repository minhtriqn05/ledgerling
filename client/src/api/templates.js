import api from './axios.js';

// Calls to the /templates endpoints (docs/api-plan.md, endpoints 39–43).
// Each function returns the `data` part of the API answer ({ success: true, data }).
// When a request fails, the axios error is thrown: show it with getErrorMessage() from ./axios.js.

// Returns the templates, oldest first. Each has a `category` ({ _id, name, color, icon, type }).
export async function getTemplates() {
  const response = await api.get('/templates');
  return response.data.data;
}

// template: { name, categoryId, amount, note }
export async function createTemplate(template) {
  const response = await api.post('/templates', template);
  return response.data.data;
}

// Returns { _id } of the deleted template.
export async function deleteTemplate(id) {
  const response = await api.delete(`/templates/${id}`);
  return response.data.data;
}
