// src/components/ui/Badge.js
import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  success: 'bg-success/10 text-success border border-success/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
  danger:  'bg-danger/10  text-danger  border border-danger/20',
  info:    'bg-info/10    text-info    border border-info/20',
  neutral: 'bg-hover      text-secondary border border-subtle',
};

export default function Badge({ children, variant = 'neutral', dot = false, className = '' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
      'font-mono text-[11px] font-medium uppercase tracking-wider',
      variants[variant] || variants.neutral,
      className,
    )}>
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      )}
      {children}
    </span>
  );
}