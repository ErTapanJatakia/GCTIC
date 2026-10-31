export type StatusTone = 'online' | 'degraded' | 'offline' | 'idle';

interface StatusDotProps {
  readonly tone: StatusTone;
  /** Accessible description; omit only when adjacent text conveys the state. */
  readonly label?: string;
}

/**
 * State indicator. Tone is paired with a text label elsewhere in the interface
 * so status is never communicated by colour alone.
 */
export function StatusDot({ tone, label }: StatusDotProps) {
  return (
    <span className="status-dot" data-tone={tone}>
      <span className="status-dot__glyph" aria-hidden="true" />
      {label ? <span className="status-dot__label">{label}</span> : null}
      {label ? null : <span className="u-visually-hidden">{tone}</span>}
    </span>
  );
}
