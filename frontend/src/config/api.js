// Centralized API Base URL configuration for ELOQUENCE '26
// In Development: Uses Vite proxy or VITE_API_URL
// In Production: Uses VITE_API_URL (e.g. https://eloquence2k26-backend.onrender.com) or relative paths

const envApiUrl = import.meta.env.VITE_API_URL || '';

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
