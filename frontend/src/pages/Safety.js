// src/pages/Safety.js
import React, { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';

/* ── tiny ui helpers ─────────────────────────────────────────── */
function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
      borderRadius: 16, padding: '1.4rem 1.5rem',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Label({ children, color }) {
  return (
    <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: color || 'var(--text-muted)', marginBottom: '0.35rem' }}>
      {children}
    </div>
  );
}

function BigStat({ value, sub, color }) {
  return (
    <div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: color || 'var(--text-primary)',
        fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ pct, color }) {
  const safePct = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ height: 10, background: 'var(--border-subtle)', borderRadius: 6, overflow: 'hidden', marginTop: '0.5rem' }}>
      <div style={{
        height: '100%', width: `${safePct}%`,
        background: color || 'var(--accent)',
        borderRadius: 6, transition: 'width 1s ease',
      }} />
    </div>
  );
}

function RiskBadge({ level, emoji }) {
  const colors = { Safe: '#10b981', Okay: '#f59e0b', Danger: '#ef4444' };
  const bgs    = { Safe: 'rgba(16,185,129,0.1)', Okay: 'rgba(245,158,11,0.1)', Danger: 'rgba(239,68,68,0.1)' };
  const c = colors[level] || '#8aa5c4';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.3rem 0.8rem', borderRadius: 99,
      background: bgs[level] || 'rgba(139,165,196,0.1)',
      border: `1px solid ${c}40`, color: c,
      fontSize: '0.8rem', fontWeight: 700,
    }}>
      {emoji} {level}
    </span>
  );
}

