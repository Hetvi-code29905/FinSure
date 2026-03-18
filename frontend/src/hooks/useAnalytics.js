// src/hooks/useAnalytics.js
import { useState, useCallback } from 'react';
import { apiGet, apiPost } from '../lib/api';

/**
 * Fetches risk score and forecast data.
 * Used by Dashboard and any other page needing ML insights.
 */
export default function useAnalytics() {
  const [riskScore, setRiskScore] = useState(null);
  const [forecast,  setForecast]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const fetchRiskScore = useCallback(async () => {
    try {
      const data = await apiGet('/risk/score');
      setRiskScore(data);
      return data;
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.detail || 'Could not load risk score.');
      }
      return null;
    }
  }, []);

  const computeRisk = useCallback(async (force = true) => {
    setLoading(true); setError(null);
    try {
      const data = await apiPost('/risk/compute', { force });
      setRiskScore(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Risk computation failed.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchForecast = useCallback(async () => {
    try {
      const data = await apiGet('/forecast');
      setForecast(data);
      return data;
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.detail || 'Could not load forecast.');
      }
      return null;
    }
  }, []);

  const generateForecast = useCallback(async (horizonDays = 30) => {
    setLoading(true); setError(null);
    try {
      const data = await apiPost('/forecast/generate', {
        horizon_days: horizonDays, force: true,
      });
      setForecast(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Forecast generation failed.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([fetchRiskScore(), fetchForecast()]);
    setLoading(false);
  }, [fetchRiskScore, fetchForecast]);

  return {
    riskScore, forecast, loading, error,
    fetchRiskScore, computeRisk, fetchForecast, generateForecast, fetchAll,
  };
}