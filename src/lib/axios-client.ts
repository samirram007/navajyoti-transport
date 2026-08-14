import axios from 'axios';
import { toast } from 'sonner';

/**
 * API base URL:
 * - If VITE_API_BASE_URL is set (production): axios hits the backend directly
 *   e.g. VITE_API_BASE_URL=https://api.example.com -> calls https://api.example.com/api/...
 * - If unset (dev): axios uses an empty baseURL, so requests go to /api/...
 *   which Vite's dev server proxies to the backend (VITE_API_PROXY_TARGET)
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const axiosClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Cache-busting: append random timestamp to GET requests
  if (config.method === 'get') {
    config.params = {
      ...config.params,
      _t: Date.now(),
    };
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      error.response?.data?.message?.includes('Unauthenticated')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          });
          
          localStorage.setItem('access_token', response.data.data.token);
          localStorage.setItem('refresh_token', response.data.data.refreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${response.data.data.token}`;
          return axios(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          toast.error('Session expired. Please login again.');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;
