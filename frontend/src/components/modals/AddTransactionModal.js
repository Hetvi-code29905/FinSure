// src/components/modals/AddTransactionModal.js
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

const CATEGORIES = [
  'Food & Dining','Shopping','Travel','Entertainment',
  'Services','Healthcare','Income','Transfers',
  'Utilities','Education','Fees & Charges','Uncategorized',
];

export default function AddTransactionModal({ isOpen, onClose, onAdd, accounts }) {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Uncategorized',
    type: 'expense',
    account_id: accounts?.length > 0 ? accounts[0].id : ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!formData.name) throw new Error('Transaction description required');
      if (isNaN(formData.amount)) throw new Error('Amount must be a number');
      
      const amt = parseFloat(formData.amount);
      const finalAmount = formData.type === 'expense' ? Math.abs(amt) : -Math.abs(amt);

      if (!formData.account_id) throw new Error('Please select an account.');

      const currentTime = new Date().toISOString().split('T')[1];
      const fullDate = `${formData.date}T${currentTime}`;

      await onAdd({
        name: formData.name,
        amount: finalAmount,
        date: fullDate,
        category: formData.category,
        type: formData.type,
        account_id: formData.account_id,
        source: 'manual',
        currency_code: 'INR'
      });
      
      setFormData({
        name: '', amount: '',
        date: new Date().toISOString().split('T')[0],
        category: 'Uncategorized', type: 'expense', account_id: ''
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Manual Transaction">
      {(!accounts || accounts.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏦</div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>No Accounts Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            To track your transactions, you must first create a Wallet, Bank, or Cash account.
          </p>
          <Button onClick={onClose}>Close</Button>
        </div>
      ) : (
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>}
        
        {/* Type Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-surface)', padding: '0.3rem', borderRadius: 'var(--radius-md)' }}>
          <button type="button" onClick={() => setFormData(p => ({...p, type: 'expense'}))}
            style={{ flex: 1, padding: '0.5rem', background: formData.type === 'expense' ? 'var(--bg-elevated)' : 'transparent', border: 'none', borderRadius: 'var(--radius-sm)', color: formData.type === 'expense' ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}>
            Expense
          </button>
          <button type="button" onClick={() => setFormData(p => ({...p, type: 'income'}))}
            style={{ flex: 1, padding: '0.5rem', background: formData.type === 'income' ? 'var(--bg-elevated)' : 'transparent', border: 'none', borderRadius: 'var(--radius-sm)', color: formData.type === 'income' ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}>
            Income
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Description</label>
            <Input name="name" placeholder="e.g. Swiggy, Netflix, Salary" value={formData.name} onChange={handleChange} required />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Amount</label>
            <Input name="amount" type="number" placeholder="0.00" value={formData.amount} onChange={handleChange} required />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Date</label>
            <Input name="date" type="date" value={formData.date} onChange={handleChange} required />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Category</label>
            <select name="category" value={formData.category} onChange={handleChange} style={{ width: '100%', padding: '0.575rem 0.75rem', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)'}}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
           <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Paid from / Deposited to *</label>
           <select name="account_id" value={formData.account_id} onChange={handleChange} required style={{ width: '100%', padding: '0.575rem 0.75rem', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)'}}>
              <option value="" disabled>-- Select an account --</option>
              {accounts?.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save Transaction</Button>
        </div>
      </form>
      )}
    </Modal>
  );
}
