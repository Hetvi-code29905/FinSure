// src/pages/Dashboard.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth         from '../hooks/useAuth';
import useAnalytics    from '../hooks/useAnalytics';
import useAccounts     from '../hooks/useAccounts';
import useTransactions from '../hooks/useTransactions';
import ForecastChart   from '../components/dashboard/ForecastChart';
import RiskMeter       from '../components/dashboard/RiskMeter';
import Card            from '../components/ui/Card';
import Button          from '../components/ui/Button';
import AddAccountModal      from '../components/modals/AddAccountModal';
import AddTransactionModal  from '../components/modals/AddTransactionModal';
import OnboardingOverlay    from '../components/onboarding/OnboardingOverlay';
import { formatCurrency, formatDate } from '../lib/utils';

/* ── tiny helpers ──────────────────────────────────────────── */
function StatTile({ icon, label, value, sub, color, onClick, cta }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
      borderRadius: 14, padding: '1.1rem 1.2rem',
      display: 'flex', flexDirection: 'column', gap: '0.35rem',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'border-color 0.2s',
    }}
      onClick={onClick}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = 'var(--accent)'; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
    >
      <div style={{ fontSize: '1.2rem' }}>{icon}</div>
      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: color || 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: color || 'var(--text-muted)', opacity: 0.85 }}>{sub}</div>}
      {cta && (
        <div style={{ marginTop: '0.3rem', fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600 }}>{cta}</div>
      )}
    </div>
  );
}

