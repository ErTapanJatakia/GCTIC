interface ErrorStateProps {
  readonly title?: string;
  readonly description: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
}

/**
 * Recoverable failure state, announced assertively. The message must describe
 * the failure without leaking internal details or secrets.
 */
export function ErrorState({
  title = 'Unable to load data',
  description,
  onRetry,
  retryLabel = 'Retry request',
}: ErrorStateProps) {
  return (
    <div className="state state--error" role="alert">
      <span className="state__glyph" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
          <path d="M12 3.5 21 20H3z" strokeLinejoin="round" />
          <path d="M12 9.5v4.5" strokeLinecap="square" />
          <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <div className="state__content">
        <p className="state__title">{title}</p>
        <p className="state__description">{description}</p>
      </div>
      {onRetry ? (
        <div className="state__action">
          <button type="button" className="btn btn--sm" onClick={onRetry}>
            {retryLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
