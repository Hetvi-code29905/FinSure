// src/components/modals/AddAccountModal.js
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function AddAccountModal({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'wallet',
    balance: '',
    currency_code: 'INR'
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
      if (!formData.name) throw new Error('Account name is required');
      if (isNaN(formData.balance)) throw new Error('Balance must be a number');
      
      await onAdd({
        name: formData.name,
        type: formData.type,
        balance: parseFloat(formData.balance || 0),
        currency_code: formData.currency_code
      });
      
      setFormData({ name: '', type: 'wallet', balance: '', currency_code: 'INR' });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Manual Account">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>}
        
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Account Name</label>
          <Input 
            name="name" 
            placeholder="e.g. HDFC Bank, Cash Wallet" 
            value={formData.name} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Account Type</label>
            <select 
              name="type" 
              value={formData.type} 
              onChange={handleChange}
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)'
              }}
            >
              <option value="bank">Bank Account</option>
              <option value="wallet">Mobile Wallet</option>
              <option value="credit">Credit Card</option>
              <option value="cash">Cash Storage</option>
            </select>
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Current Balance</label>
            <Input 
              name="balance" 
              type="number" 
              placeholder="0.00" 
              value={formData.balance} 
              onChange={handleChange} 
              required 
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Add Account</Button>
        </div>
      </form>
    </Modal>
  );
}
