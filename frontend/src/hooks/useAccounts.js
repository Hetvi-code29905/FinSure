// src/hooks/useAccounts.js
import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';

export default function useAccounts() {
  const [accounts,   setAccounts]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiGet('/accounts');
      setAccounts(data.accounts || []);
      return data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load accounts.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createAccount = useCallback(async (accountData) => {
    setLoading(true); setError(null);
    try {
      const data = await apiPost('/accounts', accountData);
      setAccounts((prev) => [...prev, data]);
      return data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAccount = useCallback(async (accountId, updateData) => {
    setLoading(true); setError(null);
    try {
      const data = await apiPut(`/accounts/${accountId}`, updateData);
      setAccounts((prev) => prev.map((a) => (a.id === accountId ? data : a)));
      return data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update account.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAccount = useCallback(async (accountId) => {
    setLoading(true); setError(null);
    try {
      await apiDelete(`/accounts/${accountId}`);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete account.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    accounts, loading, error,
    fetchAccounts, createAccount, updateAccount, deleteAccount,
  };
}
