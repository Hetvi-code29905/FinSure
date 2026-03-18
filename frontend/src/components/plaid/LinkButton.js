// src/components/plaid/LinkButton.js
import React, { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import usePlaid from '../../hooks/usePlaid';
import Button from '../ui/Button';

/**
 * Plaid Link button.
 * On click: fetches a link token → opens Plaid iframe → exchanges public token.
 * Props:
 *   onSuccess(result) — called after exchange completes
 *   label            — button text (default "Connect Bank")
 *   variant / size   — passed to Button
 */
export default function LinkButton({
  onSuccess,
  label    = 'Connect Bank',
  variant  = 'primary',
  size     = 'md',
  disabled = false,
}) {
  const { getLinkToken, exchangeToken, loading, error } = usePlaid();
  const [token, setToken] = useState(null);

  // Load Plaid Link SDK script
  useEffect(() => {
    if (window.Plaid) return;
    const script    = document.createElement('script');
    script.src      = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async    = true;
    document.head.appendChild(script);
  }, []);

  const onPlaidSuccess = useCallback(async (publicToken, metadata) => {
    const result = await exchangeToken({
      publicToken,
      institutionId:   metadata.institution?.institution_id || '',
      institutionName: metadata.institution?.name || 'Unknown',
      accounts: (metadata.accounts || []).map((a) => ({
        plaid_account_id: a.id,
        name:             a.name,
        mask:             a.mask,
        type:             a.type,
        subtype:          a.subtype,
      })),
    });
    onSuccess?.(result);
  }, [exchangeToken, onSuccess]);

  const { open, ready } = usePlaidLink({
    token: token || '',
    onSuccess: onPlaidSuccess,
    onExit: (err) => {
      if (err) console.warn('Plaid Link exit:', err);
    },
  });

  const handleClick = async () => {
    if (token && ready) {
      open();
      return;
    }
    const lt = await getLinkToken();
    if (lt) {
      setToken(lt);
      // usePlaidLink re-initializes when token changes; open on next render
      setTimeout(() => open(), 300);
    }
  };

  return (
    <div>
      <Button
        variant={variant}
        size={size}
        loading={loading}
        disabled={disabled || loading}
        onClick={handleClick}
      >
        🏦 {label}
      </Button>
      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.4rem' }}>
          {error}
        </p>
      )}
    </div>
  );
}