// src/pages/Budget.js
import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { apiGet } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { FiPieChart, FiCpu, FiMessageSquare, FiDollarSign, FiFolder, FiCalendar, FiActivity, FiTrendingUp, FiTarget, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

/* ── tiny shared helpers ─────────────────────────────────────── */
function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
      borderRadius: 16, padding: '1.3rem 1.5rem', ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{children}</div>
      {sub && <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  );
}

/* ── 50/30/20 bucket card ───────────────────────────────────── */
function BucketCard({ bucket }) {
  const over = bucket.drift_pct > 10;
  return (
    <div style={{
      padding: '1.1rem', borderRadius: 14,
      background: 'var(--bg-surface)', border: `1px solid ${bucket.status_color}30`,
      display: 'flex', flexDirection: 'column', gap: '0.7rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '1.25rem' }}>{bucket.emoji}</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.2rem' }}>{bucket.name}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Target: {bucket.target_pct}% of income
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: 99,
            background: `${bucket.status_color}18`, color: bucket.status_color,
            fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            {bucket.status}
          </div>
        </div>
      </div>

      {/* Amounts */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Spent</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem',
            color: over ? '#ef4444' : 'var(--text-primary)' }}>
            {formatCurrency(bucket.actual_amount)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Budget</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem' }}>
            {formatCurrency(bucket.target_amount)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ height: 8, background: 'var(--border-subtle)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, bucket.actual_pct_of_income / bucket.target_pct * 100)}%`,
            background: bucket.status_color,
            borderRadius: 6, transition: 'width 0.9s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {bucket.actual_pct_of_income.toFixed(1)}% of income
          </span>
          <span style={{
            fontSize: '0.68rem', fontWeight: 600,
            color: bucket.drift_pct > 0 ? '#ef4444' : '#10b981',
          }}>
            {bucket.drift_pct > 0 ? `+${bucket.drift_pct.toFixed(1)}% over` : `${Math.abs(bucket.drift_pct).toFixed(1)}% under`}
          </span>
        </div>
      </div>

      {/* Mini category breakdown */}
      {bucket.categories?.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            Top spends
          </div>
          {bucket.categories.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {c.emoji} {c.name}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600 }}>
                {formatCurrency(c.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Category donut-like bar chart ──────────────────────────── */
function TopCategoriesChart({ categories }) {
  if (!categories?.length) return (
    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
      No spending data this month
    </div>
  );

  const COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      {categories.map((cat, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {cat.emoji} {cat.category}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>
              {formatCurrency(cat.amount)}
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                {cat.pct_of_total}%
              </span>
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${cat.pct_of_total}%`,
              background: COLORS[i % COLORS.length], borderRadius: 4,
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Aesthetic Round Charts ─────────────────────────────────── */
function RoundCharts({ expenses, incomes }) {
  // Vibrant, distinctly contrasting palette for expenses
  const COLORS = ['#ef4444', '#6366f1', '#eab308', '#14b8a6', '#ec4899', '#3b82f6', '#f97316', '#a855f7'];
  // Highly contrasting, optimistic palette for income
  const INCOME_COLORS = ['#10b981', '#0ea5e9', '#f43f5e', '#8b5cf6', '#84cc16', '#06b6d4', '#f59e0b', '#d946ef'];
  
  if (!expenses?.length && !incomes?.length) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem', background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
      
      {/* Income Donut */}
      {incomes?.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981', marginBottom: '0.5rem' }}>Where Income Comes From</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={incomes} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2}>
                {incomes.map((entry, index) => <Cell key={`cell-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />)}
              </Pie>
              <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
          No income data this month
        </div>
      )}

      {/* Expense Donut */}
      {expenses?.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444', marginBottom: '0.5rem' }}>Where Money Goes</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={expenses} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2}>
                {expenses.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
          No spending data this month
        </div>
      )}

    </div>
  );
}

/* ── Month vs last month bar chart ──────────────────────────── */
function MonthComparisonChart({ comparisons }) {
  if (!comparisons?.length) return (
    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
      Need 2 months of data for comparison
    </div>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
        borderRadius: 8, padding: '0.6rem 0.8rem', fontSize: 12, minWidth: 140,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={comparisons} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          axisLine={false} tickLine={false}
          tickFormatter={v => v.length > 8 ? v.slice(0, 8) + '…' : v}
        />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="last_month" name="Last month" fill="#6366f140" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="this_month" name="This month" radius={[4, 4, 0, 0]} maxBarSize={28}>
          {comparisons.map((entry, i) => (
            <Cell key={i} fill={entry.change_pct > 0 ? '#ef4444' : '#10b981'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Spending patterns list ─────────────────────────────────── */
function SpendingPatterns({ patterns, peakDay, weekendMult }) {
  if (!patterns?.length) return (
    <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', padding: '1rem 0' }}>
      Add more transactions to see spending patterns
    </div>
  );

  const sevColor = { good: '#10b981', warn: '#f59e0b', neutral: '#6366f1' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      {patterns.map((p, i) => (
        <div key={i} style={{
          padding: '0.75rem 0.9rem', borderRadius: 10,
          background: `${sevColor[p.severity] || '#6b7280'}0d`,
          border: `1px solid ${sevColor[p.severity] || '#6b7280'}22`,
          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{p.emoji}</span>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.insight}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{p.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Lifestyle Creep card ───────────────────────────────────── */
function LifestyleCreep({ data }) {
  const color = data.lifestyle_creep_detected ? '#ef4444' : '#10b981';
  const bg    = data.lifestyle_creep_detected ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.07)';
  const border = data.lifestyle_creep_detected ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ padding: '0.85rem 1rem', borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color, marginBottom: '0.3rem' }}>
          {data.lifestyle_creep_detected ? '⚠️ Lifestyle Creep Detected' : '✅ Spending in Check'}
        </div>
        <div style={{ fontSize: '0.80rem', color: 'var(--text-secondary)' }}>{data.lifestyle_creep_message}</div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {[
          { label: 'Income Growth', value: `${data.income_growth_pct > 0 ? '+' : ''}${data.income_growth_pct}%`, color: '#10b981' },
          { label: 'Expense Growth', value: `${data.expense_growth_pct > 0 ? '+' : ''}${data.expense_growth_pct}%`,
            color: data.expense_growth_pct > data.income_growth_pct ? '#ef4444' : '#10b981' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: '0.7rem', borderRadius: 10, textAlign: 'center',
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.color }}>
              {s.value}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Saving Target controls ──────────────────────────────────── */
function TargetSavingsControl({ value, onChange, onApply }) {
  return (
    <div style={{
      display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap',
      padding: '0.85rem 1rem', borderRadius: 10,
      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
      flex: 1
    }}>
      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}><FiTarget style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />Monthly Saving Target:</div>
      <input
        type="number"
        placeholder="e.g. 5000"
        value={value}
        onChange={onChange}
        style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
      />
    </div>
  );
}

/* ── Main Budget Page ───────────────────────────────────────── */
export default function Budget() {
  const [data, setData]        = useState(null);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState(null);
  const [inputVal, setInputVal] = useState('');
  const [targetSavings, setTargetSavings] = useState(0);

  const load = useCallback(async (ts) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/budget/analysis', { target_savings: ts || 0 });
      setData(res);
    } catch (e) {
      setError('Could not load budget data. Make sure you have transactions added this month.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(targetSavings); }, []); // eslint-disable-line

  const applyTarget = () => {
      const val = parseFloat(inputVal) || 0;
      setTargetSavings(val);
      load(val);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
            <FiPieChart style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
            Budget & Spending
          </h2>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {data ? `${data.month_label} · ` : ''}Savings prediction modeling, spending patterns & lifestyle check
          </p>
        </div>
        <button
          onClick={() => load(targetSavings)}
          disabled={loading}
          style={{
            padding: '0.5rem 1.1rem', borderRadius: 8, border: 'none',
            background: loading ? 'var(--bg-surface)' : 'var(--accent)',
            color: loading ? 'var(--text-muted)' : '#fff',
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.8rem',
          }}
        >
          {loading ? '⏳ Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Ratio controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <TargetSavingsControl value={inputVal} onChange={e => setInputVal(e.target.value)} />
          <button
            onClick={applyTarget}
            style={{
              padding: '0.6rem 1.1rem', borderRadius: 8,
              border: `1px solid var(--accent)`,
              background: 'transparent',
              color: 'var(--accent)',
              fontWeight: 600, cursor: 'pointer',
              fontSize: '0.8rem', whiteSpace: 'nowrap',
            }}
          >
            Predict & Apply Target →
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '1rem', borderRadius: 10,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: 'var(--danger)', fontSize: '0.85rem',
        }}>⚠️ {error}</div>
      )}

      {loading && !data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              height: 180, borderRadius: 16,
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            }} />
          ))}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Alerts banner */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {data.savings_prediction && (
              <div style={{
                padding: '0.65rem 0.9rem', borderRadius: 8, fontSize: '0.82rem',
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                color: 'var(--text-primary)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start'
              }}>
                <FiCpu size={18} />
                <span style={{fontWeight: 500}}><strong>AI Prediction:</strong> {data.savings_prediction}</span>
              </div>
            )}
            {data.alerts.map((a, i) => {
              const isGood = a.startsWith('✅');
              const cleanText = a.replace(/^[✅🟡⚠️🔴💸]\s*/, '');
              return (
                <div key={i} style={{
                  padding: '0.65rem 0.9rem', borderRadius: 8, fontSize: '0.82rem',
                  background: isGood ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                  border: `1px solid ${isGood ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  color: 'var(--text-secondary)',
                  display: 'flex', gap: '0.4rem', alignItems: 'center'
                }}>
                  {isGood ? <FiCheckCircle size={14} color="#10b981" /> : <FiAlertTriangle size={14} color="#f59e0b" />}
                  <span>{cleanText}</span>
                </div>
              );
            })}
          </div>

          {/* Summary + income stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <Card>
              <SectionTitle sub="AI-generated plain English summary">
                <FiMessageSquare style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                Where Did My Money Go?
              </SectionTitle>
              <div style={{
                padding: '0.85rem 1rem', borderRadius: 10,
                background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)',
                fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem',
              }}>
                {data.human_summary}
              </div>
              <TopCategoriesChart categories={data.top_categories} />
            </Card>

            <Card>
              <SectionTitle>
                <FiDollarSign style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                This Month
              </SectionTitle>
              {[
                { label: 'Income', value: data.monthly_income, color: '#10b981' },
                { label: 'Total Spent', value: data.monthly_expense, color: '#ef4444' },
                { label: 'Saved', value: data.savings_this_month,
                  color: data.savings_this_month >= 0 ? '#10b981' : '#ef4444' },
                { label: 'Savings Rate',
                  value: data.monthly_income > 0
                    ? `${(data.savings_this_month / data.monthly_income * 100).toFixed(1)}%`
                    : '—',
                  color: data.savings_this_month / (data.monthly_income || 1) >= 0.2 ? '#10b981' : '#f59e0b',
                  isMono: true },
              ].map((s, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.6rem 0', borderBottom: i < 3 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: s.color,
                  }}>
                    {typeof s.value === 'number' ? formatCurrency(s.value) : s.value}
                  </span>
                </div>
              ))}
            </Card>
          </div>

          {/* Visual Category Breakdown (Donut Charts) */}
          <Card>
            <SectionTitle sub="Visual breakdown of your main inflow and outflow channels this month">
              <FiPieChart style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
              Category Breakdown
            </SectionTitle>
            <RoundCharts expenses={data.top_categories} incomes={data.top_income_categories} />
          </Card>

          {/* Buckets */}
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              <FiFolder style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
              Budget Buckets 
              {targetSavings > 0 ? (
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                  (Target savings subtracted first, remaining split 60/40)
                </span>
              ) : (
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                   (No direct target set)
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <BucketCard bucket={data.needs} />
              <BucketCard bucket={data.wants} />
              <BucketCard bucket={data.savings_bucket} />
            </div>
          </div>

          {/* Month comparison + patterns + creep */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <Card>
              <SectionTitle sub="This month vs last month by category">
                <FiCalendar style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                Month Comparison
              </SectionTitle>
              <MonthComparisonChart comparisons={data.month_comparisons} />
              {data.month_comparisons.length > 0 && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {data.month_comparisons.slice(0, 3).map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{c.category}</span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontWeight: 600,
                        color: c.change_pct > 0 ? '#ef4444' : '#10b981',
                      }}>
                        {c.change_pct > 0 ? '+' : ''}{c.change_pct.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionTitle sub="Based on your transaction history">
                <FiActivity style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                Spending Patterns
              </SectionTitle>
              <SpendingPatterns
                patterns={data.patterns}
                peakDay={data.peak_spending_day}
                weekendMult={data.weekend_multiplier}
              />
            </Card>

            <Card>
              <SectionTitle sub="Does your spending grow with your income?">
                <FiTrendingUp style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                Lifestyle Creep Check
              </SectionTitle>
              <LifestyleCreep data={data} />
            </Card>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' }}>
            Last updated: {new Date(data.computed_at).toLocaleString('en-IN')}
            {" · "}Based on current calendar month + 90-day history
          </div>
        </>
      )}
    </div>
  );
}
