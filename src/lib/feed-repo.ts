// ABOUTME: The read path — turns news_articles / news_reports / news_sponsors rows into FeedItems.
// ABOUTME: Server-side only. Falls back to fixtures ONLY when PUBLIC_USE_FIXTURES is explicitly on.

import { PUBLIC_SUPABASE_URL, PUBLIC_USE_FIXTURES } from 'astro:env/client';
import { SUPABASE_SECRET_KEY } from 'astro:env/server';
import { supabaseAdmin } from './supabase/admin';
import { ARTICLES, REPORTS } from './fixtures';
import { labelFor } from './disciplines';
import type { FeedItem, ItemType } from './types';

/** Every read response carries its own provenance. The UI renders a visible
 *  banner on `sample`, so a reader is never shown invented headlines without
 *  being told. */
export type FeedOrigin = 'database' | 'sample';

export interface FeedResponse {
  origin: FeedOrigin;
  discipline: string;
  items: FeedItem[];
  /** Newest ingested_at across the rows, or null. Drives the honest
   *  "last refresh" line — never a Date created on render (brief §10). */
  lastIngestedAt: string | null;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(PUBLIC_SUPABASE_URL && SUPABASE_SECRET_KEY);
}

/**
 * Fixtures are served only when someone has deliberately asked for them.
 *
 * The alternative — falling back automatically whenever the database is
 * unreachable — would mean a Supabase outage silently replaces the feed with
 * invented articles attributed to Reuters, Bloomberg and WSJ. An empty feed
 * that says it is empty is far better than a full one that is lying.
 */
export function shouldServeSample(): boolean {
  return PUBLIC_USE_FIXTURES === true;
}

interface Row {
  id: string;
  type: string;
  title: string;
  description: string | null;
  url: string;
  source: string;
  published_at: string;
  discipline: string;
  sponsor_id: string | null;
  ai_relevant: boolean;
  pinned: boolean | null;
  pinned_note: string | null;
  ingested_at: string;
}

function toFeedItem(r: Row): FeedItem {
  return {
    id: r.id,
    type: (r.type as ItemType) ?? 'article',
    title: r.title,
    description: r.description ?? '',
    url: r.url,
    source: r.source,
    publishedAt: r.published_at,
    // The column stores the discipline id; the UI shows the label.
    discipline: labelFor(r.discipline) || r.discipline,
    disciplineId: r.discipline as FeedItem['disciplineId'],
    aiRelevant: r.ai_relevant,
    sponsorId: r.sponsor_id,
    pinned: r.pinned ?? false,
    pinnedNote: r.pinned_note ?? undefined,
    ingestedAt: r.ingested_at,
  };
}

function newestIngest(items: FeedItem[]): string | null {
  const stamps = items.map((i) => i.ingestedAt).filter((s): s is string => Boolean(s));
  return stamps.length ? stamps.reduce((a, b) => (a > b ? a : b)) : null;
}

/**
 * Recency first, always. §3f's decision is badge-don't-reorder: AI relevance
 * is a tag and a filter, never a sort key. Pinned items are the one documented
 * exception and are surfaced above the rest.
 */
export async function getFeed(
  table: 'news_articles' | 'news_reports',
  discipline: string,
  limit: number,
  aiOnly: boolean,
): Promise<FeedResponse> {
  const label = labelFor(discipline) || discipline;

  if (shouldServeSample()) {
    const source = table === 'news_articles' ? ARTICLES : REPORTS;
    const all = source[discipline] ?? [];
    const items = (aiOnly ? all.filter((i) => i.aiRelevant) : all).slice(0, limit);
    return { origin: 'sample', discipline: label, items, lastIngestedAt: null };
  }

  let query = supabaseAdmin()
    .from(table)
    .select('*')
    .eq('discipline', discipline)
    .order('pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(limit);

  if (aiOnly) query = query.eq('ai_relevant', true);

  const { data, error } = await query;
  if (error) throw new Error(`${table} read failed: ${error.message}`);

  const items = (data ?? []).map((r) => toFeedItem(r as Row));
  return { origin: 'database', discipline: label, items, lastIngestedAt: newestIngest(items) };
}

export interface SponsorRow {
  id: string;
  name: string;
  competitionId: string | null;
}

/**
 * Active sponsors only. Ships empty, and Sponsor Watch hides itself entirely
 * on an empty list — an empty rail is never rendered (brief §3d).
 *
 * Returns [] rather than throwing when there is no database: an absent sponsor
 * rail is indistinguishable from a sponsor rail with nothing in it, which is
 * the correct behaviour either way. Fabricating sample sponsors would be worse
 * than fabricating sample articles — these are named commercial relationships.
 */
export async function getActiveSponsors(): Promise<SponsorRow[]> {
  if (!isDatabaseConfigured()) return [];

  const { data, error } = await supabaseAdmin()
    .from('news_sponsors')
    .select('id, name, competition_id')
    .eq('active', true)
    .order('name');

  if (error) throw new Error(`news_sponsors read failed: ${error.message}`);

  return (data ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    competitionId: (s.competition_id as string | null) ?? null,
  }));
}
