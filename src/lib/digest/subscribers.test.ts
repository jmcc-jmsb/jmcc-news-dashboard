// ABOUTME: Pins the subscribe body parser — it is the trust boundary in front of a public write.
// ABOUTME: astro:env is stubbed because it is a virtual module that only exists during a build.

import { test, expect, vi } from 'vitest';

vi.mock('astro:env/client', () => ({
  PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pk',
  PUBLIC_USE_FIXTURES: false,
}));
vi.mock('astro:env/server', () => ({ SUPABASE_SECRET_KEY: 'sk' }));

const { subscribeSchema, isUuid } = await import('./subscribers');

const parse = (body: unknown) => subscribeSchema.safeParse(body);
const ok = (body: unknown) => {
  const r = parse(body);
  if (!r.success) throw new Error(`expected valid: ${r.error.issues[0]?.message}`);
  return r.data;
};

test('lowercases and trims the email, because it is the primary key', () => {
  // Ana@x.ca and ana@x.ca must not become two rows that both get the digest.
  expect(ok({ email: '  Ana.B@Johnmolson.CA ', disciplines: ['finance'] }).email).toBe(
    'ana.b@johnmolson.ca',
  );
});

test('rejects anything that is not an email address', () => {
  for (const bad of ['', 'ana', 'ana@', '@x.ca', 'ana x@x.ca', 'ana@x', null, 42, {}, []]) {
    expect(parse({ email: bad, disciplines: ['finance'] }).success, String(bad)).toBe(false);
  }
});

test('rejects an absurdly long address before it reaches a text primary key', () => {
  expect(parse({ email: `${'a'.repeat(250)}@x.ca`, disciplines: ['finance'] }).success).toBe(false);
});

test('accepts every canonical discipline id and rejects everything else', () => {
  expect(ok({ email: 'a@x.ca', disciplines: ['finance', 'pom', 'international'] }).disciplines)
    .toEqual(['finance', 'pom', 'international']);

  for (const bad of ['Finance', 'consulting', '', 'finance; drop table', 1, null]) {
    expect(parse({ email: 'a@x.ca', disciplines: [bad] }).success, String(bad)).toBe(false);
  }
});

test('requires at least one discipline — an empty subscription still stores an address', () => {
  expect(parse({ email: 'a@x.ca', disciplines: [] }).success).toBe(false);
});

test('rejects a disciplines field that is not an array', () => {
  for (const bad of ['finance', { finance: true }, null, undefined]) {
    expect(parse({ email: 'a@x.ca', disciplines: bad }).success, String(bad)).toBe(false);
  }
});

test('dedupes repeated ids rather than storing them twice', () => {
  expect(ok({ email: 'a@x.ca', disciplines: ['finance', 'finance', 'tax'] }).disciplines).toEqual([
    'finance',
    'tax',
  ]);
});

test('caps the list at the canonical eleven', () => {
  const flood = Array.from({ length: 200 }, () => 'finance');
  expect(parse({ email: 'a@x.ca', disciplines: flood }).success).toBe(false);
});

test('isUuid gates the unsubscribe token before it reaches a uuid comparison', () => {
  // Postgres raises on a malformed uuid, so a truncated link would 500.
  expect(isUuid('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(true);
  expect(isUuid('3F2504E0-4F89-41D3-9A0C-0305E82C3301')).toBe(true);
  for (const bad of ['', 'abc', '3f2504e0-4f89-41d3-9a0c', "' or 1=1--", '3f2504e04f8941d39a0c0305e82c3301']) {
    expect(isUuid(bad), bad).toBe(false);
  }
});
