// src/components/ui/Card.js
import React from 'react';
import { cn } from '../../lib/utils';

export default function Card({
  children,
  title,
  subtitle,
  actions,
  footer,
  className = '',
  noPadding = false,
  animateIn = false,
  style     = {},
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-subtle bg-card transition-colors hover:border-border',
        animateIn && 'animate-in',
        className,
      )}
      style={style}
    >
      {(title || actions) && (
        <div className={cn(
          'flex items-start justify-between gap-3',
          noPadding ? 'px-5 pt-5 pb-0' : 'px-5 pt-5 pb-0',
          'mb-4',
        )}>
          <div>
            {title && (
              <h4 className="text-sm font-semibold text-primary m-0">{title}</h4>
            )}
            {subtitle && (
              <p className="text-xs text-muted mt-0.5 m-0">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      )}

      <div className={cn(!noPadding && 'px-5 pb-5', title || actions ? '' : 'pt-5')}>
        {children}
      </div>

      {footer && (
        <div className="border-t border-subtle px-5 py-3">
          {footer}
        </div>
      )}
    </div>
  );
}