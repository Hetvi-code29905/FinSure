// src/hooks/useTransactions.js
import { useState, useCallback } from 'react';
import { apiGet, apiPost } from '../lib/api';

export default function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [pagination,   setPagination]   = useState(null);
  const [summary,      setSummary]      = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  const fetchTransactions = useCallback(async (filters = {}) => {
    setLoading(true); setError(null);
    try {
      const params = {
        page:           filters.page   || 1,
        limit:          filters.limit  || 20,
        ...(filters.date_from      && { date_from:      filters.date_from }),
        ...(filters.date_to        && { date_to:        filters.date_to }),
        ...(filters.category       && { category:       filters.category }),
        ...(filters.search         && { search:         filters.search }),
        ...(filters.anomalies_only && { anomalies_only: true }),
        ...(filters.account_id     && { account_id:     filters.account_id }),
      };
      const data = await apiGet('/transactions', params);
      setTransactions(data.transactions || []);
      setPagination({
        total:       data.total,
        page:        data.page,
        limit:       data.limit,
        total_pages: data.total_pages,
      });
      return data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load transactions.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async (params = {}) => {
    try {
      const data = await apiGet('/transactions/summary', params);
      setSummary(data);
      return data;
    } catch {}
  }, []);

  const uploadCsv = useCallback(async (file) => {
    setLoading(true); setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await import('../lib/api').then(m => m.default.post('/transactions/upload-csv', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }));
      return data;
    } catch (err) {
      const msg = err.response?.data?.detail || 'CSV upload failed.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTransaction = useCallback(async (transactionData) => {
    setLoading(true); setError(null);
    try {
      const data = await apiPost('/transactions', transactionData);
      // We don't necessarily update state immediately since we paginate, 
      // typically we just re-fetch the first page after adding.
      return data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add transaction.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    transactions, pagination, summary, loading, error,
    fetchTransactions, fetchSummary, uploadCsv, addTransaction,
  };
}