// src/hooks/useAuth.js
import { useAuthStore } from '../store/authStore';

/**
 * Thin hook over authStore — exposes the same API so pages
 * don't need to import from the store directly.
 */
export default function useAuth() {
  const {
    user, isAuthenticated, loading, error,
    login, register, logout, refreshUser, clearError,
  } = useAuthStore();

  return { user, isAuthenticated, loading, error, login, register, logout, refreshUser, clearError };
}