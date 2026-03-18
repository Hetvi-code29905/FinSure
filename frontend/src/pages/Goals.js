// src/pages/Goals.js
import React, { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { formatCurrency, formatCompact } from '../lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{children}</div>
      {sub && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  );
}

function GoalCard({ goal, onFund, onDelete }) {
  const isComplete = goal.is_completed;
  return (
    <div style={{
      padding: '1.25rem', borderRadius: 14,
      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column', gap: '0.85rem',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{goal.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Due {goal.target_date} · {goal.days_remaining} days left
            </div>
          </div>
        </div>
        <button onClick={() => onDelete(goal.id)} style={{
          background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem'
        }}>✕</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.4rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Saved</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: isComplete ? '#10b981' : 'var(--text-primary)' }}>
            {formatCurrency(goal.current_amount)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Target</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {formatCurrency(goal.target_amount)}
          </div>
        </div>
      </div>

      <div>
        <div style={{ height: 8, background: 'var(--border-subtle)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${goal.progress_pct}%`,
            background: isComplete ? '#10b981' : 'var(--accent)',
            borderRadius: 6, transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {goal.progress_pct.toFixed(1)}% complete
          </span>
          {!isComplete && goal.monthly_contribution_needed > 0 && (
            <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 500 }}>
              Need {formatCurrency(goal.monthly_contribution_needed)}/mo
            </span>
          )}
        </div>
      </div>

      {!isComplete && (
        <button onClick={() => onFund(goal)} style={{
          marginTop: '0.5rem', width: '100%', padding: '0.65rem',
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)',
          color: 'var(--accent)', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
          fontSize: '0.85rem', transition: 'all 0.2s'
        }}>
          + Add Money
        </button>
      )}
      {isComplete && (
        <div style={{
          marginTop: '0.5rem', width: '100%', padding: '0.65rem',
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)',
          color: '#10b981', borderRadius: 8, fontWeight: 600, textAlign: 'center',
          fontSize: '0.85rem'
        }}>
          Goal Reached!
        </div>
      )}
    </div>
  );
}

