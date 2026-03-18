// src/pages/Register.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Input  from '../components/ui/Input';
import Button from '../components/ui/Button';

function PasswordStrength({ password }) {
  const checks = [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password), /[^a-zA-Z0-9]/.test(password)];
  const score   = checks.filter(Boolean).length;
  const colors  = ['', 'var(--danger)', 'var(--danger)', 'var(--warning)', 'var(--success)'];
  const labels  = ['', 'Weak', 'Weak', 'Fair', 'Strong'];
  if (!password) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < score ? colors[score] : 'var(--border-subtle)', transition: 'background 0.2s' }} />
        ))}
      </div>
      <span style={{ fontSize: '0.7rem', color: colors[score], fontFamily: 'var(--font-mono)' }}>{labels[score]}</span>
    </div>
  );
}

const INCOME_RANGES = {
  INR: ['₹0–25k', '₹25k–50k', '₹50k–1L', '₹1L+'],
  USD: ['$0–2k', '$2k–5k', '$5k–10k', '$10k+'],
  EUR: ['€0–2k', '€2k–5k', '€5k–10k', '€10k+'],
  GBP: ['£0–2k', '£2k–5k', '£5k–10k', '£10k+'],
};

export default function Register() {
  const { register, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ 
    full_name: '', email: '', password: '', confirm: '',
    currency: 'INR',
    monthly_income_range: '₹0–25k',
    pay_cycle: 'Monthly',
    basic_goal: 'Just track'
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Name is required.';
    if (!form.email)            e.email     = 'Email is required.';
    if (!form.password)         e.password  = 'Password is required.';
    else if (form.password.length < 8)       e.password = 'At least 8 characters.';
    else if (!/[A-Z]/.test(form.password))   e.password = 'Needs an uppercase letter.';
    else if (!/\d/.test(form.password))      e.password = 'Needs a digit.';
    else if (!/[^a-zA-Z0-9]/.test(form.password)) e.password = 'Needs a special character.';
    if (form.password !== form.confirm)      e.confirm  = 'Passwords do not match.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    const { success } = await register(
      form.email, form.password, form.full_name,
      form.currency, form.monthly_income_range, form.pay_cycle, form.basic_goal
    );
    if (success) navigate('/dashboard');
  };

  const handleCurrencyChange = (e) => {
    const newCurrency = e.target.value;
    setForm(f => ({
      ...f, 
      currency: newCurrency,
      monthly_income_range: INCOME_RANGES[newCurrency][0]
    }));
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '460px 1fr' }}>
      <div style={{
        background: 'var(--bg-elevated)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '3rem', overflowY: 'auto',
      }}>
        <Link to="/" style={{ display: 'inline-block', marginBottom: '2rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Finsure
          </span>
        </Link>

        <h2 style={{ marginBottom: '0.4rem' }}>Create your account</h2>
        <p style={{ marginBottom: '1.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Free to use. No card required.
        </p>

        {error && (
          <div style={{
            background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem',
            color: 'var(--danger)', fontSize: '0.82rem', marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <Input label="Full Name" type="text" placeholder="Jane Smith"
            value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            error={errors.full_name} autoComplete="name" />
          <Input label="Email" type="email" placeholder="you@example.com"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            error={errors.email} autoComplete="email" />
          <Input label="Password" type="password" placeholder="Min 8 chars, uppercase, number, symbol"
            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            error={errors.password} autoComplete="new-password" />
          {form.password && <PasswordStrength password={form.password} />}
          <Input label="Confirm Password" type="password" placeholder="Repeat password"
            value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            error={errors.confirm} autoComplete="new-password" />

          {/* Onboarding Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Currency</label>
              <select 
                value={form.currency} 
                onChange={handleCurrencyChange}
                style={{
                  padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', 
                  border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none'
                }}
              >
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="GBP">£ GBP</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Monthly Income</label>
              <select 
                value={form.monthly_income_range} 
                onChange={e => setForm(f => ({ ...f, monthly_income_range: e.target.value }))}
                style={{
                  padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', 
                  border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none'
                }}
              >
                {INCOME_RANGES[form.currency].map(range => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Pay Cycle</label>
              <select 
                value={form.pay_cycle} 
                onChange={e => setForm(f => ({ ...f, pay_cycle: e.target.value }))}
                style={{
                  padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', 
                  border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none'
                }}
              >
                <option value="Monthly">Monthly</option>
                <option value="Weekly">Weekly</option>
                <option value="Irregular">Irregular</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Main Goal</label>
              <select 
                value={form.basic_goal} 
                onChange={e => setForm(f => ({ ...f, basic_goal: e.target.value }))}
                style={{
                  padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', 
                  border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none'
                }}
              >
                <option value="Save money">Save money</option>
                <option value="Control spending">Control spending</option>
                <option value="Get out of debt">Get out of debt</option>
                <option value="Just track">Just track</option>
              </select>
            </div>
          </div>

          <Button type="submit" loading={loading} fullWidth size="lg" style={{ marginTop: '0.5rem' }}>
            Create Account
          </Button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '1.25rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-bright)' }}>Sign in</Link>
        </p>
      </div>

      <div style={{ background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: '2.8rem', lineHeight: 1.1, marginBottom: '1.25rem' }}>
            Understand your<br />
            <span style={{ color: 'var(--accent-bright)' }}>spending patterns.</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Connect once, get ML-powered insights forever. Your data stays encrypted and private.
          </p>
        </div>
      </div>
    </div>
  );
}