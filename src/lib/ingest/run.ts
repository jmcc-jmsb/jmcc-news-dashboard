// ABOUTME: Orchestrates one ingest run — reads topics and sources, fetches, normalizes, dedupes, upserts.
// ABOUTME: Returns a per-run report so the cron response says exactly what happened and what it cost.

import { DISCIPLINES, isDisciplineId, labelFor } from '../disciplines';
import type { DisciplineId, FeedItem } from '../types';
import { supabaseAdmin } from '../supabase/admin';
import { CreditLedger, fetchNewsData } from './newsdata';
import { fetchMarketaux } from './marketaux';
import { fetchFeed, matchDisciplines, scrubError } from './rss';
import { normalizeItem } from './normalize';
import { dedupeById, duplicateCount } from './dedupe';

export interface IngestReport {
  startedAt: string;
  finishedAt: string;
  creditsUsed: number;
  fetched: number;
  duplicates: number;
  rejected: number;
  upserted: number;
  sourceErrors: { name: string; error: string }[];
  disciplinesCovered: string[];
}

interface TopicRow {
  discipline: string;
  keywords: string[];
}

/**
 * One run. Every stage is best-effort: a failing source is recorded and skipped
 * rather than aborting, because a run that dies on the first dead feed leaves
 * the whole dashboard stale for a full day (we ingest once daily — see
 * docs/CRON_OPTIONS.md).
 *
 * The one exception is the credit ceiling, which throws deliberately. Spending
 * past it empties the feed for the rest of the day, so stopping early with a
 * loud error is strictly better than continuing.
 */
export async function runIngest(): Promise<IngestReport> {
  const startedAt = new Date().toISOString();
  const db = supabaseAdmin();
  const ledger = new CreditLedger();
  const sourceErrors: { name: string; error: string }[] = [];
  const collected: FeedItem[] = [];
  let rejected = 0;

  // ── Keywords come from the database, not from a code constant (brief §3e) ──
  const { data: topicRows, error: topicErr } = await db
    .from('news_discipline_topics')
    .select('discipline, keywords');

  if (topicErr) {
    throw new Error(`Cannot read news_discipline_topics: ${topicErr.message}`);
  }

  const topics: TopicRow[] = (topicRows ?? []).filter((t): t is TopicRow =>
    isDisciplineId(t.discipline),
  );

  if (topics.length === 0) {
    throw new Error(
      'news_discipline_topics is empty — run the seed migration. Ingest has no keywords to query.',
    );
  }

  // ── NewsData: one query per discipline ──────────────────────────────────────
  for (const topic of topics) {
    const query = topic.keywords.slice(0, 5).join(' OR ');
    try {
      const raw = await fetchNewsData(query, ledger);
      for (const item of raw) {
        const norm = normalizeItem(item, topic.discipline as DisciplineId, labelFor(topic.discipline));
        if (norm) collected.push(norm);
        else rejected++;
      }
    } catch (err) {
      // A credit-ceiling breach must stop the run, not be swallowed as one
      // more source error.
      if (err instanceof Error && err.message.includes('credit ceiling')) throw err;
      sourceErrors.push({ name: `NewsData:${topic.discipline}`, error: scrubError(err) });
    }
  }

  // ── NewsData: one query per active sponsor (brief §3d) ──────────────────────
  // Ships doing nothing: there are no sponsors until the owner adds them.
  const { data: sponsors } = await db
    .from('news_sponsors')
    .select('id, name, keywords')
    .eq('active', true);

  for (const sponsor of sponsors ?? []) {
    const terms = [sponsor.name, ...(sponsor.keywords ?? [])].filter(Boolean);
    try {
      const raw = await fetchNewsData(terms.join(' OR '), ledger);
      for (const item of raw) {
        // Sponsor news is not discipline news; it is tagged to the sponsor and
        // surfaced in Sponsor Watch.
        const norm = normalizeItem(item, 'strategy', 'Sponsor');
        if (norm) collected.push({ ...norm, sponsorId: sponsor.id });
        else rejected++;
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('credit ceiling')) throw err;
      sourceErrors.push({ name: `Sponsor:${sponsor.name}`, error: scrubError(err) });
    }
  }

  // ── Marketaux: finance only ─────────────────────────────────────────────────
  try {
    for (const item of await fetchMarketaux()) {
      const norm = normalizeItem(item, 'finance', labelFor('finance'));
      if (norm) collected.push(norm);
      else rejected++;
    }
  } catch (err) {
    sourceErrors.push({ name: 'Marketaux', error: scrubError(err) });
  }

  // ── RSS: whatever is registered and active ──────────────────────────────────
  const { data: feeds } = await db
    .from('news_sources')
    .select('name, feed_url')
    .eq('kind', 'rss')
    .eq('active', true)
    .not('feed_url', 'is', null);

  for (const feed of feeds ?? []) {
    const result = await fetchFeed(feed.name, feed.feed_url as string);

    await db
      .from('news_sources')
      .update({ last_fetched: new Date().toISOString(), last_error: result.error })
      .eq('name', feed.name);

    if (result.error) {
      sourceErrors.push({ name: feed.name, error: result.error });
      continue;
    }

    for (const item of result.items) {
      // Consulting feeds are general-interest, so one item can legitimately
      // belong to several disciplines — and one that matches none is dropped
      // rather than dumped into a default.
      for (const discipline of matchDisciplines(item, topics)) {
        const norm = normalizeItem(item, discipline as DisciplineId, labelFor(discipline), 'report');
        if (norm) collected.push(norm);
        else rejected++;
      }
    }
  }

  // ── Dedupe, then write ──────────────────────────────────────────────────────
  const duplicates = duplicateCount(collected);
  const deduped = dedupeById(collected);

  const articles = deduped.filter((i) => i.type === 'article');
  const reports = deduped.filter((i) => i.type === 'report');

  const upserted =
    (await upsertBatch('news_articles', articles)) + (await upsertBatch('news_reports', reports));

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    creditsUsed: ledger.used,
    fetched: collected.length,
    duplicates,
    rejected,
    upserted,
    sourceErrors,
    disciplinesCovered: [...new Set(deduped.map((i) => i.disciplineId))].filter((d) =>
      DISCIPLINES.some((x) => x.id === d),
    ),
  };
}

/** Upserts on the primary key so a re-run updates rather than duplicating.
 *  Batched because a single statement with a few hundred rows is one round trip
 *  and well within Postgres's parameter limits. */
async function upsertBatch(table: string, items: FeedItem[]): Promise<number> {
  if (items.length === 0) return 0;
  const db = supabaseAdmin();
  const rows = items.map((i) => ({
    id: i.id,
    type: i.type,
    title: i.title,
    description: i.description,
    url: i.url,
    source: i.source,
    published_at: i.publishedAt,
    discipline: i.disciplineId,
    sponsor_id: i.sponsorId,
    ai_relevant: i.aiRelevant,
    ingested_at: i.ingestedAt ?? new Date().toISOString(),
  }));

  const { error } = await db.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`Upsert into ${table} failed: ${error.message}`);
  return rows.length;
}
