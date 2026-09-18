// ABOUTME: Orchestrates one ingest run — reads topics and sources, fetches, normalizes, dedupes, upserts.
// ABOUTME: Returns a per-run report so the cron response says exactly what happened and what it cost.

import { DISCIPLINES, isDisciplineId, labelFor } from '../disciplines';
import type { DisciplineId, FeedItem } from '../types';
import { supabaseAdmin } from '../supabase/admin';
import {
  CreditCeilingError,
  CreditLedger,
  NewsDataQuotaError,
  RATE_LIMIT_CREDITS,
  buildQuery,
  fetchNewsData,
} from './newsdata';
import { fetchMarketaux } from './marketaux';
import { fetchFeed, matchDisciplines, scrubError } from './rss';
import { normalizeItem } from './normalize';
import { dedupeByIdAndDiscipline, duplicateCount } from './dedupe';

export interface IngestReport {
  startedAt: string;
  finishedAt: string;
  creditsUsed: number;
  /** NewsData queries not attempted because credits ran out mid-run. */
  newsDataSkipped: number;
  /** Discipline queries left for a later day by the rotation. Expected, not an error. */
  newsDataDeferred: number;
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
 * Running out of NewsData credits is the same rule, applied to one source.
 * Reaching our own ceiling or NewsData's 429 stops every remaining NewsData
 * query, since each further call would fail or overspend. Marketaux, RSS and
 * the write still happen, and the skip is reported as one source error, so a
 * run that still wrote rows answers 207 rather than a quiet 200.
 */
export async function runIngest(): Promise<IngestReport> {
  const startedAt = new Date().toISOString();
  const db = supabaseAdmin();
  // The ceiling is the rate-limit window, not the daily quota: past it NewsData
  // answers 429 anyway. Sponsors query after disciplines, so once any exist they
  // will hit this ceiling and be reported as skipped — loudly, not silently.
  const ledger = new CreditLedger(RATE_LIMIT_CREDITS);
  const sourceErrors: { name: string; error: string }[] = [];
  const collected: FeedItem[] = [];
  let rejected = 0;

  // Set once credits run out; every later NewsData query is counted, not sent.
  let creditsExhausted: string | null = null;
  let newsDataSkipped = 0;

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

  // ── NewsData: one query per discipline, one rate-limit window per run ───────
  // There are more disciplines than RATE_LIMIT_CREDITS, so each run takes the
  // next window's worth in a fixed order and the rest wait. The start advances
  // by a full window each day, so the ones left out differ daily and every
  // discipline comes round within a few days. Sorted first: the database
  // returns rows in no guaranteed order, and a changing order would let the
  // same discipline be left out day after day.
  const ordered = [...topics].sort((a, b) => a.discipline.localeCompare(b.discipline));
  const day = Math.floor(Date.parse(startedAt) / 86_400_000);
  const start = (day * RATE_LIMIT_CREDITS) % ordered.length;
  const scheduled = [...ordered.slice(start), ...ordered.slice(0, start)].slice(0, RATE_LIMIT_CREDITS);
  const newsDataDeferred = ordered.length - scheduled.length;

  for (const topic of scheduled) {
    if (creditsExhausted) {
      newsDataSkipped++;
      continue;
    }
    const query = buildQuery(topic.keywords.slice(0, 5));
    try {
      const raw = await fetchNewsData(query, ledger);
      for (const item of raw) {
        const norm = normalizeItem(item, topic.discipline as DisciplineId, labelFor(topic.discipline));
        if (norm) collected.push(norm);
        else rejected++;
      }
    } catch (err) {
      // Out of credits is not one more per-discipline error: it ends NewsData
      // for this run, and the failed query counts as skipped.
      if (err instanceof CreditCeilingError || err instanceof NewsDataQuotaError) {
        creditsExhausted = scrubError(err);
        newsDataSkipped++;
        continue;
      }
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
    if (creditsExhausted) {
      newsDataSkipped++;
      continue;
    }
    const terms = [sponsor.name, ...(sponsor.keywords ?? [])].filter(Boolean);
    try {
      const raw = await fetchNewsData(buildQuery(terms), ledger);
      for (const item of raw) {
        // Sponsor news is not discipline news; it is tagged to the sponsor and
        // surfaced in Sponsor Watch.
        const norm = normalizeItem(item, 'strategy', 'Sponsor');
        if (norm) collected.push({ ...norm, sponsorId: sponsor.id });
        else rejected++;
      }
    } catch (err) {
      if (err instanceof CreditCeilingError || err instanceof NewsDataQuotaError) {
        creditsExhausted = scrubError(err);
        newsDataSkipped++;
        continue;
      }
      sourceErrors.push({ name: `Sponsor:${sponsor.name}`, error: scrubError(err) });
    }
  }

  if (creditsExhausted) {
    sourceErrors.push({
      name: 'NewsData',
      error: `${creditsExhausted} (${newsDataSkipped} queries skipped)`,
    });
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

  // Fetched concurrently. Awaiting each feed in turn put the run's worst case
  // at (feed count × the 20s parser timeout); that was fine at one registered
  // feed and is not at sixteen, and a daily cron that overruns the function
  // limit leaves the dashboard stale for a day with no error to read.
  //
  // The NewsData and Marketaux loops above stay sequential on purpose — the
  // credit ceiling is checked between calls, and firing them in parallel would
  // overshoot it before the throw lands.
  //
  // ponytail: unbounded fan-out. Sixteen GETs to sixteen different hosts needs
  // no scheduler; add a concurrency limit if the source list reaches ~50.
  const results = await Promise.all(
    (feeds ?? []).map(async (feed) => {
      const result = await fetchFeed(feed.name, feed.feed_url as string);

      await db
        .from('news_sources')
        .update({ last_fetched: new Date().toISOString(), last_error: result.error })
        .eq('name', feed.name);

      return result;
    }),
  );

  // Second pass, in registration order rather than in whichever order the
  // network answered, so a run's report is reproducible.
  for (const result of results) {
    if (result.error) {
      sourceErrors.push({ name: result.name, error: result.error });
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
  const deduped = dedupeByIdAndDiscipline(collected);

  const articles = deduped.filter((i) => i.type === 'article');
  const reports = deduped.filter((i) => i.type === 'report');

  const upserted =
    (await upsertBatch('news_articles', articles)) + (await upsertBatch('news_reports', reports));

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    creditsUsed: ledger.used,
    newsDataSkipped,
    newsDataDeferred,
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
 *  and well within Postgres's parameter limits.
 *
 *  onConflict must name BOTH key columns. The key is (id, discipline) so that
 *  one story can cover every discipline it matched; naming `id` alone would no
 *  longer resolve against any constraint. */
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

  const { error } = await db.from(table).upsert(rows, { onConflict: 'id,discipline' });
  if (error) throw new Error(`Upsert into ${table} failed: ${error.message}`);
  return rows.length;
}
