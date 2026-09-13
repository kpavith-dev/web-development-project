import axios from 'axios';

const api = axios.create({
  // Production builds receive VITE_API_URL. The combined container uses same-origin /api.
  baseURL: import.meta.env.VITE_API_URL || '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('parking_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
