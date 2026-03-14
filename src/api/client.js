import axios from 'axios';

// Vercel-first: always talk to /api (works in prod, and in local dev via vercel dev)
const baseURL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handles errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const token = localStorage.getItem('token');
    const isDemo = typeof token === 'string' && token.startsWith('demo:');
    if (error.response?.status === 401 && !isDemo) {
      // Token expired/invalid (don't clear demo token - demo user has no backend)
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
