// src/store/authStore.js
import { create } from 'zustand';
import { apiPost, apiGet, saveTokens, clearTokens } from '../lib/api';

export const useAuthStore = create((set, get) => ({
  user:            null,
  isAuthenticated: false,
  loading:         false,
  error:           null,

  // ── Init ────────────────────────────────────────────────────
  initAuth: () => {
    const token = sessionStorage.getItem('fin_access_token');
    const user  = sessionStorage.getItem('fin_user');
    if (token && user) {
      try {
        set({ user: JSON.parse(user), isAuthenticated: true });
      } catch {
        clearTokens();
      }
    }
  },

  // ── Register ────────────────────────────────────────────────
  register: async (email, password, fullName, currency, monthlyIncomeRange, payCycle, basicGoal) => {
    set({ loading: true, error: null });
    try {
      const data = await apiPost('/auth/register', {
        email, password, full_name: fullName,
        currency, monthly_income_range: monthlyIncomeRange,
        pay_cycle: payCycle, basic_goal: basicGoal
      });
      saveTokens(data.tokens.access_token, data.tokens.refresh_token);
      sessionStorage.setItem('fin_user', JSON.stringify(data.user));
      set({ user: data.user, isAuthenticated: true, loading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed.';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  // ── Login ───────────────────────────────────────────────────
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await apiPost('/auth/login', { email, password });
      saveTokens(data.tokens.access_token, data.tokens.refresh_token);
      sessionStorage.setItem('fin_user', JSON.stringify(data.user));
      set({ user: data.user, isAuthenticated: true, loading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid email or password.';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  // ── Logout ──────────────────────────────────────────────────
  logout: async () => {
    try {
      const refresh = sessionStorage.getItem('fin_refresh_token');
      await apiPost('/auth/logout', { refresh_token: refresh });
    } catch {}
    clearTokens();
    set({ user: null, isAuthenticated: false, error: null });
  },

  // ── Refresh profile ─────────────────────────────────────────
  refreshUser: async () => {
    try {
      const user = await apiGet('/users/me');
      sessionStorage.setItem('fin_user', JSON.stringify(user));
      set({ user });
    } catch {}
  },

  clearError: () => set({ error: null }),
}));