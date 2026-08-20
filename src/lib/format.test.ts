// ABOUTME: Pins h() — the ingest dedupe key — plus the specs status gating.
// ABOUTME: Run with `npm test`. If h() changes, every stored article id changes and ingest re-inserts the feed.

import { test } from 'vitest';
import assert from 'node:assert/strict';
import { h, absDate, relTime } from './format';

/* These expectations were produced by the prototype's implementation, not by
   this one. That is the point: they fail if the port drifted. The fixture URLs
   are the real ones lib/fixtures.ts builds. */
test('h() is stable for known fixture URLs', () => {
  assert.equal(h('https://news.example.com/finance/1'), 'xit35jy');
  assert.equal(h('https://news.example.com/finance/2'), 'xit35jz');
  assert.equal(h('https://news.example.com/hr/1'), 'x1ou1yu');
  assert.equal(h('https://bcg.example.com/finance/1'), 'xg9wmj7');
});

test('h() is deterministic and collision-free across all fixture urls', () => {
  const urls: string[] = [];
  const ids = [
    'finance', 'accounting', 'tax', 'marketing', 'strategy', 'digital-strategy',
    'entrepreneurship', 'hr', 'pom', 'sustainability', 'international',
  ];
  for (const d of ids) {
    for (let i = 1; i <= 40; i++) urls.push(`https://news.example.com/${d}/${i}`);
  }
  const hashes = urls.map(h);
  assert.equal(new Set(hashes).size, hashes.length, 'h() collided across fixture URLs');
  assert.deepEqual(hashes, urls.map(h), 'h() is not deterministic');
});

test('h() output is always a safe primary key', () => {
  for (const s of ['', 'https://a.example/x?y=1&z=2', 'ünïcødé', 'a'.repeat(500)]) {
    assert.match(h(s), /^x[0-9a-z]+$/, `h(${JSON.stringify(s)}) is not [0-9a-z]`);
  }
});

test('relTime degrades from minutes to a short date', () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
  // Minutes are rounded, so "just now" is anything under 30 seconds, not under a minute.
  assert.equal(relTime(ago(10_000)), 'just now');
  assert.equal(relTime(ago(5 * 60_000)), '5m ago');
  assert.equal(relTime(ago(3 * 3_600_000)), '3h ago');
  assert.equal(relTime(ago(2 * 86_400_000)), '2d ago');
  assert.equal(relTime(ago(14 * 86_400_000)), '2w ago');
  // Past ~5 weeks it stops counting and prints a date instead.
  assert.match(relTime('2020-01-15T00:00:00Z'), /Jan/);
});

test('absDate renders en-CA regardless of host locale', () => {
  assert.match(absDate('2026-05-22T13:14:00Z'), /2026/);
});

/* The digest cron is a fixed 13:00 UTC, but Eastern is UTC-4 on daylight time
   and UTC-5 otherwise. These pin BOTH sides, because the subscribe panel shows
   this string to subscribers as a promise — a hardcoded hour would be wrong for
   roughly half the year, and wrong in a way nobody notices until someone
   complains their digest arrived an hour early. */
test('digest label follows Eastern daylight time in both directions', async () => {
  const { digestSendLabel, nextDigestSend } = await import('./format.ts');

  // Mid-summer: Eastern is on daylight time, so 13:00 UTC is 09:00 local.
  assert.equal(digestSendLabel(new Date('2026-07-15T00:00:00Z')), 'Monday, 9:00 a.m. EDT');

  // Launch month, after clocks fall back: 13:00 UTC is 08:00 local, which is
  // exactly the 8:00 AM the product promises.
  assert.equal(digestSendLabel(new Date('2026-11-15T00:00:00Z')), 'Monday, 8:00 a.m. EST');

  // The instant itself never moves — only its local name does.
  assert.equal(nextDigestSend(new Date('2026-07-15T00:00:00Z')).toISOString(), '2026-07-20T13:00:00.000Z');
  assert.equal(nextDigestSend(new Date('2026-11-15T00:00:00Z')).toISOString(), '2026-11-16T13:00:00.000Z');
});

test('nextDigestSend always lands on a future Monday', async () => {
  const { nextDigestSend } = await import('./format.ts');
  for (const iso of ['2026-11-16T12:59:00Z', '2026-11-16T13:00:01Z', '2026-11-17T00:00:00Z', '2026-11-22T23:59:00Z']) {
    const now = new Date(iso);
    const next = nextDigestSend(now);
    assert.equal(next.getUTCDay(), 1, `${iso} did not resolve to a Monday`);
    assert.equal(next.getUTCHours(), 13);
    assert.ok(next.getTime() > now.getTime(), `${iso} resolved to a past send`);
  }
});
