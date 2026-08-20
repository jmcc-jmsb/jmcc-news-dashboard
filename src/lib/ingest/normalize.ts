// ABOUTME: Canonicalises publisher names and rejects non-English outlets before anything reaches the database.
// ABOUTME: The seed data in lib/fixtures.ts is the reference output — these rules must reproduce it.

import { h } from '../format';
import type { DisciplineId, FeedItem, ItemType } from '../types';
import { isAiRelevant } from './ai-relevance';

/**
 * Publishers name themselves inconsistently across feeds and APIs, and the same
 * outlet arriving as three spellings shows up as three sources in the UI and
 * defeats nothing else — the dedupe key is the URL, not the name. This is
 * cosmetic, but it is the difference between a feed that looks maintained and
 * one that does not.
 *
 * Keys are compared lowercased and whitespace-collapsed, so one entry covers
 * every casing variant. That matters: the seed data itself contains both "A16Z"
 * and "a16z", which is exactly the drift this prevents.
 */
const SOURCE_ALIASES: Record<string, string> = {
  // Named explicitly in brief §10.
  'wall street journal': 'WSJ',
  'the wall street journal': 'WSJ',
  'wsj': 'WSJ',
  'the globe and mail': 'Globe and Mail',
  'the globe': 'Globe and Mail',
  'globe and mail': 'Globe and Mail',
  'bnn': 'BNN Bloomberg',
  'bnn bloomberg': 'BNN Bloomberg',

  // Casing and long-form variants seen in the seed data or common in feeds.
  'a16z': 'a16z',
  'andreessen horowitz': 'a16z',
  'financial times': 'FT',
  'ft': 'FT',
  'harvard business review': 'HBR',
  'hbr': 'HBR',
  'the information': 'The Information',
  'cbc news': 'CBC',
  'cbc': 'CBC',
  'the financial post': 'Financial Post',
  'mckinsey & company': 'McKinsey',
  'mckinsey and company': 'McKinsey',
  'mckinsey insights & publications': 'McKinsey',
  'mckinsey insights and publications': 'McKinsey',
  'boston consulting group': 'BCG',
  'mit sloan management review': 'MIT Sloan Management Review',
  'knowledge at wharton': 'Knowledge at Wharton',
};

/**
 * French-language outlets are excluded entirely (brief §10). The dashboard is
 * English-only, and `language=en` on the APIs does not catch everything —
 * Canadian outlets in particular publish English-tagged items on French
 * domains, and RSS has no language guarantee at all. So this is a hard filter
 * applied after the API parameter, not instead of it.
 */
const EXCLUDED_OUTLETS: readonly string[] = [
  'la presse',
  'le devoir',
  'les affaires',
  'revenu québec',
  'revenu quebec',
  'radio-canada',
  'radio canada',
  'ici radio-canada',
  'le journal de montréal',
  'le journal de montreal',
  'la tribune',
  'le soleil',
  'tva nouvelles',
];

function key(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** True when the outlet must never be stored. */
export function isExcludedSource(raw: string): boolean {
  const k = key(raw);
  return EXCLUDED_OUTLETS.some((o) => k === o || k.startsWith(o + ' ') || k.includes(o));
}

/**
 * Canonical publisher name. Unknown outlets pass through with only cosmetic
 * cleanup — an allowlist would silently drop legitimate new sources, which is
 * the worse failure for a feed whose job is breadth.
 */
export function normalizeSource(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Unknown';

  const mapped = SOURCE_ALIASES[key(cleaned)];
  if (mapped) return mapped;

  // "The Economist" keeps its article; "The Verge" does too. Only strip a
  // leading "The" when the alias table says so, which it does above for the
  // cases brief §10 names. Everything else is left as the publisher wrote it.
  return cleaned;
}

/** Strips tags and collapses whitespace. RSS descriptions are frequently HTML. */
export function cleanText(raw: string | undefined | null, maxLength = 400): string {
  if (!raw) return '';
  const text = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  // Snippet only, never the body (brief §10, Copyright). The free API tiers
  // return snippets anyway; this makes that a property of our code rather than
  // a convenient accident of the vendor's plan.
  return text.length > maxLength ? text.slice(0, maxLength - 1).trimEnd() + '…' : text;
}

/** Strips tracking parameters so the same story from two campaigns dedupes to
 *  one row. h(url) is the primary key, so a stray ?utm_source would otherwise
 *  create a duplicate article with a different id. */
export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    const drop: string[] = [];
    u.searchParams.forEach((_, k) => {
      if (/^(utm_|fbclid|gclid|mc_cid|mc_eid|ref|source$)/i.test(k)) drop.push(k);
    });
    drop.forEach((k) => u.searchParams.delete(k));
    u.hash = '';
    // Trailing slash is not meaningful for these publishers and splits the key.
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
    return u.toString();
  } catch {
    return raw.trim();
  }
}

export interface RawItem {
  title: string;
  description?: string | null;
  url: string;
  source: string;
  publishedAt: string;
}

/**
 * One raw item from any source becomes a row, or becomes null.
 *
 * Returns null rather than throwing: a single malformed item in a 50-item feed
 * must not abort the run. The caller counts rejections so a source that starts
 * emitting garbage shows up in news_sources.last_error instead of silently
 * contributing nothing.
 */
export function normalizeItem(
  raw: RawItem,
  discipline: DisciplineId,
  disciplineLabel: string,
  type: ItemType = 'article',
): FeedItem | null {
  if (!raw?.title?.trim() || !raw?.url?.trim()) return null;
  if (isExcludedSource(raw.source ?? '')) return null;

  const published = new Date(raw.publishedAt);
  if (Number.isNaN(published.getTime())) return null;

  const url = canonicalUrl(raw.url);
  const title = cleanText(raw.title, 300);
  const description = cleanText(raw.description, 400);

  return {
    id: h(url),
    type,
    title,
    description,
    url,
    source: normalizeSource(raw.source ?? ''),
    publishedAt: published.toISOString(),
    discipline: disciplineLabel,
    disciplineId: discipline,
    aiRelevant: isAiRelevant(title, description),
    sponsorId: null,
    ingestedAt: new Date().toISOString(),
  };
}
