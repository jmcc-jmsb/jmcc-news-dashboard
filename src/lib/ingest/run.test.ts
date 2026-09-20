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
const { fetchNewsData, CreditCeilingError, NewsDataQuotaError, MAX_QUERY_LENGTH, RATE_LIMIT_CREDITS } =
  await import('./newsdata');
const { DISCIPLINES, DISCIPLINE_REGISTRY } = await import('../disciplines');
const { fetchMarketaux } = await import('./marketaux');
const { fetchFeed } = await import('./rss');
const { runIngest } = await import('./run');

/** The four regional sections rotate; the international competitions do not. */
const REGIONAL = DISCIPLINES.filter((d) => d.competition !== 'intl');
const HOST_COUNTRIES = [...new Set(DISCIPLINE_REGISTRY.flatMap((d) => (d.country ? [d.country] : [])))];

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

  // The first discipline ran, the second hit the ceiling, and neither the third nor the sponsor was attempted.
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
  vi.mocked(fetchNewsData).mockImplementation(async (query) => {
    if (query === 'audit') throw new Error('NewsData 500 for query "audit"');
    return [];
  });

  const report = await runIngest();

  expect(fetchNewsData).toHaveBeenCalledTimes(4);
  expect(report.newsDataSkipped).toBe(0);
  expect(report.sourceErrors).toEqual([
    { name: 'NewsData:accounting', error: 'NewsData 500 for query "audit"' },
  ]);
});

test('discipline and sponsor queries stay within the NewsData query length limit', async () => {
  const long = (n: number) => `keyword number ${n} padded out`;
  const fake = fakeDb({
    news_discipline_topics: [{ discipline: 'finance', keywords: [1, 2, 3, 4, 5].map(long) }],
    news_sponsors: [{ id: 'sponsor-1', name: 'Acme', keywords: [1, 2, 3, 4, 5, 6].map(long) }],
    news_sources: [],
  });
  vi.mocked(supabaseAdmin).mockReturnValue(fake.db as never);
  vi.mocked(fetchNewsData).mockResolvedValue([]);

  await runIngest();

  const queries = vi.mocked(fetchNewsData).mock.calls.map(([query]) => query);
  expect(queries).toHaveLength(2);
  for (const query of queries) {
    expect(query.length).toBeGreaterThan(0);
    expect(query.length).toBeLessThanOrEqual(MAX_QUERY_LENGTH);
  }
});

/** Every discipline in the registry, each keyed by its own id so a query names its discipline. */
function allDisciplines(fake = fakeDb) {
  const topics = DISCIPLINES.map((d) => ({ discipline: d.id, keywords: [d.id] }));
  const db = fake({ news_discipline_topics: topics, news_sponsors: [], news_sources: [] });
  vi.mocked(supabaseAdmin).mockReturnValue(db.db as never);
  // Same handle the default fake publishes, so a test can read what was written.
  upserted = db.upserted;
  return topics;
}

/** Runs ingest as if on the given UTC date and returns the discipline queries it sent. */
async function queriesOn(date: string) {
  vi.setSystemTime(new Date(`${date}T11:00:00Z`));
  vi.mocked(fetchNewsData).mockClear();
  const report = await runIngest();
  return { report, queries: vi.mocked(fetchNewsData).mock.calls.map(([query]) => query) };
}

test('a run sends at most one rate-limit window of NewsData queries and defers the rest quietly', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  allDisciplines();
  vi.mocked(fetchNewsData).mockResolvedValue([]);

  const { report, queries } = await queriesOn('2026-09-19');

  expect(DISCIPLINES.length).toBeGreaterThan(RATE_LIMIT_CREDITS);
  expect(queries).toHaveLength(RATE_LIMIT_CREDITS);
  // The host-country queries come off the top of the window; what is left over
  // is what the regional disciplines rotate through.
  expect(report.newsDataDeferred).toBe(REGIONAL.length - (RATE_LIMIT_CREDITS - HOST_COUNTRIES.length));
  // Planned deferral is not a failure, so it must not turn the cron's 200 into a 207.
  expect(report.sourceErrors).toEqual([]);
  expect(report.newsDataSkipped).toBe(0);
  vi.useRealTimers();
});

