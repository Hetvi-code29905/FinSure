// src/store/uiStore.js
import { create } from 'zustand';

export const useUiStore = create((set, get) => ({
  // ── Sidebar ─────────────────────────────────────────────────
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // ── Toast notifications ──────────────────────────────────────
  toasts: [],
  addToast: (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), duration);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // ── Global loading ───────────────────────────────────────────
  globalLoading: false,
  setGlobalLoading: (v) => set({ globalLoading: v }),
}));