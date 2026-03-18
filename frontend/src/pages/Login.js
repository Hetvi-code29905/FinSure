// src/pages/Login.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Input  from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function Login() {
  const { login, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.email)    e.email    = 'Email is required.';
    if (!form.password) e.password = 'Password is required.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    const { success } = await login(form.email, form.password);
    if (success) navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '460px 1fr' }}>

      {/* Form panel */}
      <div style={{
        background: 'var(--bg-elevated)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '3rem',
      }}>
        <Link to="/" style={{ display: 'inline-block', marginBottom: '2.5rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Finsure
          </span>
        </Link>

        <h2 style={{ marginBottom: '0.4rem' }}>Welcome back</h2>
        <p style={{ marginBottom: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Sign in to your account
        </p>

        {error && (
          <div style={{
            background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem',
            color: 'var(--danger)', fontSize: '0.82rem', marginBottom: '1.25rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
            error={errors.email}
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
            error={errors.password}
            autoComplete="current-password"
          />
          <Button type="submit" loading={loading} fullWidth size="lg" style={{ marginTop: '0.5rem' }}>
            Sign In
          </Button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '1.5rem' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-bright)' }}>Create one</Link>
        </p>
      </div>

      {/* Decoration panel */}
      <div style={{ background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: '2.8rem', lineHeight: 1.1, marginBottom: '1.25rem' }}>
            Your finances,<br />
            <span style={{ color: 'var(--accent-bright)' }}>under control.</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            AI-powered risk scoring, anomaly detection, and cash flow forecasting — all from your real bank data.
          </p>
        </div>
      </div>
    </div>
  );
}