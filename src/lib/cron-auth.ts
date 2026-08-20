// ABOUTME: Bearer-token guard for the cron routes, which Vercel exposes publicly on the internet.
// ABOUTME: Compares in constant time and fails closed when CRON_SECRET is unset.

import { CRON_SECRET } from 'astro:env/server';

/**
 * Vercel cron endpoints are ordinary public URLs — Vercel calls them over the
 * internet with `Authorization: Bearer $CRON_SECRET`, and so can anyone else
 * who guesses the path (brief §11).
 *
 * What an unguarded /api/cron/ingest would let a stranger do: burn the entire
 * NewsData daily quota in a few seconds by looping the endpoint, which empties
 * the feed for the rest of the day. On /api/cron/digest it would send real
 * email to real subscribers.
 */
export function isAuthorizedCron(request: Request): boolean {
  // Fail CLOSED. If the secret is not configured, nothing is authorized —
  // the alternative, treating "no secret" as "no check", turns a deployment
  // mistake into an open endpoint.
  if (!CRON_SECRET) return false;

  const header = request.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;

  return timingSafeEqual(header.slice(prefix.length), CRON_SECRET);
}

/**
 * Constant-time comparison. A plain `===` on secrets leaks their prefix through
 * timing: it returns on the first differing byte, so an attacker can recover
 * the token one character at a time. The length check below is not a leak worth
 * worrying about — the length of CRON_SECRET is not the secret.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 401 with no detail. An error that says "wrong secret" versus "no secret"
 *  tells an attacker which half of the problem they have solved. */
export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });
}
