// ABOUTME: Pins how one ingest run degrades: running out of NewsData credits stops NewsData only.
// ABOUTME: Supabase and every source are faked, so this checks orchestration, not the network.

import { beforeEach, expect, test, vi } from 'vitest';

vi.mock('astro:env/server', () => ({}));
vi.mock('../supabase/admin', () => ({ supabaseAdmin: vi.fn() }));
vi.mock('./newsdata', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./newsdata')>()),
  fetchNewsData: vi.fn(),
}));
vi.mock('./marketaux', () => ({ fetchMarketaux: vi.fn() }));
vi.mock('./rss', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./rss')>()),
  fetchFeed: vi.fn(),
}));

const { supabaseAdmin } = await import('../supabase/admin');
const { fetchNewsData, CreditCeilingError, NewsDataQuotaError } = await import('./newsdata');
const { fetchMarketaux } = await import('./marketaux');
const { fetchFeed } = await import('./rss');
const { runIngest } = await import('./run');

const TOPICS = [
  { discipline: 'finance', keywords: ['bank'] },
  { discipline: 'accounting', keywords: ['audit'] },
  { discipline: 'tax', keywords: ['tax'] },
];

type Row = Record<string, unknown>;

/** A chainable stand-in for the Supabase query builder. Reads resolve to the
 *  rows given per table; upserts are recorded so a test can see what was written. */
function fakeDb(tables: Record<string, Row[]>) {
  const upserted: Record<string, Row[]> = {};
  const from = (table: string) => {
    const result = { data: tables[table] ?? [], error: null };
    const builder = {
      select: () => builder,
      eq: () => builder,
      not: () => builder,
      update: () => builder,
      upsert: async (rows: Row[]) => {
        (upserted[table] ??= []).push(...rows);
        return { error: null };
      },
      then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject),
    };
    return builder;
  };
  return { db: { from }, upserted };
}

function raw(title: string, url: string) {
  return { title, description: '', url, source: 'Example Wire', publishedAt: '2026-09-16T12:00:00Z' };
}

let upserted: Record<string, Row[]>;

beforeEach(() => {
  vi.mocked(fetchNewsData).mockReset();

  const fake = fakeDb({
    news_discipline_topics: TOPICS,
    news_sponsors: [{ id: 'sponsor-1', name: 'Acme', keywords: [] }],
    news_sources: [{ name: 'Example Feed', feed_url: 'https://feed.example/rss' }],
  });
  upserted = fake.upserted;
  vi.mocked(supabaseAdmin).mockReturnValue(fake.db as never);

  vi.mocked(fetchMarketaux).mockResolvedValue([raw('Markets open higher', 'https://example.com/markets')]);
  vi.mocked(fetchFeed).mockResolvedValue({
    name: 'Example Feed',
    feedUrl: 'https://feed.example/rss',
    items: [raw('A new audit standard', 'https://example.com/audit-standard')],
    error: null,
  });
});

const urls = (table: string) => (upserted[table] ?? []).map((r) => r.url);

test('reaching the credit ceiling stops NewsData but still writes everything already fetched', async () => {
  vi.mocked(fetchNewsData)
    .mockResolvedValueOnce([raw('Bank rates hold', 'https://example.com/bank-rates')])
    .mockRejectedValueOnce(new CreditCeilingError('NewsData credit ceiling reached: 150/150 used'));

  const report = await runIngest();

  // finance ran, accounting hit the ceiling, and neither tax nor the sponsor was attempted.
  expect(fetchNewsData).toHaveBeenCalledTimes(2);
  expect(report.newsDataSkipped).toBe(3);
  expect(urls('news_articles')).toEqual(
    expect.arrayContaining(['https://example.com/bank-rates', 'https://example.com/markets']),
  );
  expect(urls('news_reports')).toEqual(['https://example.com/audit-standard']);
  expect(report.sourceErrors).toEqual([
    { name: 'NewsData', error: expect.stringContaining('credit ceiling') },
  ]);
  expect(report.sourceErrors[0].error).toContain('3 queries skipped');
});

test("a 429 from NewsData stops further NewsData queries for the rest of the run", async () => {
  vi.mocked(fetchNewsData)
    .mockResolvedValueOnce([raw('Bank rates hold', 'https://example.com/bank-rates')])
    .mockRejectedValueOnce(new NewsDataQuotaError('NewsData 429 for query "audit": daily quota exhausted'));

  const report = await runIngest();

  expect(fetchNewsData).toHaveBeenCalledTimes(2);
  expect(report.newsDataSkipped).toBe(3);
  expect(report.upserted).toBe(3);
  expect(report.sourceErrors).toEqual([
    { name: 'NewsData', error: expect.stringContaining('quota') },
  ]);
});

test('an ordinary NewsData failure skips only that query', async () => {
  vi.mocked(fetchNewsData)
    .mockResolvedValueOnce([])
    .mockRejectedValueOnce(new Error('NewsData 500 for query "audit"'))
    .mockResolvedValue([]);

  const report = await runIngest();

  expect(fetchNewsData).toHaveBeenCalledTimes(4);
  expect(report.newsDataSkipped).toBe(0);
  expect(report.sourceErrors).toEqual([
    { name: 'NewsData:accounting', error: 'NewsData 500 for query "audit"' },
  ]);
});

test('a clean run queries every discipline and sponsor and reports nothing skipped', async () => {
  vi.mocked(fetchNewsData).mockResolvedValue([]);

  const report = await runIngest();

  expect(fetchNewsData).toHaveBeenCalledTimes(4);
  expect(report.newsDataSkipped).toBe(0);
  expect(report.sourceErrors).toEqual([]);
  expect(report.upserted).toBe(2);
});
