// ABOUTME: Pins the status the ingest cron answers, which is what Vercel's cron history shows as pass or fail.
// ABOUTME: A run that saved nothing is a failure: a feed with zero updates must never read as green.

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { IngestReport } from '../../../lib/ingest/run';

vi.mock('../../../lib/cron-auth', () => ({
  isAuthorizedCron: () => true,
  unauthorized: () => new Response('', { status: 401 }),
}));
vi.mock('../../../lib/ingest/run', () => ({ runIngest: vi.fn() }));

const { runIngest } = await import('../../../lib/ingest/run');
const { GET } = await import('./ingest');

function report(overrides: Partial<IngestReport>): IngestReport {
  return {
    startedAt: '2026-09-17T11:00:00.000Z',
    finishedAt: '2026-09-17T11:00:30.000Z',
    creditsUsed: 66,
    newsDataSkipped: 0,
    newsDataDeferred: 0,
    fetched: 10,
    duplicates: 0,
    rejected: 0,
    upserted: 10,
    sourceErrors: [],
    disciplinesCovered: ['finance'],
    ...overrides,
  };
}

const call = () =>
  GET({ request: new Request('https://news.wecompete.ca/api/cron/ingest') } as Parameters<typeof GET>[0]);

beforeEach(() => {
  // The route logs every run; silenced so test output stays clean.
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('a clean run that saved rows answers 200', async () => {
  vi.mocked(runIngest).mockResolvedValue(report({}));

  expect((await call()).status).toBe(200);
});

test('a run that saved rows despite failing sources answers 207', async () => {
  vi.mocked(runIngest).mockResolvedValue(
    report({ sourceErrors: [{ name: 'NewsData', error: 'credit ceiling reached (3 queries skipped)' }] }),
  );

  expect((await call()).status).toBe(207);
});

test('a run that saved nothing answers 500 and still returns the report', async () => {
  vi.mocked(runIngest).mockResolvedValue(
    report({
      fetched: 0,
      upserted: 0,
      sourceErrors: [{ name: 'NewsData', error: 'credit ceiling reached (33 queries skipped)' }],
    }),
  );

  const res = await call();

  expect(res.status).toBe(500);
  expect(await res.json()).toMatchObject({ upserted: 0, sourceErrors: [{ name: 'NewsData' }] });
  expect(console.error).toHaveBeenCalled();
});

test('a run that saved nothing with no source errors is still a failure', async () => {
  vi.mocked(runIngest).mockResolvedValue(report({ fetched: 0, upserted: 0 }));

  expect((await call()).status).toBe(500);
});

test('a run that throws answers 500', async () => {
  vi.mocked(runIngest).mockRejectedValue(new Error('Cannot read news_discipline_topics: boom'));

  const res = await call();

  expect(res.status).toBe(500);
  expect(await res.json()).toMatchObject({ error: 'Ingest failed' });
});
