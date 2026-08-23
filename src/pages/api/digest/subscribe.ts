// ABOUTME: POST /api/digest/subscribe — writes news_digest_subscribers with the secret key.
// ABOUTME: Public and unauthenticated, so the body is parsed with zod before it reaches a write.

import type { APIRoute } from 'astro';
import { isDatabaseConfigured } from '../../../lib/feed-repo';
import { subscribe, subscribeSchema } from '../../../lib/digest/subscribers';
import { json } from '../_shared';

export const prerender = false;

/**
 * The browser cannot write this table directly: RLS is on and there is no
 * policy at all, deliberately, because it holds students' email addresses.
 * This route is the only way in, and it is the trust boundary — everything it
 * receives is attacker-controlled.
 *
 * ponytail: no rate limiter. The worst an abuser gets is junk rows in a table
 * nobody can read, and nothing is emailed on subscribe, so there is no
 * amplification. Add one (Vercel firewall rule, or a per-IP counter) if the
 * table ever starts collecting garbage.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!isDatabaseConfigured()) {
    // Plain English, no environment variable names — a delegate reads this
    // (AGENTS.md, The read path). The operator detail goes to the console.
    console.error('[api/digest/subscribe] Supabase is not configured.');
    return json(
      { error: 'Unavailable', message: 'Digest signup is not available yet. Please try again later.' },
      503,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Bad request', message: 'Expected a JSON body.' }, 400);
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    // The first issue only. A form with two fields does not need a list, and
    // echoing zod's full tree back to a browser leaks the schema shape.
    const first = parsed.error.issues[0];
    return json(
      { error: 'Bad request', message: first?.message ?? 'That subscription is not valid.' },
      400,
    );
  }

  try {
    await subscribe(parsed.data);
  } catch (err) {
    console.error('[api/digest/subscribe]', err);
    return json(
      { error: 'Unavailable', message: 'We could not save that subscription. Please try again.' },
      502,
    );
  }

  // 201 whether the row was new or updated. Distinguishing them would tell an
  // anonymous caller whether a given address is already subscribed.
  return json({ ok: true, disciplines: parsed.data.disciplines.length }, 201);
};
