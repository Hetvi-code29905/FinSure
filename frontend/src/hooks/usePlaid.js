// src/hooks/usePlaid.js
import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function usePlaid() {
  const [linkToken,  setLinkToken]  = useState(null);
  const [accounts,   setAccounts]   = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [syncing,    setSyncing]    = useState(false);
  const [error,      setError]      = useState(null);
  const { refreshUser } = useAuthStore();

  // Step 1 — get a link token
  const getLinkToken = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiPost('/plaid/link/token');
      setLinkToken(data.link_token);
      return data.link_token;
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create link token.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Step 2 — exchange public token after Plaid Link completes
  const exchangeToken = useCallback(async ({ publicToken, institutionId, institutionName, accounts: accs }) => {
    setLoading(true); setError(null);
    try {
      const data = await apiPost('/plaid/exchange', {
        public_token:     publicToken,
        institution_id:   institutionId,
        institution_name: institutionName,
        accounts:         accs,
      });
      await fetchAccounts();
      await refreshUser();
      return data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Token exchange failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshUser]); // eslint-disable-line

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await apiGet('/plaid/accounts');
      setAccounts(data.accounts || []);
      return data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load accounts.');
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await apiGet('/plaid/accounts/summary');
      setSummary(data);
      return data;
    } catch {}
  }, []);

  const syncAccounts = useCallback(async () => {
    setSyncing(true); setError(null);
    try {
      const data = await apiPost('/plaid/sync');
      return data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Sync failed.');
      return null;
    } finally {
      setSyncing(false);
    }
  }, []);

  const disconnectAccount = useCallback(async (accountId) => {
    setLoading(true);
    try {
      await apiDelete(`/plaid/accounts/${accountId}`);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (err) {
      setError(err.response?.data?.detail || 'Disconnect failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    linkToken, accounts, summary, loading, syncing, error,
    getLinkToken, exchangeToken, fetchAccounts, fetchSummary,
    syncAccounts, disconnectAccount,
  };
}