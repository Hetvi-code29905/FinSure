// src/lib/utils.js

// ── Currency ──────────────────────────────────────────────────
export function formatCurrency(amount, overrideCurrency = null) {
  if (amount == null) return '—';
  
  let currency = overrideCurrency;
  if (!currency) {
    try {
      const user = JSON.parse(sessionStorage.getItem('fin_user'));
      if (user && user.currency) currency = user.currency;
    } catch {}
    currency = currency || 'INR';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(amount);
}

export function formatCompact(amount, overrideCurrency = null) {
  if (amount == null) return '—';

  let currency = overrideCurrency;
  if (!currency) {
    try {
      const user = JSON.parse(sessionStorage.getItem('fin_user'));
      if (user && user.currency) currency = user.currency;
    } catch {}
    currency = currency || 'INR';
  }

  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
  const symbol = formatter.formatToParts(0).find(p => p.type === 'currency')?.value || '';

  if (Math.abs(amount) >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000)     return `${symbol}${(amount / 1_000).toFixed(1)}k`;
  return formatCurrency(amount, currency);
}

// ── Dates ─────────────────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60)   return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ── Risk ──────────────────────────────────────────────────────
export function getRiskColor(category) {
  return { Low: '#10b981', Moderate: '#f59e0b', High: '#ef4444' }[category] || '#8aa5c4';
}

export function getRiskBg(category) {
  return {
    Low:      'rgba(16,185,129,0.1)',
    Moderate: 'rgba(245,158,11,0.1)',
    High:     'rgba(239,68,68,0.1)',
  }[category] || 'rgba(139,165,196,0.1)';
}

export function formatScore(score) {
  if (score == null) return '—';
  return Math.round(score).toString();
}

// ── Strings ───────────────────────────────────────────────────
export function truncate(str, max = 40) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

// ── Numbers ───────────────────────────────────────────────────
export function formatPct(value, decimals = 1) {
  if (value == null) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

// ── Class names (lightweight clsx) ───────────────────────────
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// ── Category colours ──────────────────────────────────────────
const CATEGORY_COLORS = {
  'Food & Dining':  '#3b82f6',
  'Shopping':       '#8b5cf6',
  'Travel':         '#06b6d4',
  'Entertainment':  '#f59e0b',
  'Services':       '#10b981',
  'Healthcare':     '#ef4444',
  'Income':         '#22c55e',
  'Transfers':      '#6b7280',
  'Utilities':      '#64748b',
  'Uncategorized':  '#4b5563',
};

const CHART_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#f59e0b','#10b981','#ef4444','#f97316'];

export function categoryColor(name, index = 0) {
  return CATEGORY_COLORS[name] || CHART_COLORS[index % CHART_COLORS.length];
}

export { CHART_COLORS };