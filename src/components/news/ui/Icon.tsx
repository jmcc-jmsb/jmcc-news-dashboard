// ABOUTME: Inline SVG icon set — minimal hand-drawn line style, currentColor throughout.
// ABOUTME: All aria-hidden; every button that uses one carries its own aria-label.

import type { ReactElement } from 'react';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export const Icon = {
  bookmark: (filled: boolean): ReactElement => (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} fill={filled ? 'currentColor' : 'none'} strokeWidth="1.6" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
  external: (
    <svg width="13" height="13" viewBox="0 0 24 24" {...stroke} strokeWidth="1.8" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  sun: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
  moon: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} strokeWidth="1.6" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  search: (
    <svg width="15" height="15" viewBox="0 0 24 24" {...stroke} strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  refresh: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke} strokeWidth="1.8" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  check: (
    <svg width="13" height="13" viewBox="0 0 24 24" {...stroke} strokeWidth="2.4" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  arrow: (
    <svg width="11" height="11" viewBox="0 0 24 24" {...stroke} strokeWidth="2" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  plus: (
    <svg width="13" height="13" viewBox="0 0 24 24" {...stroke} strokeWidth="2" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  close: (
    <svg width="13" height="13" viewBox="0 0 24 24" {...stroke} strokeWidth="2" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};
