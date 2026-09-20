// ABOUTME: Orchestrates one ingest run — reads topics and sources, fetches, normalizes, dedupes, upserts.
// ABOUTME: Returns a per-run report so the cron response says exactly what happened and what it cost.

import { DISCIPLINE_REGISTRY, countryOf, isDisciplineId, labelFor } from '../disciplines';
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

/** Where the four regional sections compete: JDC/JDCC, SMNG, FO and HM all run
 *  in Quebec, Ontario or New Brunswick, so their news is Canadian. */
const REGIONAL_COUNTRY = 'ca';

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

  // ── NewsData: country-filtered queries ─────────────────────────────────────
  // Two kinds of query, because the sections are two kinds of thing.
  //
  // The four regional sections compete in Quebec, Ontario and New Brunswick, so
  // their disciplines read Canadian news. Before this filter the feed carried
  // US local stories — a Chicago mayoral race, a Myrtle Beach tourism piece —
  // which no delegate is preparing a case on.
  //
  // The six international competitions are not subject areas but destinations,
  // so each reads business news from its host country. They group BY COUNTRY:
  // three of the six are in the United States and would otherwise spend three
  // credits fetching near-identical news. One query per country, tagged to
  // every competition held there.
  const intlTopics = topics.filter((t) => countryOf(t.discipline));
  const regionalTopics = topics.filter((t) => !countryOf(t.discipline));

  /** Host country → the competitions there. Driven by the registry, not by the
   *  rows: Supabase returns them in no guaranteed order, and the order decides
   *  both which country is queried first and how the shared query reads. */
  const intlByDiscipline = new Map(intlTopics.map((t) => [t.discipline, t]));
  const byCountry = new Map<string, TopicRow[]>();
  for (const { id, country } of DISCIPLINE_REGISTRY) {
    const topic = country && intlByDiscipline.get(id);
    if (!country || !topic) continue;
    byCountry.set(country, [...(byCountry.get(country) ?? []), topic]);
  }

  // There are more regional disciplines than credits left after the country
  // queries, so each run takes the next window's worth in a fixed order and the
  // rest wait. The start advances by a full window each day, so the ones left
  // out differ daily and every discipline comes round within a few days. Sorted
  // first: the database returns rows in no guaranteed order, and a changing
  // order would let the same discipline be left out day after day.
  //
  // The country queries are NOT in the rotation. There are only four of them,
  // and a competition feed that goes dark for a day or two before the team
  // flies out is worse than a discipline waiting one more day.
  const rotatingBudget = Math.max(RATE_LIMIT_CREDITS - byCountry.size, 0);
  const ordered = [...regionalTopics].sort((a, b) => a.discipline.localeCompare(b.discipline));
  const day = Math.floor(Date.parse(startedAt) / 86_400_000);
  const start = ordered.length ? (day * rotatingBudget) % ordered.length : 0;
  const scheduled = [...ordered.slice(start), ...ordered.slice(0, start)].slice(0, rotatingBudget);
  const newsDataDeferred = ordered.length - scheduled.length;

  /** One query, its articles tagged to each discipline it was asked for. */
  const queryFor = async (name: string, keywords: string[], country: string, forDisciplines: string[]) => {
    if (creditsExhausted) {
      newsDataSkipped++;
      return;
    }
    const query = buildQuery(keywords.slice(0, 5));
    try {
      const raw = await fetchNewsData(query, ledger, { country });
      for (const item of raw) {
        for (const discipline of forDisciplines) {
          const norm = normalizeItem(item, discipline as DisciplineId, labelFor(discipline));
          if (norm) collected.push(norm);
          else rejected++;
        }
      }
    } catch (err) {
      // Out of credits is not one more per-query error: it ends NewsData for
      // this run, and the failed query counts as skipped.
      if (err instanceof CreditCeilingError || err instanceof NewsDataQuotaError) {
        creditsExhausted = scrubError(err);
        newsDataSkipped++;
        return;
      }
      sourceErrors.push({ name: `NewsData:${name}`, error: scrubError(err) });
    }
  };

  for (const [country, group] of byCountry) {
    // The group shares a query, so it shares keywords: each competition's own
    // set in registry order, deduped, and buildQuery takes what fits.
    const keywords = [...new Set(group.flatMap((t) => t.keywords))];
    await queryFor(
      group.map((t) => t.discipline).join('+'),
      keywords,
      country,
      group.map((t) => t.discipline),
    );
  }

  for (const topic of scheduled) {
    await queryFor(topic.discipline, topic.keywords, REGIONAL_COUNTRY, [topic.discipline]);
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
      DISCIPLINE_REGISTRY.some((x) => x.id === d),
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