function AnomalyExplainer({ transactions }) {
  const anomalies = transactions.filter(t => t.is_anomaly);
  if (anomalies.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>✅</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>No unusual transactions</div>
        <div style={{ fontSize: '0.74rem', opacity: 0.7, marginTop: '0.25rem' }}>Your spending patterns look normal</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{
        padding: '0.65rem 0.9rem', borderRadius: 8,
        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
        fontSize: '0.8rem', color: 'var(--text-secondary)',
        display: 'flex', gap: '0.5rem',
      }}>
        <span>🤖</span>
        <span>
          Our AI detected <strong>{anomalies.length}</strong> transaction{anomalies.length > 1 ? 's' : ''} that look unusual compared to your normal spending patterns. These are not errors — just spending that stands out.
        </span>
      </div>
      {anomalies.map((txn, i) => (
        <div key={txn.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.6rem 0.75rem', borderRadius: 8,
          background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)',
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              ⚠ {txn.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {formatDate(txn.date)} · {txn.category} · Unusually high for this category
            </div>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700,
            color: txn.amount < 0 ? 'var(--success)' : 'var(--warning)',
          }}>
            {txn.amount < 0 ? '+' : ''}{formatCurrency(Math.abs(txn.amount))}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── main Dashboard ─────────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const {
    riskScore, forecast, fetchAll, computeRisk, generateForecast, loading: analyticsLoading,
  } = useAnalytics();
  const { accounts, fetchAccounts, createAccount } = useAccounts();
  const { transactions, fetchTransactions, addTransaction } = useTransactions();

  const [isAccountModalOpen, setAccountModalOpen] = useState(false);
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);

  useEffect(() => {
    fetchAll();
    fetchAccounts();
    fetchTransactions({ limit: 10 });
  }, []); // eslint-disable-line

  const handleAddAccount = async (data) => {
    await createAccount(data);
    setTimeout(() => { fetchAll(); fetchAccounts(); }, 1500);
  };

  const handleAddTransaction = async (data) => {
    await addTransaction(data);
    fetchTransactions({ limit: 10 });
    fetchAccounts();
    setTimeout(() => fetchAll(), 2000); // slight delay so BG task completes
  };

  const handleRefreshForecast = async () => {
    await generateForecast();
  };

  const handleRefreshScore = async () => {
    await computeRisk();
  };

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const anomalyCount = transactions.filter(t => t.is_anomaly).length;
  const runway = forecast?.estimated_runway_days;
  const runwayColor = !runway ? undefined : runway >= 90 ? 'var(--success)' : runway >= 30 ? 'var(--warning)' : 'var(--danger)';
  const riskCat = riskScore?.risk_category;
  const riskColor = riskCat === 'Low' ? 'var(--success)' : riskCat === 'Moderate' ? 'var(--warning)' : riskCat ? 'var(--danger)' : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <OnboardingOverlay />

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Your Financial Overview</h2>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Welcome back, <strong>{user?.name || user?.email}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => setAccountModalOpen(true)}>+ Add Account</Button>
          <Button onClick={() => setTransactionModalOpen(true)}>+ Add Transaction</Button>
        </div>
      </div>

      <AddAccountModal isOpen={isAccountModalOpen} onClose={() => setAccountModalOpen(false)} onAdd={handleAddAccount} />
      <AddTransactionModal isOpen={isTransactionModalOpen} onClose={() => setTransactionModalOpen(false)} onAdd={handleAddTransaction} accounts={accounts} />

      {/* ── Stat tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.9rem' }}>
        <StatTile
          icon="🏦"
          label="Total Balance"
          value={formatCurrency(totalBalance)}
          sub={`Across ${accounts.length} account${accounts.length !== 1 ? 's' : ''}`}
        />
        <StatTile
          icon="🛡️"
          label="Financial Health"
          value={riskScore ? `${Math.round(riskScore.composite_score)}/100` : '—'}
          sub={riskCat ? `${riskCat} risk` : 'Not computed yet'}
          color={riskColor}
          onClick={!analyticsLoading ? handleRefreshScore : undefined}
          cta={analyticsLoading ? '⏳ Computing...' : '↻ Click to refresh'}
        />
        <StatTile
          icon="🏃"
          label="Money Runway"
          value={runway ? (runway >= 999 ? 'Stable ∞' : `${runway} days`) : '—'}
          sub={forecast ? 'At current spending pace' : 'No forecast yet'}
          color={runwayColor}
          onClick={!analyticsLoading ? handleRefreshForecast : undefined}
          cta={analyticsLoading ? '⏳ Computing...' : '↻ Click to refresh'}
        />
        <StatTile
          icon={anomalyCount > 0 ? '⚠️' : '✅'}
          label="Unusual Transactions"
          value={anomalyCount}
          sub={anomalyCount > 0 ? 'Flagged by AI — see below' : 'All looks normal'}
          color={anomalyCount > 0 ? 'var(--warning)' : 'var(--success)'}
        />
      </div>

      {/* ── Middle: forecast + risk ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem' }}>
        <Card
          title="💸 Cash Flow Forecast"
          subtitle="Where will your balance be in 30 days?"
          actions={
            <button
              onClick={handleRefreshForecast}
              disabled={analyticsLoading}
              style={{
                padding: '0.45rem 1rem', borderRadius: 8,
                background: analyticsLoading ? 'var(--bg-surface)' : 'var(--accent)',
                color: analyticsLoading ? 'var(--text-muted)' : '#fff',
                border: 'none', cursor: analyticsLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem', fontWeight: 600, transition: 'background 0.2s',
              }}
            >
              {analyticsLoading ? '⏳ Computing…' : '↻ Refresh Forecast'}
            </button>
          }
        >
          <ForecastChart forecast={forecast} height={195} />
        </Card>

        <Card
          title="🛡️ Financial Health Score"
          subtitle="A composite score based on your income & spending patterns"
          actions={
            <button
              onClick={handleRefreshScore}
              disabled={analyticsLoading}
              style={{
                padding: '0.45rem 1rem', borderRadius: 8,
                background: analyticsLoading ? 'var(--bg-surface)' : 'var(--accent)',
                color: analyticsLoading ? 'var(--text-muted)' : '#fff',
                border: 'none', cursor: analyticsLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem', fontWeight: 600, transition: 'background 0.2s',
              }}
            >
              {analyticsLoading ? '⏳ Computing…' : '↻ Refresh Score'}
            </button>
          }
        >
          <RiskMeter score={riskScore} />
        </Card>
      </div>

      {/* ── Bottom: transactions + anomalies + accounts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>

        {/* Recent Transactions */}
        <Card
          title="📋 Recent Transactions"
          actions={<Link to="/transactions"><Button variant="ghost" size="sm">View all →</Button></Link>}
        >
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.83rem' }}>
              No transactions yet.<br />Click "Add Transaction" above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {transactions.slice(0, 6).map((txn, i) => (
                <div key={txn.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.6rem 0',
                  borderBottom: i < 5 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.83rem', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                      {txn.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {formatDate(txn.date)} · {txn.category}
                    </div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, flexShrink: 0,
                    color: txn.amount < 0 ? 'var(--success)' : 'var(--text-primary)',
                  }}>
                    {txn.amount < 0 ? '+' : ''}{formatCurrency(Math.abs(txn.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Anomaly detector */}
        <Card title="🤖 AI Anomaly Detector" subtitle="Transactions that look unusual">
          <AnomalyExplainer transactions={transactions} />
        </Card>

        {/* Accounts */}
        <Card title="🏦 Accounts">
          {accounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No accounts yet.<br />Click "Add Account" to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {accounts.map((acc) => (
                <div key={acc.id} style={{
                  padding: '0.75rem',
                  background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)' }}>{acc.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{acc.type}</div>
                    </div>
                    {acc.balance != null && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700 }}>
                        {formatCurrency(acc.balance)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}