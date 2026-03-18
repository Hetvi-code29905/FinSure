// src/pages/Subscriptions.js
import React, { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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

function SubRow({ sub, onEdit, onDelete, onMarkUnused }) {
  const isVampire = sub.is_unused_warning;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'auto 2fr 1.5fr 1fr 1fr auto', gap: '1rem', alignItems: 'center',
      padding: '1rem', borderBottom: '1px solid var(--border-subtle)',
      background: isVampire ? 'rgba(239,68,68,0.04)' : 'transparent',
      opacity: sub.is_active ? 1 : 0.5,
    }}>
      <div style={{ width: 32, textAlign: 'center' }}></div>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {sub.name}
          {isVampire && <span title="Unused for >60 days" style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, border: '1px solid #ef4444', borderRadius: '4px', padding: '1px 4px' }}>UNUSED</span>}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub.category} · {sub.billing_cycle}</div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: isVampire ? '#ef4444' : 'var(--text-primary)' }}>
          {formatCurrency(sub.amount)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          ~{formatCurrency(sub.monthly_cost)}/mo equivalent
        </div>
      </div>
      <div>
        {sub.is_active ? (
          <>
             <div style={{ fontSize: '0.8rem', color: sub.days_until_due <= 3 ? '#f59e0b' : 'var(--text-secondary)' }}>
              In {sub.days_until_due} days
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub.next_billing_date.slice(0, 10)}</div>
          </>
        ) : (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.2rem 0.5rem', background: 'var(--bg-surface)', borderRadius: 4 }}>Canceled</span>
        )}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {formatCurrency(sub.annual_cost)}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Annually</div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {sub.is_active && !isVampire && (
          <button onClick={() => onMarkUnused(sub.id)} title="Report Unused" style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '0.4rem', cursor: 'pointer', fontSize: '0.7rem' }}>Report Unused</button>
        )}
        <button onClick={() => onEdit(sub)} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '0.4rem', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.7rem' }}>Edit</button>
        <button onClick={() => onDelete(sub.id)} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '0.4rem', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' }}>Delete</button>
      </div>
    </div>
  );
}

