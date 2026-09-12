// Centralized API Base URL configuration for ELOQUENCE '26
// In Development (localhost): Proxies to local backend http://localhost:5000 or uses VITE_API_URL
// In Production: Uses VITE_API_URL or defaults to live backend on Render (https://eloquence2k26.onrender.com)

const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.port === '5173'
);

const rawEnvUrl = import.meta.env.VITE_API_URL || '';

// If on localhost without explicit VITE_API_URL -> use '' (Vite proxy to localhost:5000)
// If in production (Vercel / live domain) without explicit VITE_API_URL -> default to Render backend
const resolvedApiUrl = rawEnvUrl 
  ? rawEnvUrl 
  : (isLocalhost ? '' : 'https://eloquence2k26.onrender.com');

export const API_BASE_URL = resolvedApiUrl.replace(/\/+$/, '');

export function getApiUrl(endpoint) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!API_BASE_URL) {
    return cleanEndpoint;
  }
  return `${API_BASE_URL}${cleanEndpoint}`;
}

export function getWsUrl(endpoint = '/ws/registrations') {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:') + cleanEndpoint;
  }
  if (typeof window !== 'undefined') {
    const isDev = window.location.port === '5173' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDev) {
      return `ws://localhost:5000${cleanEndpoint}`;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${cleanEndpoint}`;
  }
  return `ws://localhost:5000${cleanEndpoint}`;
}

export default API_BASE_URL;
