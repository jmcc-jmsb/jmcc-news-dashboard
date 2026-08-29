// ABOUTME: Pure formatting helpers — relative/absolute dates and the h() id hash.
// ABOUTME: Deliberately JSX-free so it runs under `node --test`; highlight() lives in highlight.tsx.

/**
 * The ingest dedupe key: h(url) is an article's primary key in Supabase.
 *
 * ⚠ DO NOT CHANGE THIS FUNCTION. It is byte-for-byte the prototype's
 * implementation, including the `|0` truncation and the base-36 encoding. A
 * different hash means every already-ingested row gets a new id, so the next
 * ingest re-inserts the entire feed as duplicates. format.test.ts pins the
 * output for exactly this reason.
 */
export const h = (s: string): string =>
  'x' + Math.abs([...s].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)).toString(36);

/** "3h ago" / "2w ago", falling back to a short date past ~5 weeks. */
export function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const m = Math.round((now - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const hrs = Math.round(m / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const d = Math.round(hrs / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

/** "2026 May 22". en-CA throughout — the dashboard is English-only (brief §1). */
export function absDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}