export default function Subscriptions() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', amount: '', billing_cycle: 'monthly', next_billing_date: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { setSubs(await apiGet('/subscriptions')); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount || !form.next_billing_date) return;
    const data = { ...form, amount: parseFloat(form.amount) };
    try {
      if (editId) {
        await apiPatch(`/subscriptions/${editId}`, data);
      } else {
        await apiPost('/subscriptions', data);
        // Also sync to calendar automatically
        await apiPost('/calendar/', {
             title: form.name + ' Subscription',
             amount: data.amount,
             type: 'subscription',
             recurrence: form.billing_cycle === 'annual' ? 'yearly' : 'monthly',
             date: form.next_billing_date
        }).catch(err => console.log(err));
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', amount: '', billing_cycle: 'monthly', next_billing_date: '' });
      load();
    } catch { alert('Failed to save subscription'); }
  };

  const handleEdit = (s) => {
    setForm({ name: s.name, amount: s.amount, billing_cycle: s.billing_cycle, next_billing_date: s.next_billing_date.slice(0, 10) });
    setEditId(s.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subscription?')) return;
    try { await apiDelete(`/subscriptions/${id}`); load(); } catch {}
  };

  const handleMarkUnused = async (id) => {
    // Marking unused sets last_used_date to 61 days ago to trigger the vampire alert instantly for simulation
    const fakeDate = new Date();
    fakeDate.setDate(fakeDate.getDate() - 61);
    try { await apiPatch(`/subscriptions/${id}`, { last_used_date: fakeDate.toISOString() }); load(); } catch {}
  };
  
  const handleToggleActive = async (id, currentIsActive) => {
      try { await apiPatch(`/subscriptions/${id}`, { is_active: !currentIsActive }); load(); } catch {}
  }


  // Auditing calculations
  const activeSubs = subs.filter(s => s.is_active);
  const totalMonthly = activeSubs.reduce((sum, s) => sum + s.monthly_cost, 0);
  const totalAnnual = activeSubs.reduce((sum, s) => sum + s.annual_cost, 0);
  
  const vampireSubs = subs.filter(s => s.is_unused_warning);
  const vampireAnnual = vampireSubs.reduce((sum, s) => sum + s.annual_cost, 0);

  // Group by category for pie chart
  const byCategory = activeSubs.reduce((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + s.monthly_cost;
    return acc;
  }, {});
  const chartData = Object.keys(byCategory).map(k => ({ name: k, value: byCategory[k] }));
  const COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Subscriptions Tracker</h2>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Track recurring costs, audit annual splurges, and detect unused subscriptions.
          </p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', amount: '', billing_cycle: 'monthly', next_billing_date: '' }); }} style={{
          padding: '0.55rem 1.1rem', borderRadius: 8, border: 'none', background: showForm ? 'var(--bg-card)' : 'var(--accent)', 
          color: showForm ? 'var(--text-primary)' : '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'
        }}>{showForm ? 'Cancel' : '+ Add Sub'}</button>
      </div>

      {showForm && (
         <Card style={{ background: 'var(--bg-elevated)', border: '1px solid var(--accent)' }}>
           <SectionTitle>{editId ? 'Edit Subscription' : 'Track a New Cost'}</SectionTitle>
           <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1.5fr auto', gap: '1rem', alignItems: 'end' }}>
             <div>
               <div style={{ fontSize: '0.75rem', marginBottom: 4, color: 'var(--text-secondary)' }}>Service Name</div>
               <input type="text" placeholder="Netflix" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing:'border-box' }} />
             </div>
             <div>
               <div style={{ fontSize: '0.75rem', marginBottom: 4, color: 'var(--text-secondary)' }}>Cost</div>
               <input type="number" step="any" placeholder="499" min="1" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing:'border-box' }} />
             </div>
             <div>
               <div style={{ fontSize: '0.75rem', marginBottom: 4, color: 'var(--text-secondary)' }}>Cycle</div>
               <select value={form.billing_cycle} onChange={e => setForm({...form, billing_cycle: e.target.value})} style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing:'border-box' }}>
                 <option value="monthly">Monthly</option>
                 <option value="annual">Annual</option>
                 <option value="quarterly">Quarterly</option>
               </select>
             </div>
             <div>
               <div style={{ fontSize: '0.75rem', marginBottom: 4, color: 'var(--text-secondary)' }}>Next Bill Date</div>
               <input type="date" value={form.next_billing_date} onChange={e => setForm({...form, next_billing_date: e.target.value})} required style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', colorScheme: 'dark', boxSizing:'border-box' }} />
             </div>
             <div style={{display:'flex', gap:'0.5rem'}}>
                {editId && (
                     <button type="button" onClick={() => handleToggleActive(editId, subs.find(s=>s.id === editId)?.is_active)} style={{ padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.9rem' }}>
                         {subs.find(s=>s.id === editId)?.is_active ? 'Cancel Sub' : 'Reactivate'}
                     </button>
                )}
                <button type="submit" style={{ padding: '0.65rem 1.25rem', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Save</button>
             </div>
           </form>
         </Card>
      )}

      {!loading && subs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
          
          {/* Audit Dashboard Card */}
          <Card>
            <SectionTitle sub="The painful reality of recurring costs">Audit Dashboard</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Monthly Bleed</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {formatCurrency(totalMonthly)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Annualized Cost (Wow.)</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                  {formatCurrency(totalAnnual)}
                </div>
              </div>
              
              {vampireAnnual > 0 && (
                <div style={{ marginTop: '0.5rem', padding: '0.8rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    Unused Subscriptions Alert
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                    You are wasting <strong style={{color:'var(--text-primary)'}}>{formatCurrency(vampireAnnual)} / year</strong> on subscriptions you haven't used in 60+ days.
                  </div>
                </div>
              )}

              {chartData.length > 0 && (
                <div style={{ height: 160, marginTop: '1rem' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={chartData} innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                        {chartData.map((e, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(val) => formatCurrency(val)} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </Card>

          {/* Subscription List */}
          <Card style={{ padding: '1rem 0' }}>
            <div style={{ padding: '0 1.5rem', marginBottom: '0.5rem' }}>
                 <SectionTitle sub="Active and canceled recurring items">All Subscriptions</SectionTitle>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'auto 2fr 1.5fr 1fr 1fr auto', gap: '1rem',
                  padding: '0.5rem 1.5rem', borderBottom: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)'
                }}>
                  <div style={{ width: 32 }}></div>
                  <div>Service</div>
                  <div>Cost</div>
                  <div>Next Bill</div>
                  <div>Annualized</div>
                  <div style={{ width: 80}}>Actions</div>
                </div>
                {subs.map(s => <SubRow key={s.id} sub={s} onEdit={handleEdit} onDelete={handleDelete} onMarkUnused={handleMarkUnused} />)}
            </div>
          </Card>

        </div>
      )}

      {!loading && subs.length === 0 && !showForm && (
         <div style={{ padding: '4rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 16, border: '1px dashed var(--border-subtle)' }}>
             <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>No subscriptions tracked</div>
             <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Stop the silent wealth bleed. Add your Netflix, Gym, and SaaS costs here.</div>
             <button onClick={() => setShowForm(true)} style={{ padding: '0.7rem 1.4rem', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>+ Track Cost</button>
         </div>
      )}

    </div>
  );
}
