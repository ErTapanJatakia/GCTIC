interface LoadingStateProps {
  readonly label?: string;
  readonly rows?: number;
}

/**
 * Loading placeholder with a polite live region. Widths are set in CSS so no
 * inline styles are required.
 */
export function LoadingState({ label = 'Loading', rows = 3 }: LoadingStateProps) {
  const safeRows = Math.min(6, Math.max(1, Math.trunc(rows)));

  return (
    <div className="state state--loading" role="status" aria-live="polite">
      <span className="u-visually-hidden">{label}</span>
      <div className="skeleton" aria-hidden="true">
        {Array.from({ length: safeRows }, (_, index) => (
          <span key={index} className="skeleton__bar" />
        ))}
      </div>
      <p className="state__caption" aria-hidden="true">
        {label}
      </p>
    </div>
  );
}
