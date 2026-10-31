import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

interface PageHeaderProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description?: string;
  readonly meta?: ReactNode;
  readonly hero?: boolean;
}

/** Page-level heading block. Renders the single `h1` for a route. */
export function PageHeader({ eyebrow, title, description, meta, hero = false }: PageHeaderProps) {
  return (
    <header className={cx('page-header', hero && 'page-header--hero')}>
      <span className="u-label page-header__eyebrow">{eyebrow}</span>
      <h1 className="page-header__title">{title}</h1>
      {description ? <p className="page-header__description">{description}</p> : null}
      {meta ? <div className="page-header__meta">{meta}</div> : null}
    </header>
  );
}
