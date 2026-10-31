import type { ReactNode, SVGProps } from 'react';

import type { IconKey } from '@/types/navigation';

/**
 * Inline icon set. Icons are drawn with `currentColor` at 16px so they inherit
 * text colour and never require a network request or icon dependency.
 */

const MODULE_ICONS: Readonly<Record<IconKey, ReactNode>> = {
  overview: (
    <>
      <rect x="2.25" y="2.25" width="4.5" height="4.5" />
      <rect x="9.25" y="2.25" width="4.5" height="4.5" />
      <rect x="2.25" y="9.25" width="4.5" height="4.5" />
      <rect x="9.25" y="9.25" width="4.5" height="4.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="8" cy="8" r="5.75" />
      <path d="M2.25 8h11.5" />
      <path d="M8 2.25c1.9 1.7 1.9 9.8 0 11.5" />
      <path d="M8 2.25c-1.9 1.7-1.9 9.8 0 11.5" />
    </>
  ),
  stream: (
    <>
      <path d="M2.25 4.5h11.5" />
      <path d="M2.25 8h7.5" />
      <path d="M2.25 11.5h9.5" />
      <circle cx="12" cy="8" r="1.1" />
    </>
  ),
  indicator: (
    <>
      <circle cx="8" cy="8" r="4.25" />
      <path d="M8 1v3M8 12v3M1 8h3M12 8h3" />
      <circle cx="8" cy="8" r="1" />
    </>
  ),
  actor: (
    <>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3 13.5c0-2.5 2.2-4 5-4s5 1.5 5 4" />
    </>
  ),
  campaign: (
    <>
      <path d="M3.5 2v12" />
      <path d="M3.5 3h9l-1.8 2.75L12.5 8.5h-9" />
    </>
  ),
  analytics: (
    <>
      <path d="M3 13.5V8M8 13.5V2.5M13 13.5v-4" />
      <path d="M2 13.5h12" />
    </>
  ),
  sources: (
    <>
      <ellipse cx="8" cy="3.75" rx="5" ry="1.9" />
      <path d="M3 3.75v8.5c0 1.05 2.24 1.9 5 1.9s5-.85 5-1.9v-8.5" />
      <path d="M3 8c0 1.05 2.24 1.9 5 1.9s5-.85 5-1.9" />
    </>
  ),
  system: (
    <>
      <path d="M2.25 5.25h11.5M2.25 10.75h11.5" />
      <circle cx="6" cy="5.25" r="1.75" />
      <circle cx="10.5" cy="10.75" r="1.75" />
    </>
  ),
  methodology: (
    <>
      <path d="M4 1.75h5.5L12.5 5v9.25H4z" />
      <path d="M9.25 1.75V5h3.25" />
      <path d="M6 8h4.5M6 10.5h4.5" />
    </>
  ),
};

interface IconProps extends SVGProps<SVGSVGElement> {
  readonly name: IconKey;
}

export function ModuleIcon({ name, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.15}
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {MODULE_ICONS[name]}
    </svg>
  );
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}

/** Application mark: a surveyed globe under a reticle. */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" {...props}>
      <circle cx="16" cy="16" r="9.25" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <path d="M6.75 16h18.5M16 6.75v18.5" stroke="currentColor" strokeWidth="0.75" opacity="0.3" />
      <path
        d="M16 6.75c3 2.6 3 15.9 0 18.5M16 6.75c-3 2.6-3 15.9 0 18.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.75"
        opacity="0.3"
      />
      <circle cx="16" cy="16" r="2.1" fill="currentColor" opacity="0.9" />
      <circle cx="16" cy="16" r="4.4" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.55" />
    </svg>
  );
}
