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

/* ── Digest send time ────────────────────────────────────────────────────────
   Vercel cron only speaks UTC, so the digest fires at a fixed 13:00 UTC every
   Monday. What that is in Montreal is not fixed: Eastern is UTC-4 on daylight
   time and UTC-5 the rest of the year, so the same cron lands at 09:00 in
   summer and 08:00 in winter.

   The subscribe panel promises subscribers a specific time, so hardcoding one
   makes it wrong for half the year. These derive it instead — the UI tracks the
   cron automatically, in either direction, forever.

   Note the fix that ISN'T available: the usual way to pin a local hour is to
   schedule the job hourly and no-op until the local time matches. This Vercel
   account is on the Hobby plan, which permits one cron run per day, so that
   trick is off the table here. See docs/CRON_OPTIONS.md. */
const DIGEST_UTC_HOUR = 13; // from "0 13 * * 1"

/** The next instant the digest cron fires, as a real UTC Date. */
export function nextDigestSend(now: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), DIGEST_UTC_HOUR, 0, 0),
  );
  d.setUTCDate(d.getUTCDate() + ((1 - d.getUTCDay() + 7) % 7)); // 1 = Monday
  if (d.getTime() <= now.getTime()) d.setUTCDate(d.getUTCDate() + 7);
  return d;
}

/** e.g. "Monday, 8:00 a.m. EST" — or "9:00 a.m. EDT" once clocks move.
 *  Asking Intl for the zone name means we never encode the offset ourselves. */
export function digestSendLabel(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(nextDigestSend(now));
}

/** "2026 May 22". en-CA throughout — the dashboard is English-only (brief §1). */
export function absDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}
