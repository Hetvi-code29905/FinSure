// src/components/dashboard/StatCard.js
import React from 'react';

export default function StatCard({ label, value, sub, color, mono = true, animateDelay = 0 }) {
  return (
    <div
      className="animate-in"
      style={{
        background:    'var(--bg-card)',
        border:        '1px solid var(--border-subtle)',
        borderRadius:  'var(--radius-lg)',
        padding:       '1.25rem',
        display:       'flex',
        flexDirection: 'column',
        gap:           '0.4rem',
        animationDelay: `${animateDelay}ms`,
        transition:    'border-color var(--transition)',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
    >
      <span style={{
        fontSize:      '0.65rem',
        fontFamily:    'var(--font-mono)',
        color:         'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.09em',
      }}>
        {label}
      </span>

      <span style={{
        fontSize:   '1.8rem',
        fontWeight: 700,
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)',
        color:      color || 'var(--text-primary)',
        lineHeight: 1,
      }}>
        {value ?? '—'}
      </span>

      {sub && (
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {sub}
        </span>
      )}
    </div>
  );
}