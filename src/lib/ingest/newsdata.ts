// ABOUTME: NewsData.io client — one query per discipline and per active sponsor, English only.
// ABOUTME: Tracks credit spend per run and refuses to continue past the daily ceiling.

import { NEWSDATA_API_KEY } from 'astro:env/server';
import type { RawItem } from './normalize';

const ENDPOINT = 'https://newsdata.io/api/1/latest';

/**
 * Free tier: 200 credits/day, 10 articles per credit.
 *
 * Brief §10 budgeted ~88–103 credits against four runs a day. **We run once a
 * day** (Vercel Hobby permits one cron run daily — see docs/CRON_OPTIONS.md),
 * so a single run's spend is roughly a quarter of that: ~22 credits for the 11
 * JDC/JDCC disciplines plus ~1 per active sponsor.
 *
 * **The registry is now 33** (SMNG, FO and HM added 22), and run.ts issues one
 * query per discipline — 33 credits a run, well inside 150 and 200/day. The
 * daily quota is not the limit that binds, though: RATE_LIMIT_CREDITS below
 * is, and runIngest now caps a run at it rather than at this ceiling.
 *
 * The ceiling is enforced anyway. Quota exhaustion is silent — NewsData simply
 * stops returning articles — and a feed that empties during competition week
 * without an error is the failure mode this exists to prevent.
 */
export const DAILY_CREDIT_CEILING = 150;

/**
 * The limit that actually binds: the free tier also allows only **30 credits per
 * 15 minutes**, and answers 429 past it. A run takes seconds, so it gets one
 * window. 33 disciplines do not fit in 30, which the second live run on
 * 2026-09-18 found out; runIngest rotates which disciplines sit out each day.
 */
export const RATE_LIMIT_CREDITS = 30;

/** Our own ceiling was reached. No credit was spent on the refused query. */
export class CreditCeilingError extends Error {
  override name = 'CreditCeilingError';
}

/** NewsData answered 429: either the 15-minute rate limit or the daily quota is
 *  gone, whatever our ledger says, and the response does not say which. The
 *  ledger only counts one run, so a manual re-run within 15 minutes, or late
 *  on a busy day, can get here. */
export class NewsDataQuotaError extends Error {
  override name = 'NewsDataQuotaError';
}

export class CreditLedger {
  private spent = 0;
  constructor(private readonly ceiling = DAILY_CREDIT_CEILING) {}

  get used(): number {
    return this.spent;
  }

  /** Throws rather than overspending. runIngest catches this and stops querying
   *  NewsData, but keeps the rest of the run and reports the skip loudly. */
  charge(credits = 1): void {
    if (this.spent + credits > this.ceiling) {
      throw new CreditCeilingError(
        `NewsData credit ceiling reached: ${this.spent}/${this.ceiling} used, ` +
          `refusing to spend ${credits} more. NewsData queries stopped to protect the daily quota.`,
      );
    }
    this.spent += credits;
  }
}

/**
 * NewsData's free tier rejects a `q` longer than 100 characters with a 422.
 * Five disciplines failed on the first live run (2026-09-18) because their
 * keywords, joined, came to 102–108.
 */
export const MAX_QUERY_LENGTH = 100;

/** Joins keywords with OR, in order, skipping any that would push the query
 *  past MAX_QUERY_LENGTH. Keywords come from a table coaches can edit, so the
 *  length is enforced here rather than trusted. */
export function buildQuery(terms: string[]): string {
  let query = '';
  for (const term of terms) {
    const next = query ? `${query} OR ${term}` : term;
    if (next.length <= MAX_QUERY_LENGTH) query = next;
  }
  return query;
}

interface NewsDataArticle {
  title?: string;
  description?: string;
  link?: string;
  source_id?: string;
  source_name?: string;
  pubDate?: string;
}

export interface NewsDataOptions {
  /** ISO 3166-1 alpha-2, one country. Narrows the query to that country's
   *  press: 'ca' for the regional sections, the host country for each
   *  international competition. Costs no extra credit — it filters the same
   *  single request. */
  country?: string;
  signal?: AbortSignal;
}

/** One query. `language=en` is non-negotiable (brief §1, §10). */
export async function fetchNewsData(
  query: string,
  ledger: CreditLedger,
  { country, signal }: NewsDataOptions = {},
): Promise<RawItem[]> {
  if (!NEWSDATA_API_KEY) throw new Error('NEWSDATA_API_KEY is not set');
  // An empty q returns untargeted news, which runIngest would tag with the
  // discipline it asked for. Refuse before spending a credit.
  if (!query) throw new Error(`NewsData query is empty: no keyword fits in ${MAX_QUERY_LENGTH} characters`);

  ledger.charge(1);

  const url = new URL(ENDPOINT);
  url.searchParams.set('apikey', NEWSDATA_API_KEY);
  url.searchParams.set('q', query);
  url.searchParams.set('language', 'en');
  if (country) url.searchParams.set('country', country);

  const res = await fetch(url, { signal });
  if (res.status === 429) {
    throw new NewsDataQuotaError(`NewsData 429 for query "${query}": rate limit or daily quota reached`);
  }
  if (!res.ok) {
    // Anything other than a 429 is worth surfacing verbatim.
    throw new Error(`NewsData ${res.status} for query "${query}"`);
  }

  const body = (await res.json()) as { results?: NewsDataArticle[] };
  return (body.results ?? [])
    .filter((a): a is NewsDataArticle & { title: string; link: string } =>
      Boolean(a.title && a.link),
    )
    .map((a) => ({
      title: a.title,
      description: a.description ?? '',
      url: a.link,
      source: a.source_name || a.source_id || 'Unknown',
      publishedAt: a.pubDate ?? new Date().toISOString(),
    }));
}
