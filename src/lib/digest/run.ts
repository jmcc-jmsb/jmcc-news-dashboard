// ABOUTME: Orchestrates one weekly digest run — reads subscribers, gathers the week, sends via Resend.
// ABOUTME: Returns a per-run report so the cron response says exactly who was mailed and who was skipped.

import { Resend, type CreateBatchEmailOptions } from 'resend';
import { PUBLIC_SITE_URL } from 'astro:env/client';
import { DIGEST_FROM, RESEND_API_KEY } from 'astro:env/server';
import { labelFor } from '../disciplines';
import { getDigestItems, isDatabaseConfigured } from '../feed-repo';
import type { DisciplineId, FeedItem } from '../types';
import { renderDigest, type DigestSection } from './render';
import { listSubscribers, type Subscriber } from './subscribers';

/** One week back from the run. The cron is weekly, so this is exactly the
 *  window since the last send — no overlap, no gap. */
const WINDOW_DAYS = 7;

/** Per discipline, per subscriber. Small on purpose: the digest is a nudge
 *  back to the dashboard, not a replacement for it (AGENTS.md, Scope
 *  discipline). Eleven disciplines at 4 + 2 is already a long email. */
const MAX_ARTICLES = 4;
const MAX_REPORTS = 2;

/** Resend's batch endpoint caps at 100 messages per call. */
const BATCH_SIZE = 100;

export interface DigestReport {
  startedAt: string;
  finishedAt: string;
  subscribers: number;
  sent: number;
  /** Subscribers whose every chosen discipline was empty this week. Counted,
   *  never mailed — see the comment on renderDigest. */
  skippedEmpty: number;
  disciplinesWithNews: string[];
  errors: { email: string; error: string }[];
}

let cachedResend: Resend | null = null;

function resendClient(): Resend {
  if (cachedResend) return cachedResend;
  if (!RESEND_API_KEY) {
    throw new Error('Resend is not configured: RESEND_API_KEY must be set. See .env.example.');
  }
  cachedResend = new Resend(RESEND_API_KEY);
  return cachedResend;
}

/**
 * The unsubscribe link has to be absolute and has to point at the host the
 * email actually came from, so PUBLIC_SITE_URL is required for a digest run
 * rather than defaulted. A digest that mails a broken unsubscribe link is
 * worse than a digest that does not go out: the first is a CASL problem and
 * the second is a missed Monday.
 */
function unsubscribeUrl(token: string): string {
  if (!PUBLIC_SITE_URL) {
    throw new Error(
      'PUBLIC_SITE_URL must be set before the digest can send — the unsubscribe link is absolute.',
    );
  }
  return new URL(`/api/digest/unsubscribe?token=${encodeURIComponent(token)}`, PUBLIC_SITE_URL).href;
}

/**
 * Gathered once per discipline, not once per subscriber. Eleven disciplines
 * shared across N subscribers is 22 queries whatever N is; the naive version
 * is 22×N, and N is every delegate in the club.
 */
async function gatherWeek(
  disciplines: DisciplineId[],
  since: Date,
): Promise<Map<DisciplineId, FeedItem[]>> {
  const gathered = await Promise.all(
    disciplines.map(async (id) => {
      const [articles, reports] = await Promise.all([
        getDigestItems('news_articles', id, since, MAX_ARTICLES),
        getDigestItems('news_reports', id, since, MAX_REPORTS),
      ]);
      // Reports after articles: the reports are the slower, evergreen half and
      // the headlines are what makes someone open the mail.
      return [id, [...articles, ...reports]] as [DisciplineId, FeedItem[]];
    }),
  );

  return new Map(gathered);
}

/** A subscriber's sections, with empty disciplines dropped. An empty section
 *  renders as a heading with nothing under it, which reads like a bug. */
function sectionsFor(sub: Subscriber, week: Map<DisciplineId, FeedItem[]>): DigestSection[] {
  return sub.disciplines
    .map((id) => ({ disciplineLabel: labelFor(id) || id, items: week.get(id) ?? [] }))
    .filter((s) => s.items.length > 0);
}

/**
 * One run. Unlike ingest, this one refuses to start rather than limping: every
 * failure mode here — no database, no API key, no site URL — means the email
 * would be wrong, and a wrong email cannot be un-sent the way a stale feed can
 * be re-ingested.
 */
export async function runDigest(now: Date = new Date()): Promise<DigestReport> {
  const startedAt = now.toISOString();

  if (!isDatabaseConfigured()) {
    throw new Error('Supabase is not configured; the digest has no subscribers to read.');
  }
  if (!DIGEST_FROM) {
    throw new Error(
      'DIGEST_FROM must be set to a sender on a Resend-verified domain. See .env.example.',
    );
  }

  const subscribers = await listSubscribers();
  const errors: { email: string; error: string }[] = [];

  if (subscribers.length === 0) {
    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      subscribers: 0,
      sent: 0,
      skippedEmpty: 0,
      disciplinesWithNews: [],
      errors,
    };
  }

  const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const wanted = Array.from(new Set(subscribers.flatMap((s) => s.disciplines)));
  const week = await gatherWeek(wanted, since);

  const messages: { email: string; payload: CreateBatchEmailOptions }[] = [];
  let skippedEmpty = 0;

  for (const sub of subscribers) {
    const sections = sectionsFor(sub, week);
    if (sections.length === 0) {
      skippedEmpty++;
      continue;
    }

    const url = unsubscribeUrl(sub.unsubscribeToken);
    const { subject, html, text } = renderDigest(sections, url, now);

    messages.push({
      email: sub.email,
      payload: {
        from: DIGEST_FROM,
        to: sub.email,
        subject,
        html,
        text,
        /* The header unsubscribe is what a mail client's own "unsubscribe"
           button uses, and its absence is a spam signal on its own. One-Click
           is claimed because /api/digest/unsubscribe answers POST as well as
           GET — claiming it without the POST route would be worse than not
           claiming it, because the button would silently fail. */
        headers: {
          'List-Unsubscribe': `<${url}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      },
    });
  }

  let sent = 0;
  const resend = resendClient();

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const chunk = messages.slice(i, i + BATCH_SIZE);
    try {
      // permissive: one malformed address must not cost the other 99 their
      // digest. Strict validation would reject the whole batch.
      const { data, error } = await resend.batch.send(
        chunk.map((m) => m.payload),
        { batchValidation: 'permissive' },
      );

      if (error) {
        for (const m of chunk) errors.push({ email: m.email, error: error.message });
        continue;
      }

      sent += data?.data?.length ?? 0;

      for (const failed of data?.errors ?? []) {
        const target = chunk[failed.index];
        errors.push({ email: target?.email ?? `index ${failed.index}`, error: failed.message });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      for (const m of chunk) errors.push({ email: m.email, error: message });
    }
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    subscribers: subscribers.length,
    sent,
    skippedEmpty,
    disciplinesWithNews: wanted.filter((id) => (week.get(id) ?? []).length > 0),
    errors,
  };
}
