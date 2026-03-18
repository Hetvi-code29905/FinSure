// src/components/dashboard/ForecastChart.js
import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { formatCurrency, formatDate } from '../../lib/utils';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const balance = payload.find(p => p.dataKey === 'predicted_balance')?.value;
  const isNeg = balance < 0;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
      borderRadius: 8, padding: '0.7rem 1rem', fontSize: 12, minWidth: 140,
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
        {formatDate(label)}
      </div>
      <div style={{ color: isNeg ? 'var(--danger)' : 'var(--success)', fontWeight: 700, fontSize: 14 }}>
        {formatCurrency(balance)}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 3 }}>
        Projected Balance
      </div>
    </div>
  );
};

function RunwayStat({ label, value, color, icon }) {
  return (
    <div style={{
      flex: 1, padding: '0.75rem', borderRadius: 10,
      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.1rem', marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: color || 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function ForecastChart({ forecast, height = 200 }) {
  if (!forecast?.daily_projections?.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.6rem', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', opacity: 0.18 }}>📈</div>
        <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>Click "Refresh Forecast" to see your 30-day outlook</span>
        <span style={{ fontSize: '0.74rem', opacity: 0.6 }}>Add at least one transaction to get started</span>
      </div>
    );
  }

  const data = forecast.daily_projections.slice(0, 30);
  const runway = forecast.estimated_runway_days;
  const shortageProb = forecast.shortage_probability_pct ?? 0;
  const avgSpend = forecast.avg_daily_spend ?? 0;
  const avgMonthlySpend = forecast.avg_monthly_expense ?? 0;
  const avgMonthlyIncome = forecast.avg_monthly_income ?? 0;
  const depletion = forecast.depletion_date;

  const runwayText = runway >= 999 ? '∞ Stable' : `${runway} days`;
  const runwayColor = runway >= 90 ? 'var(--success)' : runway >= 30 ? 'var(--warning)' : 'var(--danger)';
  const riskColor = shortageProb < 10 ? 'var(--success)' : shortageProb < 40 ? 'var(--warning)' : 'var(--danger)';
  const shortageText = shortageProb < 5 ? 'Very Low' : shortageProb < 20 ? 'Low' : shortageProb < 50 ? 'Moderate' : 'High';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* human-readable headline */}
      <div style={{
        padding: '0.65rem 0.9rem', borderRadius: 8,
        background: depletion ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.07)',
        border: `1px solid ${depletion ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
        fontSize: '0.82rem', color: depletion ? 'var(--danger)' : 'var(--success)',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
      }}>
        <span>{depletion ? '⚠️' : '✅'}</span>
        <span>
          {depletion
            ? `Your balance may run out by ${formatDate(depletion)}. Consider cutting ₹${Math.round(avgSpend * 30).toLocaleString()}/mo in spending.`
            : runway >= 999
              ? 'Your finances look stable for the next 30 days! Keep it up.'
              : `At your current pace, your balance will last ~${runway} more days.`
          }
        </span>
      </div>

      {/* key stats */}
      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <RunwayStat icon="🏃" label="Days of runway" value={runwayText} color={runwayColor} />
        <RunwayStat icon="📉" label="Monthly spend" value={formatCurrency(avgMonthlySpend)} color="var(--text-primary)" />
        <RunwayStat icon="📈" label="Monthly income" value={formatCurrency(avgMonthlyIncome)} color="var(--success)" />
      </div>

      {/* chart */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fg2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            tickFormatter={(d) => {
              // Show only on the 1st or 8th of each month for clean monthly labels
              const day = parseInt(d.split('-')[2], 10);
              const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              const monthIdx = parseInt(d.split('-')[1], 10) - 1;
              if (day === 1) return `1 ${monthNames[monthIdx]}`;
              if (day === 8 || day === 15 || day === 22) return `${day}`;
              return '';
            }}
            axisLine={false} tickLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            tickFormatter={(v) => {
              if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
              return v;
            }}
            axisLine={false} tickLine={false} width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Zero', position: 'insideTopRight', fontSize: 9, fill: 'var(--danger)' }} />
          <Area
            type="monotone"
            dataKey="predicted_balance"
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill="url(#fg2)"
            dot={false}
            activeDot={{ r: 5, fill: 'var(--accent)', strokeWidth: 0 }}
          />
          {depletion && (
            <ReferenceLine
              x={depletion}
              stroke="var(--danger)"
              strokeWidth={2}
              strokeDasharray="5 3"
              label={{ value: '⚠ Depletes', position: 'insideTopRight', fontSize: 9, fill: 'var(--danger)' }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}