import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

export type BadgeVariant = 'neutral' | 'success' | 'info' | 'warning' | 'danger';

interface BadgeProps {
  readonly children: ReactNode;
  readonly variant?: BadgeVariant;
  readonly title?: string;
  readonly className?: string;
}

/**
 * Compact status label. Text is rendered as a React text node, never as HTML.
 */
export function Badge({ children, variant = 'neutral', title, className }: BadgeProps) {
  return (
    <span className={cx('badge', className)} data-variant={variant} title={title}>
      {children}
    </span>
  );
}
