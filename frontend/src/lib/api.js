// src/lib/api.js
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_V1   = `${BASE_URL}/api/v1`;

// ── Axios instance ────────────────────────────────────────────
const api = axios.create({
  baseURL: API_V1,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request interceptor — attach JWT ──────────────────────────
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('fin_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — handle 401 / token refresh ────────
let _refreshing = false;
let _queue = [];

const processQueue = (error, token = null) => {
  _queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  _queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (_refreshing) {
        return new Promise((resolve, reject) => {
          _queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      _refreshing = true;

      const refreshToken = sessionStorage.getItem('fin_refresh_token');
      if (!refreshToken) {
        _refreshing = false;
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_V1}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        const newAccess = data.access_token;
        sessionStorage.setItem('fin_access_token',  newAccess);
        sessionStorage.setItem('fin_refresh_token', data.refresh_token);
        processQueue(null, newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        _refreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Token helpers ─────────────────────────────────────────────
export function saveTokens(access, refresh) {
  sessionStorage.setItem('fin_access_token',  access);
  sessionStorage.setItem('fin_refresh_token', refresh);
}

export function clearTokens() {
  sessionStorage.removeItem('fin_access_token');
  sessionStorage.removeItem('fin_refresh_token');
  sessionStorage.removeItem('fin_user');
}

export function getAccessToken() {
  return sessionStorage.getItem('fin_access_token');
}

// ── Typed request helpers ─────────────────────────────────────
export async function apiGet(url, params) {
  const { data } = await api.get(url, { params });
  return data;
}

export async function apiPost(url, body) {
  const { data } = await api.post(url, body);
  return data;
}

export async function apiPatch(url, body) {
  const { data } = await api.patch(url, body);
  return data;
}

export async function apiPut(url, body) {
  const { data } = await api.put(url, body);
  return data;
}

export async function apiDelete(url) {
  const { data } = await api.delete(url);
  return data;
}

export default api;