import axios from 'axios';

/**
 * Resolve API base URL.
 * In Vite DEV (including Codespaces), use same-origin `/api/v1` so the Vite
 * proxy forwards to the backend — avoids CORS + github.dev → app.github.dev redirects.
 */
const getApiUrl = () => {
  // Same-origin via Vite proxy in DEV (localhost + Codespaces).
  // Do this first so a stale VITE_API_URL pointing at *.github.dev cannot break CORS.
  if (import.meta.env.DEV) {
    return '/api/v1';
  }

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }

  // Browser on Codespaces production preview: mirror the frontend forwarded hostname
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const match = host.match(/^(.*?)-(\d+)\.(.+)$/);
    if (match) {
      const [, name, , domain] = match;
      const normalized = domain === 'github.dev' ? 'app.github.dev' : domain;
      return `https://${name}-8001.${normalized}/api/v1`;
    }
  }

  if (import.meta.env.VITE_CODESPACE_NAME) {
    const rawDomain =
      import.meta.env.VITE_GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev';
    const domain = rawDomain === 'github.dev' ? 'app.github.dev' : rawDomain;
    return `https://${import.meta.env.VITE_CODESPACE_NAME}-8001.${domain}/api/v1`;
  }

  return 'http://localhost:8001/api/v1';
};

const API_BASE = getApiUrl();

console.log('🔗 API URL:', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.config?.url, error.response?.status, error.message);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
