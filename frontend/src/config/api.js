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

export default API_BASE_URL;
