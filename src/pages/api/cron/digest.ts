// ABOUTME: The weekly digest cron endpoint, guarded by the same CRON_SECRET bearer token as ingest.
// ABOUTME: Server-rendered — this route must never be prerendered, or the cron would hit static HTML.

import type { APIRoute } from 'astro';
import { isAuthorizedCron, unauthorized } from '../../../lib/cron-auth';
import { runDigest } from '../../../lib/digest/run';

export const prerender = false;

/**
 * Called weekly by Vercel Cron (`0 13 * * 1` — 09:00 EDT / 08:00 EST Monday).
 * Weekly is inside the Hobby plan's one-run-per-day limit, so this schedule is
 * unaffected by the ingest constraint in docs/CRON_OPTIONS.md.
 *
 * Unlike ingest, this route is NOT safe to re-run: every call sends real email
 * to real people. The guard is the only thing standing between a stranger with
 * the URL and mailing the whole delegate list on repeat, so it fails closed.
 */
export const GET: APIRoute = async ({ request }) => {
  if (!isAuthorizedCron(request)) return unauthorized();

  try {
    const report = await runDigest();

    console.log('[digest]', JSON.stringify(report));

    // 207 when some addresses failed but others went out — a green 200 hides a
    // bouncing domain, and a 500 would imply nobody was mailed.
    const status = report.errors.length > 0 && report.sent > 0 ? 207 : 200;

    return new Response(JSON.stringify(report, null, 2), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[digest] run failed:', message);

    return new Response(JSON.stringify({ error: 'Digest failed', message }, null, 2), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
