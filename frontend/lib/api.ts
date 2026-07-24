import axios from 'axios';

export const api = axios.create();

api.interceptors.request.use((config) => {
  let baseUrl = '';

  if (typeof window !== 'undefined') {
    baseUrl = window.location.origin;
  } else if (process.env.NEXT_PUBLIC_API_URL) {
    baseUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '');
  } else {
    baseUrl = 'http://localhost:8000';
  }

  let url = config.url || '';
  if (!url.startsWith('/')) {
    url = '/' + url;
  }

  // Deduplicate /api/v1 if it accidentally got prepended or duplicated
  if (url.startsWith('/api/v1/api/v1')) {
    url = url.replace('/api/v1/api/v1', '/api/v1');
  } else if (!url.startsWith('/api/v1')) {
    url = '/api/v1' + url;
  }

  config.baseURL = baseUrl;
  config.url = url;

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
