import React, { useState } from 'react';
import { apiPatch } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import Button from '../ui/Button';

export default function OnboardingOverlay({ onComplete }) {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(1); // 1 = Welcome/Tier2, 2 = Tier3
  const [loading, setLoading] = useState(false);

  // Tier 2 state
  const [expenses, setExpenses] = useState({ rent: false, emi: false, subs: false, utilities: false });
  const [savings, setSavings] = useState('');
  const [hasDebt, setHasDebt] = useState(null);
  const [debtAmount, setDebtAmount] = useState('');

  // Tier 3 state (Behavioral)
  const [behavior, setBehavior] = useState({ impulseBuy: null, strictBudget: null });

  if (!user || user.onboarding_status === 'completed') return null;

  const toggleExpense = (key) => setExpenses(prev => ({ ...prev, [key]: !prev[key] }));

  const handleNext = () => setStep(2);

  const handleFinish = async () => {
    setLoading(true);
    try {
      const fixed_expenses = Object.entries(expenses).filter(([_, v]) => v).map(([k]) => k);
      await apiPatch('/users/me', {
        onboarding_status: 'completed',
        fixed_expenses,
        savings: savings || null,
        has_debt: hasDebt,
        debt_amount: debtAmount || null,
        behavioral_answers: behavior
      });
      await refreshUser();
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const skipAll = async () => {
    setLoading(true);
    try {
      await apiPatch('/users/me', { onboarding_status: 'completed' });
      await refreshUser();
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '1rem',
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)', padding: '2.5rem',
        maxWidth: 500, width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        {step === 1 && (
          <div className="animate-in">
            <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Welcome to Finsure! 🎉</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>
              To personalize your insights and compute precise runway forecasts, tell us a bit more about your fixed cash flow. (Optional)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Expenses */}
              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 500, display: 'block', marginBottom: '0.6rem' }}>
                  Do you have any of these fixed monthly expenses?
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['rent', 'emi', 'subs', 'utilities'].map(k => (
                    <button key={k} onClick={() => toggleExpense(k)} style={{
                      padding: '0.4rem 0.8rem', borderRadius: '99px',
                      background: expenses[k] ? 'var(--accent-glow)' : 'var(--bg-card)',
                      color: expenses[k] ? 'var(--accent-bright)' : 'var(--text-secondary)',
                      border: `1px solid ${expenses[k] ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer', textTransform: 'capitalize', fontSize: '0.8rem',
                      transition: 'all 0.2s'
                    }}>
                      {k === 'subs' ? 'Subscriptions' : k}
                    </button>
                  ))}
                </div>
              </div>

              {/* Savings */}
              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 500, display: 'block', marginBottom: '0.6rem' }}>
                  Roughly how much do you have in savings / emergency funds?
                </label>
                <select 
                  value={savings} onChange={e => setSavings(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="">Skip this</option>
                  <option value="None">None</option>
                  <option value="< 1 month expenses">&lt; 1 month of expenses</option>
                  <option value="1-3 months">1-3 months</option>
                  <option value="3-6 months">3-6 months</option>
                  <option value="6+ months">6+ months</option>
                </select>
              </div>

              {/* Debt */}
              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 500, display: 'block', marginBottom: '0.6rem' }}>
                  Do you have any existing debt? (e.g. Credit Card, Loans)
                </label>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: hasDebt ? '0.6rem' : 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <input type="radio" checked={hasDebt === true} onChange={() => setHasDebt(true)} /> Yes
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <input type="radio" checked={hasDebt === false} onChange={() => { setHasDebt(false); setDebtAmount(''); }} /> No
                  </label>
                </div>
                {hasDebt && (
                  <select 
                    value={debtAmount} onChange={e => setDebtAmount(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="">Select amount...</option>
                    <option value="Small">Small (Easily manageable)</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Significant">Significant</option>
                  </select>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem' }}>
              <Button variant="ghost" onClick={skipAll} disabled={loading}>Skip All</Button>
              <Button onClick={handleNext} disabled={loading}>Next →</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in">
            <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Just one more thing...</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>
              Knowing your spending style helps our AI tailor your anomaly alerts.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 500, display: 'block', marginBottom: '0.6rem' }}>
                  Do you often make impulse purchases?
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['Often', 'Sometimes', 'Rarely'].map(opt => (
                    <button key={opt} onClick={() => setBehavior({ ...behavior, impulseBuy: opt })} style={{
                      flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-md)',
                      background: behavior.impulseBuy === opt ? 'var(--accent-glow)' : 'var(--bg-card)',
                      color: behavior.impulseBuy === opt ? 'var(--accent-bright)' : 'var(--text-secondary)',
                      border: `1px solid ${behavior.impulseBuy === opt ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem'
                    }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.88rem', fontWeight: 500, display: 'block', marginBottom: '0.6rem' }}>
                  Do you currently follow a strict monthly budget?
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['Yes', 'Somewhat', 'No'].map(opt => (
                    <button key={opt} onClick={() => setBehavior({ ...behavior, strictBudget: opt })} style={{
                      flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-md)',
                      background: behavior.strictBudget === opt ? 'var(--accent-glow)' : 'var(--bg-card)',
                      color: behavior.strictBudget === opt ? 'var(--accent-bright)' : 'var(--text-secondary)',
                      border: `1px solid ${behavior.strictBudget === opt ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem'
                    }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem' }}>
              <Button variant="ghost" onClick={skipAll} disabled={loading}>Skip</Button>
              <Button onClick={handleFinish} loading={loading}>Finish Onboarding</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
