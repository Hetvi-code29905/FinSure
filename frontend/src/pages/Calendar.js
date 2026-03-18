// src/pages/Calendar.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { FiPlus, FiChevronLeft, FiChevronRight, FiTrash2, FiCalendar } from 'react-icons/fi';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Colors based on type
const TYPE_COLORS = {
  income: { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#059669' },
  bill: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#b91c1c' },
  emi: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#b45309' },
  subscription: { bg: 'rgba(99,102,241,0.15)', border: '#6366f1', text: '#4338ca' },
  other: { bg: 'rgba(107,114,128,0.15)', border: '#6b7280', text: '#374151' }
};

export default function CashCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  
  // New Event Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('bill');
  const [recurrence, setRecurrence] = useState('monthly');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet('/calendar/events');
      setEvents(res);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Create grid cells
  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < firstDayOfMonth; i++) arr.push({ key: `empty-${i}`, empty: true });
    
    for (let d = 1; d <= daysInMonth; d++) {
        const fullDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        // Find events that land on this day
        const dayEvents = events.filter(e => {
            const evDate = new Date(e.date);
            if (isNaN(evDate)) return false;
            
            if (e.recurrence === 'monthly') {
                return evDate.getUTCDate() === d;
            } else if (e.recurrence === 'yearly') {
                return evDate.getUTCDate() === d && evDate.getUTCMonth() === month;
            } else {
                return e.date === fullDateStr;
            }
        });

        arr.push({ key: d, date: d, fullDateStr, events: dayEvents });
    }
    return arr;
  }, [firstDayOfMonth, daysInMonth, year, month, events]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const openModalForDate = (dateStr) => {
      setSelectedDateStr(dateStr);
      setTitle('');
      setAmount('');
      setType('bill');
      setRecurrence('monthly');
      setShowModal(true);
  };

  const saveEvent = async (e) => {
      e.preventDefault();
      if (!title || !amount) return;
      try {
          await apiPost('/calendar/', {
              title,
              amount: Number(amount),
              type,
              recurrence,
              date: selectedDateStr || `${year}-${String(month+1).padStart(2,'0')}-01`
          });
          setShowModal(false);
          loadEvents();
      } catch (err) {
          alert('Failed to save event');
      }
  };

  const deleteEvent = async (e, id) => {
      e.stopPropagation();
      if (!window.confirm("Delete this event?")) return;
      try {
          await apiDelete(`/calendar/${id}`);
          loadEvents();
      } catch(err) {
          alert(err.response?.data?.detail || "Could not delete event.");
      }
  };

  // Month stats calculation
  const monthlyIncoming = useMemo(() => {
      return events.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  }, [events]);

  const monthlyOutgoing = useMemo(() => {
      return events.filter(e => e.type !== 'income').reduce((sum, e) => sum + e.amount, 0);
  }, [events]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem', paddingBottom: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Financial Calendar</h2>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            A unified timeline of your expected salary, recurring bills, and EMIs.
          </p>
        </div>
        
        <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '0.6rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Inflow</span>
                <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{formatCurrency(monthlyIncoming, 'INR')}</span>
            </div>
            <div style={{ padding: '0.6rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Outflow</span>
                <span style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{formatCurrency(monthlyOutgoing, 'INR')}</span>
            </div>
        </div>
      </div>

      <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden', flexDirection: 'column', minHeight: 700, flex: 1 }}>
          
          {/* Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button onClick={handleToday} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', ':hover': {background: 'var(--bg-elevated)'} }}>
                      Today
                  </button>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button onClick={handlePrevMonth} style={{ padding: '0.5rem', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <FiChevronLeft size={20} />
                      </button>
                      <button onClick={handleNextMonth} style={{ padding: '0.5rem', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <FiChevronRight size={20} />
                      </button>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                      {currentDate.toLocaleString('default', { month: 'long' })} {year}
                  </h3>
              </div>
              <button 
                  onClick={() => openModalForDate('')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(99,102,241,0.2)' }}>
                  <FiPlus /> Add Cash Event
              </button>
          </div>

          {/* Grid Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              {WEEKDAYS.map(day => (
                  <div key={day} style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
                      {day}
                  </div>
              ))}
          </div>

          {/* Grid Body */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(120px, 1fr)', flex: 1, background: 'var(--border-subtle)', gap: '1px' }}>
              {days.map((d, i) => {
                  let isPast = false;
                  if (!d.empty) {
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      isPast = new Date(d.fullDateStr) < today;
                  }
                  return (
                  <div key={i} 
                       onClick={() => !d.empty && !isPast && openModalForDate(d.fullDateStr)}
                       style={{ background: 'var(--bg-card)', padding: '0.5rem', position: 'relative', transition: 'background 0.2s', cursor: (d.empty || isPast) ? 'default' : 'pointer', opacity: isPast ? 0.8 : 1, ':hover': { background: (d.empty || isPast) ? 'var(--bg-card)' : 'var(--bg-surface)'} }}>
                      
                      {!d.empty && (
                          <>
                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                  <span style={{ 
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      width: 28, height: 28, borderRadius: '50%', fontSize: '0.85rem', fontWeight: 600,
                                      background: new Date().getDate() === d.date && month === new Date().getMonth() && year === new Date().getFullYear() ? 'var(--accent)' : 'transparent',
                                      color: new Date().getDate() === d.date && month === new Date().getMonth() && year === new Date().getFullYear() ? '#fff' : 'var(--text-secondary)'
                                  }}>
                                      {d.date}
                                  </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem', height: 'calc(100% - 30px)', overflowY: 'auto' }}>
                                  {d.events.map(ev => {
                                      const colors = TYPE_COLORS[ev.type] || TYPE_COLORS.other;
                                      return (
                                          <div key={ev.id} onClick={(e) => e.stopPropagation()} style={{ 
                                              background: colors.bg, 
                                              borderLeft: `3px solid ${colors.border}`, 
                                              padding: '0.3rem 0.5rem', 
                                              borderRadius: 4, 
                                              fontSize: '0.75rem',
                                              display: 'flex', 
                                              flexDirection: 'column',
                                              position: 'relative',
                                              group: 'event'
                                          }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                  <span style={{ fontWeight: 600, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%', opacity: isPast ? 0.7 : 1 }}>
                                                      {ev.title}
                                                  </span>
                                                  {!ev.id.startsWith("sub_") && !isPast && (
                                                      <button onClick={(e) => deleteEvent(e, ev.id)} style={{ background: 'none', border: 'none', padding: 0, color: colors.text, opacity: 0.6, cursor: 'pointer', zIndex: 10 }}>
                                                          <FiTrash2 size={12} />
                                                      </button>
                                                  )}
                                              </div>
                                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: colors.text, opacity: 0.9 }}>
                                                  {formatCurrency(ev.amount, 'INR')}
                                              </span>
                                          </div>
                                      );
                                  })}
                              </div>
                          </>
                      )}
                  </div>
              )})}
          </div>

      </div>

      {/* Add Event Modal */}
      {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
              <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: 16, width: 400, border: '1px solid var(--border-default)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem' }}>{selectedDateStr ? `Plan Event for ${selectedDateStr}` : 'Add Calendar Event'}</h3>
                  <form onSubmit={saveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                      
                      {(!selectedDateStr) && (
                          <div>
                              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Event Date</label>
                              <input required type="date"
                                  onChange={e => setSelectedDateStr(e.target.value)}
                                  style={{ width: '100%', padding: '0.8rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                          </div>
                      )}

                      <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Title</label>
                          <input required type="text" placeholder="e.g. Salary, Rent, Netflix" value={title} onChange={(e) => setTitle(e.target.value)} 
                              style={{ width: '100%', padding: '0.8rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing: 'border-box', fontFamily: 'var(--font-sans)' }} />
                      </div>
                      
                      <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Amount</label>
                          <input required type="number" step="any" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} 
                              style={{ width: '100%', padding: '0.8rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing: 'border-box', fontFamily: 'var(--font-mono)' }} />
                      </div>

                      <div style={{ display: 'flex', gap: '1rem' }}>
                          <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Type</label>
                              <select value={type} onChange={e => setType(e.target.value)}
                                  style={{ width: '100%', padding: '0.8rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing: 'border-box' }}>
                                  <option value="income">Income (Salary)</option>
                                  <option value="bill">Bill (Rent/Utilities)</option>
                                  <option value="emi">EMI (Loan/Mortgage)</option>
                                  <option value="subscription">Subscription</option>
                                  <option value="other">Other</option>
                              </select>
                          </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                              <input type="radio" name="rec" value="once" checked={recurrence === 'once'} onChange={e => setRecurrence(e.target.value)} />
                              One-Off
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                              <input type="radio" name="rec" value="monthly" checked={recurrence === 'monthly'} onChange={e => setRecurrence(e.target.value)} />
                              Monthly Recurring
                          </label>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1rem' }}>
                          <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.8rem 1.2rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
                              Cancel
                          </button>
                          <button type="submit" style={{ padding: '0.8rem 1.5rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                              Save Event
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
}
