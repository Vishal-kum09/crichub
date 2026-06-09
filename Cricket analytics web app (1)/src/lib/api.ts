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

// Response interceptor — handle auth expiry, forbidden, and network failures.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string }>) => {
    if (error.response) {
      // 401 — token missing/expired: clear session and bounce to sign-in.
      if (error.response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        if (window.location.pathname !== '/signin') {
          window.location.href = '/signin';
        }
      }
      // 403 — authenticated but not allowed: surface the server's message.
      if (error.response.status === 403) {
        toast.error(error.response.data?.error || 'Access denied');
      }
    } else if (error.request) {
      // Request was made but no response arrived → network/connection issue.
      // Surface a toast but do NOT throw — callers handle the rejection.
      toast.error('Connection lost — please check your network');
    }
    return Promise.reject(error);
  }
);

export default api;
