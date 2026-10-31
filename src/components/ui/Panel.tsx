import { useId } from 'react';
import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

interface PanelProps {
  readonly children: ReactNode;
  /** Micro label above the title, e.g. `MODULE STATUS`. */
  readonly label?: string;
  readonly title?: ReactNode;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly tone?: 'default' | 'accent' | 'warning';
  readonly className?: string;
}

/**
 * Bordered instrument panel: the primary content container of the command
 * interface. Titles are wired to the panel via `aria-labelledby`.
 */
export function Panel({
  children,
  label,
  title,
  description,
  actions,
  tone = 'default',
  className,
}: PanelProps) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const hasHeader = Boolean(label ?? title ?? description ?? actions);

  return (
    <section className={cx('panel', className)} data-tone={tone} aria-labelledby={title ? titleId : undefined}>
      {hasHeader ? (
        <header className="panel__header">
          <div className="panel__heading">
            {label ? <span className="u-label panel__label">{label}</span> : null}
            {title ? (
              <h2 className="panel__title" id={titleId}>
                {title}
              </h2>
            ) : null}
            {description ? <p className="panel__description">{description}</p> : null}
          </div>
          {actions ? <div className="panel__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="panel__body">{children}</div>
    </section>
  );
}
