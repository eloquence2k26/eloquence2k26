// Centralized API Base URL configuration for ELOQUENCE '26
// In Development (localhost): Proxies to local backend http://localhost:5000 or uses VITE_API_URL if set
// In Production: Uses VITE_API_URL (e.g. https://eloquence2k26.onrender.com) or relative path

const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.port === '5173'
);

// If running locally and VITE_API_URL is empty or not specified, use empty string to leverage Vite proxy -> http://localhost:5000
const rawEnvUrl = import.meta.env.VITE_API_URL || '';
const envApiUrl = (isLocalhost && !rawEnvUrl) ? '' : rawEnvUrl;

export const API_BASE_URL = envApiUrl.replace(/\/+$/, '');

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
