// ABOUTME: Shared request parsing and responses for the read APIs.
// ABOUTME: Underscore-prefixed so Astro treats it as a helper, not a route.

import { isDisciplineId } from '../../lib/disciplines';
import { isDatabaseConfigured, shouldServeSample } from '../../lib/feed-repo';

export const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 24;

export interface FeedQuery {
  discipline: string;
  limit: number;
  aiOnly: boolean;
}

/** Validates rather than trusts. `discipline` reaches a database filter, and
 *  `limit` reaches a row cap — both are attacker-controlled strings. */
export function parseFeedQuery(url: URL): FeedQuery | { error: string } {
  const discipline = url.searchParams.get('discipline') ?? 'finance';
  if (!isDisciplineId(discipline)) {
    return { error: `Unknown discipline "${discipline}".` };
  }

  const rawLimit = url.searchParams.get('limit');
  let limit = DEFAULT_LIMIT;
  if (rawLimit !== null) {
    const n = Number(rawLimit);
    if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
      return { error: `limit must be an integer between 1 and ${MAX_LIMIT}.` };
    }
    limit = n;
  }

  return { discipline, limit, aiOnly: url.searchParams.get('ai') === '1' };
}

export function json(body: unknown, status = 200, cacheSeconds = 0): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // Ingest runs once a day, so a short shared cache costs nothing in
      // freshness and absorbs a burst of delegates opening the page at once.
      // stale-while-revalidate keeps it responsive across the refresh.
      'cache-control': cacheSeconds
        ? `public, max-age=0, s-maxage=${cacheSeconds}, stale-while-revalidate=600`
        : 'no-store',
    },
  });
}

export function badRequest(message: string): Response {
  return json({ error: 'Bad request', message }, 400);
}

/**
 * 503, not 500 and not an empty 200. The database genuinely is not configured
 * yet, and an empty 200 would be indistinguishable from "no articles today" —
 * which is exactly the confusion that makes an outage invisible.
 */
export function notConfigured(): Response {
  return json(
    {
      error: 'Not configured',
      message:
        'No Supabase project is configured, and sample data is off. Set PUBLIC_SUPABASE_URL and ' +
        'SUPABASE_SECRET_KEY, or set PUBLIC_USE_FIXTURES=true to serve the sample feed.',
    },
    503,
  );
}

/** True when the request can be served at all. */
export function canServe(): boolean {
  return isDatabaseConfigured() || shouldServeSample();
}
