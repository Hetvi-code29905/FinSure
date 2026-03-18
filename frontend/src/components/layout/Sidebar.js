// src/components/layout/Sidebar.js
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { initials } from '../../lib/utils';
import { FiGrid, FiList, FiShield, FiPieChart, FiHome, FiScissors, FiCalendar, FiCpu, FiSettings, FiLogOut } from 'react-icons/fi';

const NAV = [
  { to: '/dashboard',    label: 'Dashboard',       icon: <FiGrid /> },
  { to: '/transactions', label: 'Transactions',    icon: <FiList /> },
  { to: '/safety',       label: 'Safety Net',      icon: <FiShield /> },
  { to: '/budget',       label: 'Budget & Spending', icon: <FiPieChart /> },
  { to: '/emis',         label: 'EMI Tracker',     icon: <FiHome /> },
  { to: '/subscriptions',label: 'Axe Subscriptions',icon: <FiScissors /> },
  { to: '/calendar',     label: 'Calendar',        icon: <FiCalendar /> },
  { to: '/insights',     label: 'AI Insights',     icon: <FiCpu /> },
  { to: '/settings',     label: 'Settings',        icon: <FiSettings /> },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside style={{
      position:   'fixed',
      top: 0, left: 0, bottom: 0,
      width:      'var(--sidebar-width)',
      background: 'var(--bg-elevated)',
      borderRight:'1px solid var(--border-subtle)',
      display:    'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      {/* Brand */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize:   '1.35rem',
          color:      'var(--text-primary)',
          letterSpacing: '-0.03em',
        }}>
          Finsure
        </span>
        <div style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      '0.65rem',
          color:         'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginTop:     '0.15rem',
        }}>
          Financial Intelligence
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {NAV.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display:        'flex',
            alignItems:     'center',
            gap:            '0.75rem',
            padding:        '0.6rem 0.75rem',
            borderRadius:   'var(--radius-md)',
            textDecoration: 'none',
            fontSize:       '0.875rem',
            fontWeight:     isActive ? 600 : 400,
            color:          isActive ? 'var(--accent-bright)' : 'var(--text-secondary)',
            background:     isActive ? 'var(--accent-glow)'   : 'transparent',
            transition:     'all var(--transition)',
          })}
          onMouseEnter={e => { if (!e.currentTarget.dataset.active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { if (!e.currentTarget.dataset.active) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontSize: '1rem', opacity: 0.8 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.5rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background:   'var(--accent-dim)',
            display:      'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily:   'var(--font-display)',
            fontWeight:   700, fontSize: '0.75rem',
            color:        '#fff', flexShrink: 0,
          }}>
            {initials(user?.full_name || user?.email || '?')}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name || 'User'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: '100%', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: '0.82rem',
            transition: 'all var(--transition)',
            fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-dim)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
        >
          <FiLogOut /> Sign out
        </button>
      </div>
    </aside>
  );
}