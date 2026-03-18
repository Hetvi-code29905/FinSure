// src/components/ui/Input.js
import React from 'react';
import { cn } from '../../lib/utils';

export default function Input({
  label,
  error,
  icon: Icon,
  className = '',
  id,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium font-mono text-secondary uppercase tracking-widest"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted flex items-center pointer-events-none">
            <Icon size={14} />
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full rounded-md border bg-surface text-primary text-sm',
            'px-3 py-2 outline-none transition-all duration-150',
            'placeholder:text-muted',
            'border-border focus:border-accent focus:ring-2 focus:ring-accent/20',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            Icon && 'pl-9',
            className,
          )}
          {...props}
        />
      </div>
      {error && (
        <span className="text-xs text-danger mt-0.5">{error}</span>
      )}
    </div>
  );
}