test('the deferred disciplines change daily, so every discipline is queried within a few days', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  allDisciplines();
  vi.mocked(fetchNewsData).mockResolvedValue([]);

  const day1 = (await queriesOn('2026-09-19')).queries;
  const day2 = (await queriesOn('2026-09-20')).queries;
  expect(new Set(day1)).not.toEqual(new Set(day2));

  // allDisciplines() keys each discipline's keywords to its own id, so a
  // regional query reads as the id and a country group as its ids joined by OR.
  const seen = new Set<string>();
  for (let day = 19; day <= 29; day++) {
    for (const q of (await queriesOn(`2026-09-${day}`)).queries) seen.add(q);
  }
  for (const discipline of REGIONAL) expect([...seen]).toContain(discipline.id);
  vi.useRealTimers();
});

test('the day decides which disciplines run, not the order the database returns them in', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.mocked(fetchNewsData).mockResolvedValue([]);

  allDisciplines();
  const asStored = (await queriesOn('2026-09-19')).queries;
  allDisciplines((tables) =>
    fakeDb({ ...tables, news_discipline_topics: [...tables.news_discipline_topics].reverse() }),
  );
  const reversed = (await queriesOn('2026-09-19')).queries;

  expect(reversed).toEqual(asStored);
  vi.useRealTimers();
});

test('a clean run queries every discipline and sponsor and reports nothing skipped', async () => {
  vi.mocked(fetchNewsData).mockResolvedValue([]);

  const report = await runIngest();

  expect(fetchNewsData).toHaveBeenCalledTimes(4);
  expect(report.newsDataSkipped).toBe(0);
  expect(report.sourceErrors).toEqual([]);
  expect(report.upserted).toBe(2);
});

// ─────────────────────────────────────────────────────────────────────────────
// Country routing. The regional sections compete in Canada, so their feeds read
// Canadian news; the six international competitions read news from their own
// host country, one query per country rather than one per competition.
// ─────────────────────────────────────────────────────────────────────────────

/** The country each call asked for, in call order. */
const countries = () =>
  vi.mocked(fetchNewsData).mock.calls.map(([, , options]) => options?.country);

test('regional discipline queries ask for Canadian news', async () => {
  vi.mocked(fetchNewsData).mockResolvedValue([]);

  await runIngest();

  // TOPICS is finance/accounting/tax, all JDC, plus the sponsor query.
  expect(countries().slice(0, 3)).toEqual(['ca', 'ca', 'ca']);
});

test('the international competitions are queried once per host country, not once each', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  allDisciplines();
  vi.mocked(fetchNewsData).mockResolvedValue([]);

  await queriesOn('2026-09-19');

  const intl = DISCIPLINE_REGISTRY.filter((d) => d.competition === 'intl');
  const hosts = [...new Set(intl.map((d) => d.country))];
  expect(intl).toHaveLength(6);
  expect(hosts).toEqual(['th', 'us', 'es', 'rs']);
  // Four queries cover six competitions: three of them are in the US.
  expect(countries().filter((c) => c && c !== 'ca').sort()).toEqual([...hosts].sort());
  vi.useRealTimers();
});

test('a country query tags its articles to every competition held there', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  allDisciplines();
  vi.mocked(fetchNewsData).mockImplementation(async (_query, _ledger, options) =>
    options?.country === 'us' ? [raw('A US business story', 'https://example.com/us-story')] : [],
  );

  await queriesOn('2026-09-19');

  const tagged = (upserted.news_articles ?? [])
    .filter((r) => r.url === 'https://example.com/us-story')
    .map((r) => r.discipline)
    .sort();
  expect(tagged).toEqual(['eller', 'hicc', 'micc']);
  vi.useRealTimers();
});

test('the international queries run every day; only the regional disciplines rotate', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  allDisciplines();
  vi.mocked(fetchNewsData).mockResolvedValue([]);

  const regional = DISCIPLINES.filter((d) => d.competition !== 'intl');
  for (const date of ['2026-09-19', '2026-09-20', '2026-09-21']) {
    const { report } = await queriesOn(date);
    // Four host-country queries on top of the rotating regional ones.
    expect(countries().filter((c) => c !== 'ca')).toHaveLength(4);
    expect(vi.mocked(fetchNewsData)).toHaveBeenCalledTimes(RATE_LIMIT_CREDITS);
    expect(report.newsDataDeferred).toBe(regional.length - (RATE_LIMIT_CREDITS - 4));
    expect(report.sourceErrors).toEqual([]);
  }
  vi.useRealTimers();
});
