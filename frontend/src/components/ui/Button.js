// src/components/ui/Button.js
import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  primary:   'bg-accent text-white border-accent hover:bg-accent-bright hover:border-accent-bright',
  secondary: 'bg-transparent text-primary border-border hover:bg-hover hover:border-strong',
  ghost:     'bg-transparent text-secondary border-transparent hover:bg-hover hover:text-primary',
  danger:    'bg-transparent text-danger border-danger/30 hover:bg-danger-dim',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  children,
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  fullWidth = false,
  disabled  = false,
  className = '',
  onClick,
  type     = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border',
        'font-body font-medium transition-all duration-150 whitespace-nowrap',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        variants[variant] || variants.primary,
        sizes[size]       || sizes.md,
        fullWidth && 'w-full',
        loading   && 'relative text-transparent',
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          className="absolute w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
          style={{ animation: 'spin 0.6s linear infinite' }}
        />
      )}
      {children}
    </button>
  );
}