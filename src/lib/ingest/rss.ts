// ABOUTME: Fetches the RSS feeds registered in news_sources and keyword-matches items to disciplines.
// ABOUTME: Records failures in news_sources.last_error — public feed URLs rot, and they rot silently.

import Parser from 'rss-parser';
import type { RawItem } from './normalize';

/** Identifies us to publishers rather than arriving as a bare bot. Several of
 *  the feeds in brief §10 return 403 to unidentified clients. */
const USER_AGENT = 'JMCC-news-dashboard/1.0 (+https://news.jmccjmsb.ca)';

const parser = new Parser({
  timeout: 20_000,
  headers: { 'User-Agent': USER_AGENT },
});

export interface FeedResult {
  name: string;
  feedUrl: string;
  items: RawItem[];
  error: string | null;
}

/**
 * Never throws. A dead feed must degrade to "this source contributed nothing
 * and here is why", not abort the run and take the healthy sources with it.
 *
 * This matters more than usual here: as of 2026-08-20 all five feeds named in
 * brief §10 were dead (four 404, one 403). See the seed migration.
 */
export async function fetchFeed(name: string, feedUrl: string): Promise<FeedResult> {
  try {
    const feed = await parser.parseURL(feedUrl);
    const items: RawItem[] = (feed.items ?? [])
      .filter((i) => i.title && i.link)
      .map((i) => ({
        title: i.title as string,
        description: i.contentSnippet ?? i.content ?? i.summary ?? '',
        url: i.link as string,
        // The registered publisher name wins over whatever the feed calls
        // itself, so the UI shows "McKinsey", not "McKinsey Insights &
        // Publications RSS".
        source: name,
        publishedAt: i.isoDate ?? i.pubDate ?? new Date().toISOString(),
      }));
    return { name, feedUrl, items, error: null };
  } catch (err) {
    return { name, feedUrl, items: [], error: scrubError(err) };
  }
}

/**
 * last_error is publicly readable (news_sources has an anon read policy), so
 * an upstream message must never carry a key into it. Feed URLs are public and
 * keyless, but an error string can echo a redirect target or a header, so this
 * truncates and strips anything that looks like a credential.
 */
export function scrubError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw
    .replace(/(api[_-]?key|apikey|api_token|token|secret)=[^&\s]+/gi, '$1=REDACTED')
    .replace(/Bearer\s+\S+/gi, 'Bearer REDACTED')
    .slice(0, 300);
}

/** Assigns a feed item to a discipline by keyword overlap. Consulting feeds are
 *  general-interest, so an item with no match belongs to no discipline and is
 *  dropped rather than dumped into a default one. */
export function matchDisciplines(
  item: RawItem,
  topics: { discipline: string; keywords: string[] }[],
): string[] {
  const haystack = `${item.title} ${item.description ?? ''}`.toLowerCase();
  return topics
    .filter((t) => t.keywords.some((k) => k.trim() && haystack.includes(k.toLowerCase())))
    .map((t) => t.discipline);
}
