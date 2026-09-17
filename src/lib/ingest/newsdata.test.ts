// ABOUTME: Pins the two ways NewsData spending stops: our own credit ceiling, and NewsData's 429 quota response.
// ABOUTME: Each has its own error type so runIngest can stop querying NewsData without aborting the run.

import { afterEach, expect, test, vi } from 'vitest';

// astro:env/server is a virtual module supplied by Astro's build; under vitest
// it does not exist, so the key is stubbed.
vi.mock('astro:env/server', () => ({ NEWSDATA_API_KEY: 'test-key' }));

const { CreditLedger, CreditCeilingError, NewsDataQuotaError, fetchNewsData } = await import('./newsdata');

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

test('a 429 from NewsData is a NewsDataQuotaError, because the quota is gone for the day', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })));

  await expect(fetchNewsData('finance', new CreditLedger())).rejects.toBeInstanceOf(NewsDataQuotaError);
});

test('any other failed status is an ordinary error, not a quota error', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));

  const failure = fetchNewsData('finance', new CreditLedger());
  await expect(failure).rejects.toThrow('NewsData 500');
  await expect(failure).rejects.not.toBeInstanceOf(NewsDataQuotaError);
});
