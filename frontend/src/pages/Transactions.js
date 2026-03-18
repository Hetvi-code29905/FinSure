// src/pages/Transactions.js
import React, { useEffect, useRef, useState } from 'react';
import useTransactions from '../hooks/useTransactions';
import useAccounts     from '../hooks/useAccounts';
import Card   from '../components/ui/Card';
import Badge  from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input  from '../components/ui/Input';
import { formatCurrency, formatDate, categoryColor } from '../lib/utils';

const CATEGORIES = [
  'Food & Dining','Shopping','Travel','Entertainment',
  'Services','Healthcare','Income','Transfers',
  'Utilities','Education','Fees & Charges','Uncategorized',
];

export default function Transactions() {
  const { transactions, pagination, loading, error, fetchTransactions, uploadCsv } = useTransactions();
  const { accounts, fetchAccounts } = useAccounts();
  const [filters, setFilters] = useState({
    search: '', category: '', account_id: '', anomalies_only: false,
    date_from: '', date_to: '', page: 1,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    fetchAccounts();
    fetchTransactions(filters);
  }, [filters]); // eslint-disable-line

  const setFilter = (key, value) =>
    setFilters(f => ({ ...f, [key]: value, page: 1 }));

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setUploadMsg(null);
    try {
      const result = await uploadCsv(file);
      setUploadMsg({ ok: true, text: `✓ Imported ${result.rows_imported} of ${result.rows_processed} rows` });
      fetchTransactions(filters);
    } catch (err) {
      setUploadMsg({ ok: false, text: `Upload failed: ${err.message}` });
    } finally {
      setUploading(false);
      fileRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Filters ── */}
      <Card className="animate-in">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <Input
              placeholder="Search transactions…"
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
            />
          </div>

          <div style={{ flex: '0 1 160px' }}>
            <select
              value={filters.category}
              onChange={e => setFilter('category', e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.875rem',
                outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ flex: '0 1 160px' }}>
            <select
              value={filters.account_id}
              onChange={e => setFilter('account_id', e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.875rem',
                outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="">All accounts</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div style={{ flex: '0 1 135px' }}>
            <Input type="date" value={filters.date_from}
              onChange={e => setFilter('date_from', e.target.value)} />
          </div>
          <span style={{ color: 'var(--text-muted)', paddingBottom: 2 }}>→</span>
          <div style={{ flex: '0 1 135px' }}>
            <Input type="date" value={filters.date_to}
              onChange={e => setFilter('date_to', e.target.value)} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', paddingBottom: 2 }}>
            <input type="checkbox" checked={filters.anomalies_only}
              onChange={e => setFilter('anomalies_only', e.target.checked)}
              style={{ accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              Anomalies only
            </span>
          </label>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {uploading && (
              <span style={{ width: 16, height: 16, border: '2px solid rgba(59,130,246,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
            )}
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              Import CSV
            </Button>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleUpload} />
          </div>
        </div>

        {uploadMsg && (
          <div style={{
            marginTop: '0.75rem', padding: '0.55rem 0.9rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem',
            background: uploadMsg.ok ? 'var(--success-dim)' : 'var(--danger-dim)',
            color:      uploadMsg.ok ? 'var(--success)'     : 'var(--danger)',
            border:     `1px solid ${uploadMsg.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            {uploadMsg.text}
          </div>
        )}
      </Card>

      {/* ── Table ── */}
      <Card noPadding className="animate-in-delay-1">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <span style={{ width: 28, height: 28, border: '2.5px solid rgba(59,130,246,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No transactions found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  {['Date/Time','Description','Account','Category','Amount'].map(h => (
                    <th key={h} style={{
                      padding: '0.75rem 1rem', textAlign: h === 'Amount' ? 'right' : 'left',
                      fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 500,
                      color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase',
                      borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn, i) => (
                  <tr key={txn.id} style={{
                    borderBottom: i < transactions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    transition: 'background var(--transition)',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(txn.date)}
                      <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>
                        {new Date(txn.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{txn.name}</div>
                      {txn.is_anomaly && <span style={{ marginLeft: 6 }}><Badge variant="danger" dot>Anomaly</Badge></span>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                       <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                         {accounts.find(a => a.id === txn.account_id)?.name || 'Manual'}
                       </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: categoryColor(txn.category), flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{txn.category || '—'}</span>
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: txn.amount < 0 ? 'var(--success)' : 'var(--text-primary)' }}>
                      {txn.amount < 0 ? '+' : ''}{formatCurrency(Math.abs(txn.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {pagination.total} transactions · page {filters.page} of {pagination.total_pages}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <Button variant="secondary" size="sm"
                disabled={filters.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>
                ← Prev
              </Button>
              <Button variant="secondary" size="sm"
                disabled={filters.page >= pagination.total_pages}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>
                Next →
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}