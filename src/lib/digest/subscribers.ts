// ABOUTME: Read/write path for news_digest_subscribers — the only table with no RLS policy at all.
// ABOUTME: Server-only: every function here runs on the secret key, so it must never reach a component.

import { z } from 'zod';
import { supabaseAdmin } from '../supabase/admin';
import { DISCIPLINE_IDS } from '../disciplines';
import type { DisciplineId } from '../types';

/**
 * news_digest_subscribers has RLS on and NO policy of any kind, so anon and
 * authenticated both see zero rows (schema comment, brief §10). That is
 * deliberate — it is a list of students' email addresses. The consequence is
 * that subscribe and unsubscribe cannot go direct from the browser; they go
 * through the API routes in src/pages/api/digest/, which hold the secret key.
 */

/* zod, not a hand-rolled check, because this parses an untrusted request body:
   `disciplines` could arrive as a string, a nested array, or 10,000 entries,
   and each of those reaches a database write. The discipline list is pinned to
   the canonical 11 rather than to `string`. */
const disciplineEnum = z.enum(DISCIPLINE_IDS as [DisciplineId, ...DisciplineId[]]);

export const subscribeSchema = z.object({
  /* Lowercased before validating: addresses are case-insensitive in practice,
     and `email` is the primary key — Ana@x.ca and ana@x.ca must not become two
     rows that both receive the same digest. */
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email())
    .refine((e) => e.length <= 254, { message: 'That email address is too long.' }),

  /* At least one, or the subscription is a no-op that still stores an address.
     Capped at the canonical list, and deduped, so a repeated id cannot inflate
     the row. */
  disciplines: z
    .array(disciplineEnum)
    .min(1, { message: 'Pick at least one discipline.' })
    .max(DISCIPLINE_IDS.length)
    .transform((ids) => Array.from(new Set(ids))),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;

export interface Subscriber {
  email: string;
  disciplines: DisciplineId[];
  unsubscribeToken: string;
}

/**
 * Upsert on the email primary key: re-subscribing with a different set of
 * disciplines updates the row rather than erroring, which is what "Manage
 * subscription" in the UI does. `unsubscribe_token` is NOT written here, so
 * the database default generates it once and re-subscribing never invalidates
 * a link already sitting in someone's inbox.
 */
export async function subscribe(input: SubscribeInput): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('news_digest_subscribers')
    .upsert(
      { email: input.email, disciplines: input.disciplines },
      { onConflict: 'email' },
    );

  if (error) throw new Error(`news_digest_subscribers write failed: ${error.message}`);
}

/**
 * Unsubscribe resolves by token, never by email (schema comment). An
 * email-keyed unsubscribe URL lets anyone unsubscribe anyone else by guessing
 * an address; a uuid token cannot be guessed.
 *
 * Returns false for an unknown token so the route can say "already
 * unsubscribed" rather than 500. Both outcomes are a success for the reader.
 */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from('news_digest_subscribers')
    .delete()
    .eq('unsubscribe_token', token)
    .select('email');

  if (error) throw new Error(`news_digest_subscribers delete failed: ${error.message}`);
  return (data ?? []).length > 0;
}

/** A uuid, checked before it reaches the query. Postgres errors on a malformed
 *  uuid comparison, so an unvalidated token turns a typo'd link into a 500. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Every subscriber, for the weekly cron. Small list by design — this is one
 *  student club, not a mailing platform, so it is read in one go. */
export async function listSubscribers(): Promise<Subscriber[]> {
  const { data, error } = await supabaseAdmin()
    .from('news_digest_subscribers')
    .select('email, disciplines, unsubscribe_token');

  if (error) throw new Error(`news_digest_subscribers read failed: ${error.message}`);

  return (data ?? []).map((r) => ({
    email: r.email as string,
    // Rows predate nothing, but a hand-edited row could carry a retired id.
    // Filtering here keeps a bad row out of the digest instead of out of the run.
    disciplines: ((r.disciplines as string[]) ?? []).filter((d): d is DisciplineId =>
      (DISCIPLINE_IDS as string[]).includes(d),
    ),
    unsubscribeToken: r.unsubscribe_token as string,
  }));
}
