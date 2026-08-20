// ABOUTME: Pins the cron guard. These endpoints are publicly reachable, so this is the only thing protecting them.
// ABOUTME: Uses vi.mock because CRON_SECRET comes from astro:env/server, which does not exist outside a build.

import { test, expect, vi, beforeEach } from 'vitest';

// astro:env/server is a virtual module supplied by Astro's build. Under vitest
// there is no build, so it is stubbed. The value below is the "configured
// secret" every case in this file is checked against.
const SECRET = 'correct-horse-battery-staple';
vi.mock('astro:env/server', () => ({ CRON_SECRET: SECRET }));

let isAuthorizedCron: (r: Request) => boolean;
let unauthorized: () => Response;

beforeEach(async () => {
  ({ isAuthorizedCron, unauthorized } = await import('./cron-auth'));
});

const req = (auth?: string) =>
  new Request('https://news.jmccjmsb.ca/api/cron/ingest', {
    headers: auth === undefined ? {} : { authorization: auth },
  });

test('accepts the configured secret as a bearer token', () => {
  expect(isAuthorizedCron(req(`Bearer ${SECRET}`))).toBe(true);
});

test('rejects everything else', () => {
  const cases: (string | undefined)[] = [
    undefined,                       // no header at all
    '',                              // empty header
    SECRET,                          // right secret, missing the Bearer scheme
    `Bearer  ${SECRET}`,             // doubled space becomes a leading space in the value
    'Bearer wrong-secret-entirely',
    `Bearer ${SECRET.slice(0, -1)}`, // one character short
    `Bearer ${SECRET}x`,             // one character long
    `Basic ${SECRET}`,               // wrong scheme
    `bearer ${SECRET}`,              // lowercase scheme is not what Vercel sends
  ];
  for (const c of cases) {
    expect(isAuthorizedCron(req(c)), `should reject: ${JSON.stringify(c)}`).toBe(false);
  }
});

test('surrounding whitespace is trimmed by the Fetch layer, not by us', () => {
  // `Bearer ${SECRET} ` IS accepted, and that is correct: per the Fetch spec,
  // header values are stripped of leading and trailing whitespace before they
  // are ever readable, so the trailing space never reaches the comparison.
  // Asserted rather than assumed — an earlier version of this file expected a
  // rejection here and was wrong about where the trimming happens.
  expect(req(`Bearer ${SECRET} `).headers.get('authorization')).toBe(`Bearer ${SECRET}`);
  expect(isAuthorizedCron(req(`Bearer ${SECRET} `))).toBe(true);

  // Interior whitespace is not trimmed, so it still fails.
  expect(isAuthorizedCron(req(`Bearer ${SECRET.replace('-', ' ')}`))).toBe(false);
});

test('a prefix of the secret never authorizes', () => {
  // The reason the comparison is constant-time: if it short-circuited on the
  // first differing byte, these would be distinguishable by timing and the
  // token could be recovered one character at a time.
  for (let i = 1; i < SECRET.length; i++) {
    expect(isAuthorizedCron(req(`Bearer ${SECRET.slice(0, i)}`))).toBe(false);
  }
});

test('401 body leaks nothing about why it failed', async () => {
  const res = unauthorized();
  expect(res.status).toBe(401);
  const body = await res.text();
  expect(body).not.toContain(SECRET);
  // "wrong secret" vs "no secret configured" would tell an attacker which half
  // of the problem they have already solved.
  expect(JSON.parse(body)).toEqual({ error: 'Unauthorized' });
});

test('fails closed when CRON_SECRET is not configured', async () => {
  // A deployment that forgets the secret must not become an open endpoint that
  // anyone can use to burn the daily NewsData quota or send real email.
  vi.resetModules();
  vi.doMock('astro:env/server', () => ({ CRON_SECRET: undefined }));
  const mod = await import('./cron-auth');

  expect(mod.isAuthorizedCron(req('Bearer anything'))).toBe(false);
  expect(mod.isAuthorizedCron(req('Bearer '))).toBe(false);
  expect(mod.isAuthorizedCron(req())).toBe(false);
});
