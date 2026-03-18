// src/components/dashboard/RiskMeter.js
import React from 'react';

const COMPONENTS = [
  {
    key: 'income_stability_score',
    label: 'Income Stability',
    goodIs: 'low',
    help: 'How consistent your income is. High variance = higher risk.',
    icon: '💰',
  },
  {
    key: 'expense_volatility_score',
    label: 'Spending Control',
    goodIs: 'low',
    help: 'How predictable your spending is each month.',
    icon: '🛒',
  },
  {
    key: 'savings_adequacy_score',
    label: 'Savings Rate',
    goodIs: 'low',
    help: 'How much you spend vs. earn. Low score = you save more.',
    icon: '🏦',
  },
  {
    key: 'debt_exposure_score',
    label: 'Debt & Fees',
    goodIs: 'low',
    help: 'Transfers, fees, and debt payments as % of income.',
    icon: '💳',
  },
];

function scoreToLabel(score) {
  if (score < 34) return { label: 'Good', color: '#10b981' };
  if (score < 67) return { label: 'Watch', color: '#f59e0b' };
  return { label: 'High Risk', color: '#ef4444' };
}

function RiskBar({ value, goodIs }) {
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  const { color } = scoreToLabel(pct);
  return (
    <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: color,
        borderRadius: 4,
        transition: 'width 0.8s ease',
      }} />
    </div>
  );
}

function OverallGauge({ pct, color, category }) {
  // Semi-circle gauge rendered in SVG
  const radius = 52;
  const cx = 70, cy = 68;
  const arcLen = Math.PI * radius; // half circle arc length ≈ 163
  const fill = (pct / 100) * arcLen;

  return (
    <div style={{ position: 'relative', width: 140, height: 80, margin: '0 auto' }}>
      <svg viewBox="0 0 140 80" width="140" height="80">
        {/* Track */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none" stroke="var(--border-subtle)" strokeWidth="10" strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${arcLen}`}
          strokeDashoffset={`${arcLen - fill}`}
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.4s' }}
        />
        {/* Score text */}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="22" fontWeight="800" fill={color} fontFamily="var(--font-mono)">
          {Math.round(pct)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="sans-serif">
          out of 100
        </text>
      </svg>
    </div>
  );
}

function getVerdict(score) {
  const pct = score.composite_score ?? 0;
  const cat = score.risk_category ?? 'Low';
  if (cat === 'Low') return { emoji: '🟢', text: "You're financially healthy! Your spending and income patterns look stable." };
  if (cat === 'Moderate') return { emoji: '🟡', text: "Some areas need attention. Review your spending vs. savings ratio." };
  return { emoji: '🔴', text: "High financial stress detected. Your expenses significantly exceed income or are very volatile." };
}

export default function RiskMeter({ score }) {
  if (!score || !score.composite_score) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', opacity: 0.3 }}>🛡️</div>
        <div style={{ fontSize: '0.88rem', fontWeight: 500, marginBottom: '0.3rem' }}>No risk score yet</div>
        <div style={{ fontSize: '0.76rem', opacity: 0.7 }}>Add transactions and click "Refresh Score" to analyse your financial health</div>
      </div>
    );
  }

  const pct = Math.round(Math.min(100, Math.max(0, score.composite_score)));
  const cat = score.risk_category ?? 'Low';
  const { color } = scoreToLabel(pct);
  const verdict = getVerdict(score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Big gauge */}
      <OverallGauge pct={pct} color={color} category={cat} />

      {/* Verdict */}
      <div style={{
        padding: '0.65rem 0.9rem', borderRadius: 8,
        background: pct < 34 ? 'rgba(16,185,129,0.07)' : pct < 67 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
        border: `1px solid ${color}30`,
        fontSize: '0.8rem', color: 'var(--text-secondary)',
        display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
      }}>
        <span style={{ flexShrink: 0 }}>{verdict.emoji}</span>
        <span>{verdict.text}</span>
      </div>

      {/* Breakdown bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {COMPONENTS.map(({ key, label, help, icon }) => {
          const val = score[key] ?? 0;
          const { label: statusLabel, color: barColor } = scoreToLabel(val);
          return (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem' }}>{icon}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                </div>
                <span style={{
                  fontSize: '0.68rem', padding: '0.15rem 0.55rem', borderRadius: 99,
                  background: `${barColor}18`, color: barColor, fontWeight: 600,
                }}>
                  {statusLabel}
                </span>
              </div>
              <RiskBar value={val} />
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{help}</div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
        Based on {score.transaction_count} transactions · last {score.days_analyzed} days
      </div>
    </div>
  );
}