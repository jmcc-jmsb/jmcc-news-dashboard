// ABOUTME: Search-term highlighting — wraps the first case-insensitive match in <mark>.
// ABOUTME: Split from format.ts because it returns JSX, which keeps format.ts runnable under node --test.

import type { ReactNode } from 'react';

/** Highlights the first occurrence of `q` in `text`. Returns `text` unchanged
 *  when there is no query or no match. `mark` is forced to black text in both
 *  themes by dashboard.css — gold-on-cream would fail AA at 1.56:1. */
export function highlight(text: string | undefined, q: string): ReactNode {
  if (!q || !text) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}
