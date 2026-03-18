import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { apiPatch, apiDelete } from '../lib/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const INCOME_RANGES = {
  INR: ['₹0–25k', '₹25k–50k', '₹50k–1L', '₹1L+'],
  USD: ['$0–2k', '$2k–5k', '$5k–10k', '$10k+'],
  EUR: ['€0–2k', '€2k–5k', '€5k–10k', '€10k+'],
  GBP: ['£0–2k', '£2k–5k', '£5k–10k', '£10k+'],
};

function SettingCard({ title, icon, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
      borderRadius: 16, overflow: 'hidden', marginBottom: '1.5rem',
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{
        padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-elevated)'
      }}>
        <div style={{ fontSize: '1.25rem' }}>{icon}</div>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {children}
      </div>
    </div>
  );
}

function SelectField({ label, value, options, onChange, warning }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <select 
        value={value} 
        onChange={onChange}
        style={{
          padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', 
          border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none',
          fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', width: '100%'
        }}
      >
        {options.map(opt => (
          typeof opt === 'string' 
            ? <option key={opt} value={opt}>{opt}</option> 
            : <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {warning && (
        <span style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: 2 }}>{warning}</span>
      )}
    </div>
  );
}

export default function Settings() {
  const { user, fetchUser } = useAuthStore(); // login actually just sets the context if we pass it, but maybe we can just reload
  
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    currency: user?.currency || 'INR',
    monthly_income_range: user?.monthly_income_range || '₹0–25k',
    pay_cycle: user?.pay_cycle || 'Monthly',
    basic_goal: user?.basic_goal || 'Just track'
  });

  const [initialForm, setInitialForm] = useState(form);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrencyWarning, setShowCurrencyWarning] = useState(false);

  // Sync state if user context updates from outside
  useEffect(() => {
    if (user) {
      const u = {
        full_name: user.full_name || '',
        currency: user.currency || 'INR',
        monthly_income_range: user.monthly_income_range || '₹0–25k',
        pay_cycle: user.pay_cycle || 'Monthly',
        basic_goal: user.basic_goal || 'Just track'
      };
      setForm(u);
      setInitialForm(u);
    }
  }, [user]);

  const currencyHasChanged = form.currency !== initialForm.currency;

  const handleCurrencyChange = (e) => {
    const newCurrency = e.target.value;
    setForm(f => ({
      ...f, 
      currency: newCurrency,
      monthly_income_range: INCOME_RANGES[newCurrency][0]
    }));
    setShowCurrencyWarning(newCurrency !== initialForm.currency);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (currencyHasChanged) {
      const confirm = window.confirm(
        "WARNING: Changing your default currency will permanently WIPE ALL YOUR FINSURE DATA.\n\n" +
        "This includes all your linked accounts, historical transactions, calendar events, and budget history.\n\n" +
        "Are you absolutely sure you want to change your currency to " + form.currency + "?"
      );
      if (!confirm) return;
    }

    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const payload = {};
      if (form.full_name !== initialForm.full_name) payload.full_name = form.full_name;
      if (form.currency !== initialForm.currency) payload.currency = form.currency;
      if (form.monthly_income_range !== initialForm.monthly_income_range) payload.monthly_income_range = form.monthly_income_range;
      if (form.pay_cycle !== initialForm.pay_cycle) payload.pay_cycle = form.pay_cycle;
      if (form.basic_goal !== initialForm.basic_goal) payload.basic_goal = form.basic_goal;

      if (Object.keys(payload).length > 0) {
        await apiPatch('/users/me', payload);
        
        setSuccessMsg('Settings updated successfully!');
        if (payload.currency) {
          setSuccessMsg('Settings updated! Your currency has been changed and old transactions removed.');
        }
        
        // Let user see the message, then reload to update whole app context properly
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setSuccessMsg('No changes made.');
        setTimeout(() => setSuccessMsg(''), 3000);
        setIsSaving(false);
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || 'Failed to update settings');
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    const confirm = window.confirm(
      "DANGER: Are you sure you want to deactivate your account?\n\n" +
      "This will immediately revoke access and queue your data for deletion."
    );
    if (!confirm) return;
    
    try {
      await apiDelete('/users/me');
      window.location.href = '/login'; // hard redirect to wipe memory
    } catch (err) {
      alert("Error deactivating account.");
    }
  };

  return (
    <div style={{ maxWidth: 768, margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>⚙️ Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
          Manage your account preferences, tracking settings, and data security.
        </p>
      </div>

      {successMsg && (
        <div style={{
          padding: '1rem', borderRadius: 10, marginBottom: '1.5rem',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
          color: '#10b981', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <span>✅</span> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '1rem', borderRadius: 10, marginBottom: '1.5rem',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <span>⚠️</span> {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave}>

        {/* ── Profile ── */}
        <SettingCard title="Profile Information" icon="👤">
          <Input 
            label="Full Name" 
            value={form.full_name} 
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} 
            placeholder="Jane Doe" 
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
            <input 
              disabled 
              value={user?.email || ''} 
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', 
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', 
                color: 'var(--text-muted)', cursor: 'not-allowed', outline: 'none', fontSize: '0.9rem'
              }} 
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Emails cannot be changed for security reasons.</span>
          </div>
        </SettingCard>

        {/* ── Finance Config ── */}
        <SettingCard title="Financial Preferences" icon="💵">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            
            <div style={{ gridColumn: '1 / -1' }}>
              <SelectField 
                label="Primary Currency" 
                value={form.currency} 
                onChange={handleCurrencyChange}
                options={[
                  {value: 'INR', label: '₹ INR (Indian Rupee)'},
                  {value: 'USD', label: '$ USD (US Dollar)'},
                  {value: 'EUR', label: '€ EUR (Euro)'},
                  {value: 'GBP', label: '£ GBP (British Pound)'}
                ]}
              />
              {showCurrencyWarning && (
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: 8, marginTop: '0.75rem',
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                  color: 'var(--warning)', fontSize: '0.82rem'
                }}>
                  <strong>⚠️ Critical Warning:</strong> Saving a different currency will completely wipe all your existing transactions, calendar events, and linked accounts from Finsure. Only proceed if you are starting fresh.
                </div>
              )}
            </div>

            <SelectField 
              label="Monthly Income Range" 
              value={form.monthly_income_range} 
              onChange={e => setForm(f => ({ ...f, monthly_income_range: e.target.value }))}
              options={form.currency ? INCOME_RANGES[form.currency] : []}
              warning="We use this to establish your baseline health score."
            />

            <SelectField 
              label="Pay Cycle" 
              value={form.pay_cycle} 
              onChange={e => setForm(f => ({ ...f, pay_cycle: e.target.value }))}
              options={['Monthly', 'Weekly', 'Irregular']}
            />
            
            <div style={{ gridColumn: '1 / -1' }}>
              <SelectField 
                label="Primary Financial Goal" 
                value={form.basic_goal} 
                onChange={e => setForm(f => ({ ...f, basic_goal: e.target.value }))}
                options={['Save money', 'Control spending', 'Get out of debt', 'Just track']}
              />
            </div>
            
          </div>
        </SettingCard>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', marginBottom: '2rem' }}>
          <Button 
            type="submit" 
            size="lg" 
            loading={isSaving}
            style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>

      {/* ── Danger Zone ── */}
      <div style={{
        background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
        borderRadius: 16, overflow: 'hidden'
      }}>
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(239,68,68,0.1)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          color: 'var(--danger)'
        }}>
          <div style={{ fontSize: '1.25rem' }}>💣</div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Danger Zone</h2>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Deactivating your account will immediately suspend access, stop all AI tracking, and queue your entire financial profile for permanent deletion according to our 30-day retention policy.
          </p>
          <Button variant="danger" onClick={handleDeactivate}>
            Deactivate Account
          </Button>
        </div>
      </div>

    </div>
  );
}