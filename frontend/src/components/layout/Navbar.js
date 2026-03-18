// src/components/layout/Navbar.js
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { FiBell, FiHome, FiClipboard } from 'react-icons/fi';
import { apiGet } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

const PAGE_TITLES = {
  '/dashboard':    'Dashboard',
  '/transactions': 'Transactions',
  '/settings':     'Settings',
};

export default function Navbar() {
  const { pathname } = useLocation();
  const { user }     = useAuthStore();
  const title        = PAGE_TITLES[pathname] || 'Finsure';

  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const events = await apiGet('/calendar/events');
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const todayStr = y + '-' + m + '-' + d;
        const todayD = today.getDate();

        const dueToday = events.filter(e => {
          if (e.type === 'income') return false;
          if (e.recurrence === 'monthly') {
            return new Date(e.date).getUTCDate() === todayD;
          }
          return e.date === todayStr;
        });

        setNotifications(dueToday);
      } catch (err) {
        console.error("Could not fetch notifications");
      }
    };
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header style={{
      height:      'var(--navbar-height)',
      background:  'var(--bg-elevated)',
      borderBottom:'1px solid var(--border-subtle)',
      display:     'flex',
      alignItems:  'center',
      justifyContent: 'space-between',
      padding:     '0 1.5rem',
      position:    'sticky', top: 0,
      zIndex:      90,
    }}>
      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        {title}
      </h4>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        
        {/* Notifications */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ position: 'relative', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: 4 }}
          >
            <FiBell size={20} />
            {notifications.length > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--danger)', color: '#fff', fontSize: '0.6rem', fontWeight: 800, width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                {notifications.length}
              </span>
            )}
          </button>

          {showDropdown && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: 320, background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', overflow: 'hidden', zIndex: 100 }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Notifications</span>
                {notifications.length > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Due Today</span>}
              </div>
              
              <div style={{ maxHeight: 300, overflowY: 'auto', padding: '0.5rem 0' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No bills or EMIs due today!
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>{n.type === 'emi' ? <FiHome /> : <FiClipboard />}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{n.title} Payment Due</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>Don't forget to pay {n.title} today.</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{formatCurrency(n.amount)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ padding: '0.5rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center', background: 'var(--bg-surface)' }}>
                <Link to="/calendar" onClick={() => setShowDropdown(false)} style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                  View full calendar →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.25rem' }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--success)',
            animation:  'pulseDot 2s infinite',
            display:    'inline-block',
          }} />
          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            LIVE
          </span>
        </div>

        {/* User pill */}
        {user && (
          <div style={{
            padding:    '0.3rem 0.8rem',
            background: 'var(--bg-surface)',
            border:     '1px solid var(--border-subtle)',
            borderRadius:'var(--radius-md)',
            fontSize:   '0.8rem', fontWeight: 500,
            color:      'var(--text-primary)',
          }}>
            {user.email}
          </div>
        )}
      </div>
    </header>
  );
}