/* ── "Future You" Simulator ─────────────────────────────────── */
function FutureSimulator() {
  const [monthly, setMonthly] = useState(5000);
  const [years, setYears]     = useState(10);
  const [rate, setRate]       = useState(12);
  const [sim, setSim]         = useState(null);

  useEffect(() => {
    if (monthly > 0 && years > 0 && rate >= 0 && years <= 40 && rate <= 30) {
      apiPost('/goals/simulate', {
        monthly_contribution: monthly,
        years,
        annual_return_pct: rate
      }).then(setSim).catch(() => {});
    }
  }, [monthly, years, rate]);

  return (
    <Card>
      <SectionTitle sub="See the power of compound interest">The "Future You" Simulator</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Monthly Save</div>
          <input type="number" value={monthly} onChange={e => setMonthly(Number(e.target.value))} min={100}
            style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Years to Grow (Max 40)</div>
          <input type="number" value={years} onChange={e => setYears(Number(e.target.value))} min={1} max={40}
            style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Expected Return % (Max 30)</div>
          <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} min={0} max={30} step={1}
            style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
        </div>
      </div>

      {sim && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', background: 'rgba(16,185,129,0.05)', padding: '1rem', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>You invest</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem' }}>{formatCompact(sim.total_contributed)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Interest earned</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: '#10b981' }}>+{formatCompact(sim.total_interest_earned)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Final Balance</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--accent)' }}>{formatCompact(sim.final_balance)}</div>
            </div>
          </div>
          <div style={{ height: 260, width: '100%', marginTop: '0.5rem' }}>
            <ResponsiveContainer>
              <LineChart data={sim.yearly_breakdown} margin={{ top: 15, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={v => `Yr ${v}`} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={v => formatCompact(v)} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(val) => formatCurrency(val)}
                  labelFormatter={(lbl) => `Year ${lbl}`}
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: '0.85rem' }}
                />
                <Line type="monotone" dataKey="total_contributed" name="Invested" stroke="var(--text-muted)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="balance" name="Total Balance" stroke="#10b981" strokeWidth={3} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newDate, setNewDate] = useState('');

  const [fundingGoal, setFundingGoal] = useState(null);
  const [fundAmount, setFundAmount] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGoals(await apiGet('/goals'));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName || !newTarget || !newDate) return;
    try {
      await apiPost('/goals', {
        name: newName, target_amount: parseFloat(newTarget), target_date: newDate, category: 'other'
      });
      setShowAdd(false);
      setNewName(''); setNewTarget(''); setNewDate('');
      load();
    } catch (err) { alert('Failed to create goal'); }
  };

  const handleFund = async (e) => {
    e.preventDefault();
    if (!fundAmount || !fundingGoal) return;
    try {
      await apiPost(`/goals/${fundingGoal.id}/fund`, { amount: parseFloat(fundAmount) });
      setFundingGoal(null);
      setFundAmount('');
      load();
    } catch { alert('Failed to add funds'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this goal forever?')) return;
    try {
      await apiDelete(`/goals/${id}`);
      load();
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Goals & Savings</h2>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Track what you're saving for and visualize your future wealth
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: '0.55rem 1.1rem', borderRadius: 8, border: 'none', background: showAdd ? 'var(--bg-card)' : 'var(--accent)', 
          color: showAdd ? 'var(--text-primary)' : '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
          boxShadow: showAdd ? 'none' : '0 2px 4px rgba(99,102,241,0.2)'
        }}>{showAdd ? 'Cancel' : '+ New Goal'}</button>
      </div>

      {showAdd && (
        <Card style={{ background: 'var(--bg-elevated)', border: '1px solid var(--accent)' }}>
          <SectionTitle>Create a New Goal</SectionTitle>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2fr auto', gap: '1rem', alignItems: 'end' }}>
            <div>
              <div style={{ fontSize: '0.75rem', marginBottom: 4, color: 'var(--text-secondary)' }}>Goal Name</div>
              <input type="text" placeholder="e.g. Dream Car" value={newName} onChange={e => setNewName(e.target.value)} required style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing:'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', marginBottom: 4, color: 'var(--text-secondary)' }}>Target Amount</div>
              <input type="number" step="any" placeholder="500000" min="1" value={newTarget} onChange={e => setNewTarget(e.target.value)} required style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing:'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', marginBottom: 4, color: 'var(--text-secondary)' }}>Target Date</div>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', colorScheme: 'dark', boxSizing:'border-box' }} />
            </div>
            <button type="submit" style={{ padding: '0.65rem 1.25rem', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Save</button>
          </form>
        </Card>
      )}

      {fundingGoal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' }}>
          <Card style={{ width: 400, transform: 'translateY(-20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Fund: {fundingGoal.name}</h3>
            <form onSubmit={handleFund}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Amount to add</div>
              <input type="number" step="any" placeholder="1000" min="1" value={fundAmount} onChange={e => setFundAmount(e.target.value)} required autoFocus
                style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '1.5rem', fontFamily: 'var(--font-mono)', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setFundingGoal(null)} style={{ flex: 1, padding: '0.75rem', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Add Funds →</button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {[...Array(3)].map((_, i) => <div key={i} style={{ height: 160, borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {goals.map(g => <GoalCard key={g.id} goal={g} onFund={setFundingGoal} onDelete={handleDelete} />)}
          {goals.length === 0 && !showAdd && (
            <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 16, border: '1px dashed var(--border-subtle)' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No goals yet</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Set a target and start saving towards it.</div>
              <button onClick={() => setShowAdd(true)} style={{ padding: '0.6rem 1.2rem', borderRadius: 8, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>+ Create Your First Goal</button>
            </div>
          )}
        </div>
      )}

      <FutureSimulator />
    </div>
  );
}
