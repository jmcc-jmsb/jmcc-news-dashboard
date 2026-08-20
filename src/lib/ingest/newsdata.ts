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
 * disciplines plus ~1 per active sponsor.
 *
 * The ceiling is enforced anyway. Quota exhaustion is silent — NewsData simply
 * stops returning articles — and a feed that empties during competition week
 * without an error is the failure mode this exists to prevent.
 */
export const DAILY_CREDIT_CEILING = 150;

export class CreditLedger {
  private spent = 0;
  constructor(private readonly ceiling = DAILY_CREDIT_CEILING) {}

  get used(): number {
    return this.spent;
  }

  /** Throws rather than degrading. Failing loudly is the requirement (brief §10). */
  charge(credits = 1): void {
    if (this.spent + credits > this.ceiling) {
      throw new Error(
        `NewsData credit ceiling reached: ${this.spent}/${this.ceiling} used, ` +
          `refusing to spend ${credits} more. Ingest stopped to protect the daily quota.`,
      );
    }
    this.spent += credits;
  }
}

interface NewsDataArticle {
  title?: string;
  description?: string;
  link?: string;
  source_id?: string;
  source_name?: string;
  pubDate?: string;
}

/** One query. `language=en` is non-negotiable (brief §1, §10). */
export async function fetchNewsData(
  query: string,
  ledger: CreditLedger,
  signal?: AbortSignal,
): Promise<RawItem[]> {
  if (!NEWSDATA_API_KEY) throw new Error('NEWSDATA_API_KEY is not set');

  ledger.charge(1);

  const url = new URL(ENDPOINT);
  url.searchParams.set('apikey', NEWSDATA_API_KEY);
  url.searchParams.set('q', query);
  url.searchParams.set('language', 'en');

  const res = await fetch(url, { signal });
  if (!res.ok) {
    // 429 means the quota is gone; anything else is worth surfacing verbatim.
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
