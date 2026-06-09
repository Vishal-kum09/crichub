import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from './toast';

// Base URL comes from Vite env at build time; falls back to local backend.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const TOKEN_KEY = 'cricket_token';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach the stored JWT as a Bearer token when present.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle auth expiry and network failures globally.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with an error status.
      if (error.response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        if (window.location.pathname !== '/signin') {
          window.location.href = '/signin';
        }
      }
    } else if (error.request) {
      // Request was made but no response arrived → network/connection issue.
      toast.error('Connection lost — please check your network');
    }
    return Promise.reject(error);
  }
);

export default api;
