// ABOUTME: Pins query validation for the read APIs — discipline and limit both reach the database.
// ABOUTME: astro:env is stubbed because it is a virtual module that only exists during a build.

import { test, expect, vi } from 'vitest';

vi.mock('astro:env/client', () => ({
  PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pk',
  PUBLIC_USE_FIXTURES: false,
}));
vi.mock('astro:env/server', () => ({ SUPABASE_SECRET_KEY: 'sk' }));

const { parseFeedQuery, MAX_LIMIT } = await import('./_shared');

const q = (search: string) => parseFeedQuery(new URL(`https://x.test/api/news${search}`));

test('defaults to finance with a sane limit', () => {
  expect(q('')).toEqual({ discipline: 'finance', limit: 24, aiOnly: false });
});

test('accepts every canonical discipline id', () => {
  for (const d of [
    'finance', 'accounting', 'tax', 'marketing', 'strategy', 'digital-strategy',
    'entrepreneurship', 'hr', 'pom', 'sustainability', 'international',
  ]) {
    expect(q(`?discipline=${d}`)).toMatchObject({ discipline: d });
  }
});

test('rejects an unknown discipline instead of passing it to the query', () => {
  // This value reaches a database filter, so it is validated against the
  // canonical list rather than trusted.
  for (const bad of ['', 'Finance', 'finance; drop table', '../etc', 'null', 'undefined']) {
    expect(q(`?discipline=${encodeURIComponent(bad)}`)).toHaveProperty('error');
  }
});

test('rejects limits that are not sane integers', () => {
  for (const bad of ['0', '-1', '1.5', 'abc', String(MAX_LIMIT + 1), '1e3', 'Infinity', 'NaN']) {
    expect(q(`?limit=${encodeURIComponent(bad)}`), `limit=${bad}`).toHaveProperty('error');
  }
});

test('accepts limits at both ends of the allowed range', () => {
  expect(q('?limit=1')).toMatchObject({ limit: 1 });
  expect(q(`?limit=${MAX_LIMIT}`)).toMatchObject({ limit: MAX_LIMIT });
});

test('the AI filter is opt-in and only on an exact flag', () => {
  expect(q('?ai=1')).toMatchObject({ aiOnly: true });
  for (const v of ['0', 'true', 'yes', '']) {
    expect(q(`?ai=${v}`), `ai=${v}`).toMatchObject({ aiOnly: false });
  }
});
