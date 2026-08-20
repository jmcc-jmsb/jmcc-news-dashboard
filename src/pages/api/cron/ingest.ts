// ABOUTME: The daily ingest cron endpoint, guarded by a CRON_SECRET bearer token.
// ABOUTME: Server-rendered — this route must never be prerendered, or the cron would hit static HTML.

import type { APIRoute } from 'astro';
import { isAuthorizedCron, unauthorized } from '../../../lib/cron-auth';
import { runIngest } from '../../../lib/ingest/run';

// astro.config.mjs sets output: 'server', but index.astro opts into
// prerendering. Being explicit here so a future `prerender = true` added
// project-wide cannot silently turn the cron into a static file.
export const prerender = false;

/**
 * Called once a day by Vercel Cron (`0 11 * * *` — 07:00 EDT / 06:00 EST).
 * The Hobby plan permits exactly one run per day; see docs/CRON_OPTIONS.md
 * before adding a second.
 *
 * GET, because that is what Vercel Cron issues. The endpoint is not idempotent
 * in the strict HTTP sense — it writes — but it IS safe to re-run: every write
 * is an upsert keyed on h(url), so calling it twice produces the same rows.
 */
export const GET: APIRoute = async ({ request }) => {
  if (!isAuthorizedCron(request)) return unauthorized();

  try {
    const report = await runIngest();

    // The report is the log. Vercel captures stdout per invocation, so this is
    // what someone reads at 8am when the feed looks wrong.
    console.log('[ingest]', JSON.stringify(report));

    // 207 when some sources failed but the run still wrote rows: a green 200
    // would hide a dead feed, and a red 500 would imply nothing was ingested.
    const status = report.sourceErrors.length > 0 && report.upserted > 0 ? 207 : 200;

    return new Response(JSON.stringify(report, null, 2), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ingest] run failed:', message);

    // 500 so the failure is visible in Vercel's cron history rather than
    // recorded as a successful no-op.
    return new Response(JSON.stringify({ error: 'Ingest failed', message }, null, 2), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
