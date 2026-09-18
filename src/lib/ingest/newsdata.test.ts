// ABOUTME: Pins the two ways NewsData spending stops: our own credit ceiling, and NewsData's 429 quota response.
// ABOUTME: Each has its own error type so runIngest can stop querying NewsData without aborting the run.

import { afterEach, expect, test, vi } from 'vitest';

// astro:env/server is a virtual module supplied by Astro's build; under vitest
// it does not exist, so the key is stubbed.
vi.mock('astro:env/server', () => ({ NEWSDATA_API_KEY: 'test-key' }));

const { CreditLedger, CreditCeilingError, NewsDataQuotaError, MAX_QUERY_LENGTH, buildQuery, fetchNewsData } =
  await import('./newsdata');

afterEach(() => {
  vi.unstubAllGlobals();
});

test('the ledger throws a CreditCeilingError rather than spending past the ceiling', () => {
  const ledger = new CreditLedger(2);
  ledger.charge();
  ledger.charge();

  expect(() => ledger.charge()).toThrow(CreditCeilingError);
  expect(ledger.used).toBe(2);
});

test('a 429 from NewsData is a NewsDataQuotaError, because no more queries will succeed this run', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })));

  const failure = fetchNewsData('finance', new CreditLedger());
  await expect(failure).rejects.toBeInstanceOf(NewsDataQuotaError);
  // NewsData sends 429 for the 15-minute rate limit as well as the daily
  // quota, so the message must not claim which one it was.
  await expect(failure).rejects.toThrow('rate limit or daily quota reached');
});

test('any other failed status is an ordinary error, not a quota error', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));

  const failure = fetchNewsData('finance', new CreditLedger());
  await expect(failure).rejects.toThrow('NewsData 500');
  await expect(failure).rejects.not.toBeInstanceOf(NewsDataQuotaError);
});

test('buildQuery drops the keyword that would push the query past the free-tier limit', () => {
  // hr-marketing's first five keywords: joined whole they are 108 characters,
  // and NewsData answered 422 on the first live run (2026-09-18).
  const query = buildQuery([
    'employer brand',
    'hiring manager',
    'employee value proposition',
    'talent attraction',
    'recruitment marketing',
  ]);

  expect(query).toBe('employer brand OR hiring manager OR employee value proposition OR talent attraction');
  expect(query.length).toBeLessThanOrEqual(MAX_QUERY_LENGTH);
});

test('buildQuery skips a keyword too long on its own and keeps the ones after it', () => {
  expect(buildQuery(['x'.repeat(MAX_QUERY_LENGTH + 1), 'audit'])).toBe('audit');
});

test('an empty query is refused before any credit is spent', async () => {
  const fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  const ledger = new CreditLedger();

  // An empty q would return untargeted news, which ingest would then tag with
  // the discipline it was querying for.
  await expect(fetchNewsData('', ledger)).rejects.toThrow('empty');
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(ledger.used).toBe(0);
});
