import type { ReactNode } from 'react';

interface EmptyStateProps {
  readonly title: string;
  readonly description: string;
  readonly hint?: string;
  readonly action?: ReactNode;
}

/** Neutral zero-data state. Never implies an error or a successful collection. */
export function EmptyState({ title, description, hint, action }: EmptyStateProps) {
  return (
    <div className="state state--empty">
      <span className="state__glyph" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="1" strokeDasharray="3 3" />
          <path d="M9 12h6" strokeLinecap="square" />
        </svg>
      </span>
      <div className="state__content">
        <p className="state__title">{title}</p>
        <p className="state__description">{description}</p>
        {hint ? <p className="state__hint">{hint}</p> : null}
      </div>
      {action ? <div className="state__action">{action}</div> : null}
    </div>
  );
}
