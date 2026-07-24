import axios from 'axios';

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin + '/api/v1';
  }
  return 'http://localhost:8000/api/v1';
};

export const api = axios.create();

api.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl();
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