/* ── Safe-to-Spend calculator ───────────────────────────────── */
function SafeToSpend({ snapshot }) {
  const [amount, setAmount]   = useState('');
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    setLoading(true);
    try {
      const res = await apiPost('/safety/safe-to-spend', { amount: parseFloat(amount) });
      setResult(res);
    } catch {}
    setLoading(false);
  };

  const resultColors = {
    '✅': '#10b981', '🤔': '#f59e0b', '🟡': '#f59e0b', '⚠️': '#ef4444', '🚫': '#ef4444',
  };
  const resultColor  = result ? resultColors[result.emoji] || '#8aa5c4' : undefined;

  return (
    <Card>
      <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.3rem' }}>
        💥 Safe to Spend?
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Enter an amount you're about to spend — we'll tell you if it's safe right now.
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{
            position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', fontSize: '0.9rem', pointerEvents: 'none',
          }}>
            {snapshot?.currency_code === 'INR' ? '₹' : '$'}
          </span>
          <input
            type="number"
            value={amount}
            onChange={e => { setAmount(e.target.value); setResult(null); }}
            onKeyDown={e => e.key === 'Enter' && check()}
            placeholder="0"
            style={{
              width: '100%', padding: '0.75rem 0.75rem 0.75rem 2rem',
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              borderRadius: 10, color: 'var(--text-primary)', fontSize: '1rem',
              fontFamily: 'var(--font-mono)', fontWeight: 600, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <button
          onClick={check}
          disabled={loading || !amount}
          style={{
            padding: '0.75rem 1.5rem', borderRadius: 10, border: 'none',
            background: loading || !amount ? 'var(--bg-surface)' : 'var(--accent)',
            color: loading || !amount ? 'var(--text-muted)' : '#fff',
            fontWeight: 700, cursor: loading || !amount ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem', transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}
        >
          {loading ? '…' : 'Check →'}
        </button>
      </div>

      {result && (
        <div style={{
          marginTop: '1rem', padding: '1rem', borderRadius: 10,
          background: `${resultColor}12`,
          border: `1px solid ${resultColor}30`,
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: resultColor }}>
            {result.emoji} {result.is_safe ? 'Safe to Spend' : 'Hold On!'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{result.verdict}</div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Balance after</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: result.balance_after < 0 ? '#ef4444' : 'var(--text-primary)' }}>
                {formatCurrency(result.balance_after)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Runway after</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: resultColor }}>
                {result.runway_after >= 9999 ? 'Stable' : `${result.runway_after} days`}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Change</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700,
                color: result.runway_change_days >= 0 ? '#10b981' : '#ef4444' }}>
                {result.runway_change_days >= 0 ? '+' : ''}{result.runway_change_days} days
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Bill Predictor ─────────────────────────────────────────── */
function BillPredictor({ bills, total, balanceAfter }) {
  if (!bills || bills.length === 0) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>✅</div>
        <div style={{ fontSize: '0.85rem' }}>No recurring bills detected in next 30 days</div>
        <div style={{ fontSize: '0.74rem', opacity: 0.7, marginTop: '0.25rem' }}>
          Add more transactions and we'll detect your recurring payments
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Summary banner */}
      <div style={{
        padding: '0.65rem 0.9rem', borderRadius: 8,
        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          🗓️ <strong>{formatCurrency(total)}</strong> due in the next 30 days
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Balance after: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700,
            color: balanceAfter < 0 ? '#ef4444' : '#10b981' }}>{formatCurrency(balanceAfter)}</span>
        </div>
      </div>

      {/* Bills list */}
      {bills.map((bill, i) => {
        const urgency = bill.days_until <= 3 ? '#ef4444' : bill.days_until <= 7 ? '#f59e0b' : 'var(--text-muted)';
        return (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem 0.9rem', borderRadius: 10,
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                🔁 {bill.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: urgency, marginTop: 2 }}>
                {bill.days_until <= 0 ? 'Due today!' : `Due in ${bill.days_until} day${bill.days_until !== 1 ? 's' : ''}`} · {formatDate(bill.expected_date)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{bill.category} · {bill.recurrence}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem' }}>
                {formatCurrency(bill.amount)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Emergency Fund section ─────────────────────────────────── */
function EmergencyFund({ snapshot }) {
  const [targetMonths, setTargetMonths] = useState(3);
  
  const target = snapshot.avg_monthly_expense * targetMonths;
  const pct = target > 0 ? (snapshot.total_balance / target * 100) : 100;
  const safePct = Math.min(100, Math.max(0, pct));
  const monthsCovered = target > 0 ? (snapshot.total_balance / snapshot.avg_monthly_expense).toFixed(1) : 0;
  
  const color  = pct >= 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  
  const shortfall = Math.max(0, target - snapshot.total_balance);
  const monthly_top_up = shortfall / 6;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {/* Interactive Month Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '0.5rem', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>Target Buffer:</span>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[1, 3, 6, 12].map(m => (
            <button
              key={m}
              onClick={() => setTargetMonths(m)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: 8,
                border: 'none',
                background: targetMonths === m ? 'var(--accent)' : 'transparent',
                color: targetMonths === m ? '#fff' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
              {m} mo
            </button>
          ))}
        </div>
      </div>

      {/* top metadata */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Current Balance
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color }}>
            {formatCurrency(snapshot.total_balance)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {targetMonths}-Month Target
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(target)}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            (Based on {formatCurrency(snapshot.avg_monthly_expense)}/mo spend)
          </div>
        </div>
      </div>

      {/* progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {monthsCovered} / {targetMonths} months covered
          </span>
          <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color }}>
            {Math.round(pct)}%
          </span>
        </div>
        <ProgressBar pct={safePct} color={color} />
        {/* month markers */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
           <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>0m</span>
           <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>🎯 {targetMonths}m</span>
        </div>
      </div>

      {/* key stats row */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {[
          { label: 'Days Covered', value: snapshot.days_covered >= 9999 ? '∞' : `${snapshot.days_covered}d`, color },
          { label: 'Avg Monthly Spend', value: formatCurrency(snapshot.avg_monthly_expense) },
          { label: 'Actual Savings Rate', value: `${snapshot.savings_rate_pct.toFixed(1)}%`,
            color: snapshot.savings_rate_pct >= 20 ? '#10b981' : snapshot.savings_rate_pct >= 0 ? '#f59e0b' : '#ef4444' },
        ].map((s, i) => (
          <div key={i} title="These metrics are AI-calculated directly from your synced transactions" style={{
            flex: 1, padding: '0.7rem', borderRadius: 10,
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            textAlign: 'center', cursor: 'help'
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
              color: s.color || 'var(--text-primary)' }}>{s.value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* auto-top-up suggestion */}
      {shortfall > 0 && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 10,
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          fontSize: '0.8rem', color: 'var(--text-secondary)',
          display: 'flex', gap: '0.5rem',
        }}>
          <span>💡</span>
          <span>
            Save <strong>{formatCurrency(monthly_top_up)}</strong> more each month to reach your {targetMonths}-month runway goal within 6 months.
          </span>
        </div>
      )}

      {shortfall === 0 && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 10,
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
          fontSize: '0.8rem', color: '#10b981',
          display: 'flex', gap: '0.5rem',
        }}>
          <span>🎉</span>
          <span>You have hit your {targetMonths}-month emergency buffer! Your safety net is solid.</span>
        </div>
      )}
    </div>
  );
}

/* ── Burn Rate summary ──────────────────────────────────────── */
function BurnRate({ snapshot }) {
  const netMonthly = snapshot.avg_monthly_income - snapshot.avg_monthly_expense;
  const netColor   = netMonthly >= 0 ? '#10b981' : '#ef4444';

  const rows = [
    { label: 'AI-Tracked Monthly Income',  value: formatCurrency(snapshot.avg_monthly_income),  color: '#10b981' },
    { label: 'AI-Tracked Monthly Spend',   value: formatCurrency(snapshot.avg_monthly_expense), color: '#ef4444' },
    { label: 'Net Monthly (Actual)',   value: `${netMonthly >= 0 ? '+' : ''}${formatCurrency(netMonthly)}`, color: netColor },
    { label: 'Avg. Daily Burn', value: `${formatCurrency(snapshot.avg_daily_burn)}/day`, color: 'var(--text-primary)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.6rem 0.9rem', borderRadius: 8,
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
        }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{r.label}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: r.color, fontSize: '0.88rem' }}>
            {r.value}
          </span>
        </div>
      ))}

      {/* Runway highlights */}
      <div style={{
        marginTop: '0.25rem', padding: '0.9rem', borderRadius: 10,
        background: snapshot.risk_level === 'Safe'
          ? 'rgba(16,185,129,0.08)' : snapshot.risk_level === 'Okay'
          ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.09)',
        border: `1px solid ${snapshot.risk_level === 'Safe' ? 'rgba(16,185,129,0.2)' :
          snapshot.risk_level === 'Okay' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-mono)',
          color: snapshot.risk_level === 'Safe' ? '#10b981' : snapshot.risk_level === 'Okay' ? '#f59e0b' : '#ef4444' }}>
          {snapshot.runway_days >= 9999 ? '∞' : `${snapshot.runway_days}`}
          <span style={{ fontSize: '1rem', fontWeight: 500, marginLeft: '0.3rem' }}>days runway</span>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
          {snapshot.risk_level === 'Safe'
            ? 'You could survive 3+ months without income'
            : snapshot.risk_level === 'Okay'
            ? 'You have 1–3 months of spending covered'
            : 'Less than 30 days of spending covered — build your buffer'}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function Safety() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/safety/snapshot');
      setSnapshot(data);
    } catch (e) {
      setError('Could not load safety data. Make sure you have accounts & transactions added.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>🛡️ Safety Net</h2>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Your emergency buffer, burn rate, and upcoming bills — at a glance
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {snapshot && <RiskBadge level={snapshot.risk_level} emoji={snapshot.risk_emoji} />}
          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: '0.5rem 1.1rem', borderRadius: 8, border: 'none',
              background: loading ? 'var(--bg-surface)' : 'var(--accent)',
              color: loading ? 'var(--text-muted)' : '#fff',
              fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
            }}
          >
            {loading ? '⏳ Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          padding: '1rem', borderRadius: 10,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: 'var(--danger)', fontSize: '0.85rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !snapshot && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{
              height: 180, borderRadius: 16, background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      )}

      {/* Main content */}
      {snapshot && !loading && (
        <>
          {/* Row 1: Emergency Fund + Burn Rate */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem' }}>
            <Card>
              <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
                🏦 Emergency Fund
              </div>
              <EmergencyFund snapshot={snapshot} />
            </Card>
            <Card>
              <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🔥 Burn Rate & Runway</span>
                <span title="Calculated automatically from your transaction history over the last 180 days" style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '0.2rem 0.5rem', borderRadius: 4, cursor: 'help' }}>DATA: Last 180 Days</span>
              </div>
              <BurnRate snapshot={snapshot} />
            </Card>
          </div>

          {/* Row 2: Safe-to-Spend + Bill Predictor */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '1rem' }}>
            <SafeToSpend snapshot={snapshot} />
            <Card>
              <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                🗓️ Upcoming Bills (next 30 days)
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                AI-detected recurring payments based on your transaction history
              </div>
              <BillPredictor
                bills={snapshot.upcoming_bills}
                total={snapshot.total_upcoming_30d}
                balanceAfter={snapshot.balance_after_upcoming}
              />
            </Card>
          </div>

          {/* Footer note */}
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' }}>
            Last updated: {new Date(snapshot.computed_at).toLocaleString('en-IN')}
            &nbsp;&middot;&nbsp;Based on your last 180 days of transactions
          </div>
        </>
      )}
    </div>
  );
}
