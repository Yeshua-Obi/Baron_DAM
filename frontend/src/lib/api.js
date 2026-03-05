import axios from 'axios';

// Pointing directly to your local Python backend
const API_BASE = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Projects API
export const projectsApi = {
  getAll: (params = {}) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

// Assets API
export const assetsApi = {
  getAll: (params = {}) => api.get('/assets', { params }),
  getById: (id) => api.get(`/assets/${id}`),
  create: (data) => api.post('/assets', data),
  delete: (id) => api.delete(`/assets/${id}`),
  getByProject: (projectId) => api.get('/assets', { params: { project_id: projectId } }),
};

// Search API
export const searchApi = {
  search: (query) => api.get('/search', { params: { q: query } }),
};

// Stats API
export const statsApi = {
  getStats: () => api.get('/stats'),
};

// ClickUp API
export const clickupApi = {
  testConnection: (apiKey) => api.post('/clickup/test-connection', { api_key: apiKey }),
  getWorkspaces: (apiKey) => api.get('/clickup/workspaces', { params: { api_key: apiKey } }),
  getSpaces: (teamId, apiKey) => api.get(`/clickup/spaces/${teamId}`, { params: { api_key: apiKey } }),
  getFolders: (spaceId, apiKey) => api.get(`/clickup/folders/${spaceId}`, { params: { api_key: apiKey } }),
  getLists: (folderId, apiKey) => api.get(`/clickup/lists/${folderId}`, { params: { api_key: apiKey } }),
  syncProject: (projectId, apiKey, listId) => 
    api.post(`/clickup/sync-project/${projectId}`, null, { params: { api_key: apiKey, list_id: listId } }),
};

// Seed demo data
export const seedDemoData = () => api.post('/seed-demo');

export default api;