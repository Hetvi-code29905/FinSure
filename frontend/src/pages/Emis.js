import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { FiTrash2 } from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function Emis() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', date: '' });

  const fetchEmis = async () => {
    try {
      const data = await apiGet('/calendar/events');
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmis();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount || !form.date) return;
    try {
      await apiPost('/calendar/events', {
        title: form.title,
        amount: parseFloat(form.amount),
        type: 'emi',
        recurrence: 'monthly',
        date: form.date,
      });
      setForm({ title: '', amount: '', date: '' });
      setShowForm(false);
      fetchEmis();
    } catch (err) { alert('Failed to add EMI'); }
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Remove this EMI?')) return;
    try { await apiDelete(`/calendar/events/${id}`); fetchEmis(); } catch (err) { alert('Failed to delete'); }
  }

  const emis = events.filter(e => e.type === 'emi');
  const totalEmiMonthly = emis.reduce((sum, e) => sum + e.amount, 0);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#6366f1', '#a855f7', '#ec4899'];

  if (loading) return <div style={{ padding: '2rem' }}>Loading EMI data...</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>🏛️ EMI & Debt Tracker</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            Monitor your total monthly EMI outflows synced directly from your Calendar.
          </p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Monthly EMI</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(totalEmiMonthly, 'INR')}
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: showForm ? 'var(--bg-surface)' : 'var(--accent)', color: showForm ? 'var(--text-primary)' : '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {showForm ? 'Cancel' : '+ Add EMI'}
          </button>
        </div>
      </div>

      {showForm && (
         <div style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
           <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Add New EMI</h3>
           <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
             <div>
               <div style={{ fontSize: '0.75rem', marginBottom: 4 }}>Loan Name</div>
               <input type="text" value={form.title} placeholder="e.g. Car Loan" onChange={e => setForm({...form, title: e.target.value})} required style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing:'border-box' }} />
             </div>
             <div>
               <div style={{ fontSize: '0.75rem', marginBottom: 4 }}>Monthly Amount</div>
               <input type="number" step="any" min="1" value={form.amount} placeholder="5000" onChange={e => setForm({...form, amount: e.target.value})} required style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing:'border-box' }} />
             </div>
             <div>
               <div style={{ fontSize: '0.75rem', marginBottom: 4 }}>Date of First EMI</div>
               <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', colorScheme: 'dark', boxSizing:'border-box' }} />
             </div>
             <button type="submit" style={{ padding: '0.65rem 1.25rem', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer', height: '100%' }}>Save</button>
           </form>
         </div>
      )}

      {emis.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)', border: '1px dashed var(--border-default)',
          borderRadius: 16, padding: '4rem 2rem', textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎉</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No EMIs Found!</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
            You haven't added any EMIs to your calendar. When you take on a loan or mortgage, add an EMI event in your Calendar to track it here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'reapto-fit, minmax(300px, 1fr)', gap: '1.5rem', gridTemplateColumns: 'minmax(300px, 2fr) minmax(300px, 1fr)' }}>
          
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1.25rem 0' }}>Active EMIs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {emis.map((emi, i) => (
                <div key={emi.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '1rem', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                  borderRadius: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[i % COLORS.length] }}></div>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{emi.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        Due on day {new Date(emi.date).getDate()} of every month
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(emi.amount, 'INR')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ month</span>
                      <button onClick={() => handleDelete(emi.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}>
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', textAlign: 'center' }}>Debt Breakdown</h3>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={emis}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="amount"
                    nameKey="title"
                  >
                    {emis.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
