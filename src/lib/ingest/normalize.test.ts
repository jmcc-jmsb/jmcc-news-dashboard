// ABOUTME: Pins source normalization, French-outlet exclusion, URL canonicalisation, and dedupe.
// ABOUTME: These run before every database write, so a regression here corrupts stored rows.

import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  normalizeSource,
  isExcludedSource,
  canonicalUrl,
  cleanText,
  normalizeItem,
} from './normalize';
import { dedupeByIdAndDiscipline, duplicateCount } from './dedupe';
import { h } from '../format';

test('applies the source mappings named in brief §10', () => {
  assert.equal(normalizeSource('Wall Street Journal'), 'WSJ');
  assert.equal(normalizeSource('The Wall Street Journal'), 'WSJ');
  assert.equal(normalizeSource('The Globe and Mail'), 'Globe and Mail');
  assert.equal(normalizeSource('The Globe'), 'Globe and Mail');
  assert.equal(normalizeSource('BNN'), 'BNN Bloomberg');
});

test('collapses casing and whitespace variants of one outlet', () => {
  // The seed data itself contains both spellings of this one.
  assert.equal(normalizeSource('A16Z'), normalizeSource('a16z'));
  assert.equal(normalizeSource('  the   globe and mail '), 'Globe and Mail');
  assert.equal(normalizeSource('BOSTON CONSULTING GROUP'), 'BCG');
});

test('passes unknown outlets through instead of dropping them', () => {
  // An allowlist would silently discard legitimate new publishers, which is
  // the worse failure for a feed whose whole job is breadth.
  assert.equal(normalizeSource('Some New Outlet'), 'Some New Outlet');
  assert.equal(normalizeSource(''), 'Unknown');
});

test('excludes French-language outlets outright', () => {
  for (const o of [
    'La Presse',
    'Le Devoir',
    'Les Affaires',
    'Revenu Québec',
    'Radio-Canada',
    'ICI Radio-Canada',
    'Le Journal de Montréal',
  ]) {
    assert.ok(isExcludedSource(o), `${o} should be excluded`);
  }
});

test('does not exclude English outlets with similar names', () => {
  for (const o of ['Press Gazette', 'The Canadian Press', 'CBC', 'Bloomberg']) {
    assert.equal(isExcludedSource(o), false, `${o} should NOT be excluded`);
  }
});

test('canonicalUrl strips tracking so one story keeps one id', () => {
  const plain = 'https://example.com/a/b';
  assert.equal(canonicalUrl('https://example.com/a/b?utm_source=x&utm_medium=y'), plain);
  assert.equal(canonicalUrl('https://example.com/a/b#section'), plain);
  assert.equal(canonicalUrl('https://example.com/a/b/'), plain);
  assert.equal(canonicalUrl('https://example.com/a/b?fbclid=123'), plain);
  // The whole point: all of those must hash to the same primary key.
  assert.equal(h(canonicalUrl('https://example.com/a/b?utm_source=x')), h(plain));
});

test('canonicalUrl keeps parameters that identify the article', () => {
  assert.equal(canonicalUrl('https://example.com/story?id=42'), 'https://example.com/story?id=42');
});

test('cleanText strips HTML and truncates to a snippet', () => {
  assert.equal(cleanText('<p>Hello <b>world</b></p>'), 'Hello world');
  assert.equal(cleanText('A &amp; B &quot;quoted&quot;'), 'A & B "quoted"');
  assert.equal(cleanText(null), '');
  const long = cleanText('x'.repeat(900), 100);
  assert.ok(long.length <= 100, `snippet was ${long.length} chars`);
  assert.ok(long.endsWith('…'));
});

test('normalizeItem rejects unusable items rather than throwing', () => {
  const base = {
    title: 'A story',
    description: 'Something happened.',
    url: 'https://example.com/x',
    source: 'Reuters',
    publishedAt: '2026-05-22T13:14:00Z',
  };
  assert.ok(normalizeItem(base, 'finance', 'Finance'));
  assert.equal(normalizeItem({ ...base, title: '  ' }, 'finance', 'Finance'), null);
  assert.equal(normalizeItem({ ...base, url: '' }, 'finance', 'Finance'), null);
  assert.equal(normalizeItem({ ...base, publishedAt: 'not a date' }, 'finance', 'Finance'), null);
  assert.equal(normalizeItem({ ...base, source: 'La Presse' }, 'finance', 'Finance'), null);
});

test('normalizeItem sets the AI flag from the matcher, not from the caller', () => {
  const item = normalizeItem(
    {
      title: 'Deloitte rolls out generative-AI audit tool',
      description: '',
      url: 'https://example.com/ai',
      source: 'Reuters',
      publishedAt: '2026-05-22T13:14:00Z',
    },
    'accounting',
    'Accounting',
  );
  assert.equal(item?.aiRelevant, true);
});

test('dedupe collapses one story arriving from several queries', () => {
  const mk = (url: string, publishedAt: string, aiRelevant = false) => ({
    id: h(url), type: 'article' as const, title: 't', description: 'd', url,
    source: 'Reuters', publishedAt, discipline: 'Finance', disciplineId: 'finance' as const,
    aiRelevant, sponsorId: null,
  });
  const url = 'https://example.com/same';
  const batch = [
    mk(url, '2026-05-22T15:00:00Z'),
    mk(url, '2026-05-22T09:00:00Z'), // the original wire copy
    mk('https://example.com/other', '2026-05-22T10:00:00Z'),
  ];
  const out = dedupeByIdAndDiscipline(batch);
  assert.equal(out.length, 2);
  assert.equal(duplicateCount(batch), 1);
  // Earliest publication wins — the later one is a syndication.
  assert.equal(out.find((i) => i.url === url)?.publishedAt, '2026-05-22T09:00:00Z');
});

test('dedupe never loses an AI flag that only one copy carried', () => {
  const mk = (publishedAt: string, aiRelevant: boolean) => ({
    id: h('https://example.com/s'), type: 'article' as const, title: 't', description: 'd',
    url: 'https://example.com/s', source: 'Reuters', publishedAt,
    discipline: 'Finance', disciplineId: 'finance' as const, aiRelevant, sponsorId: null,
  });
  // Whichever order they arrive in, the surviving row is flagged.
  assert.equal(dedupeByIdAndDiscipline([mk('2026-05-22T09:00:00Z', false), mk('2026-05-22T15:00:00Z', true)])[0]?.aiRelevant, true);
  assert.equal(dedupeByIdAndDiscipline([mk('2026-05-22T15:00:00Z', true), mk('2026-05-22T09:00:00Z', false)])[0]?.aiRelevant, true);
});

/* The bug this replaced: keying on id alone meant a story matching several
   disciplines was collapsed to whichever one arrived first, silently. */
test('a story matching several disciplines survives as one row per discipline', () => {
  const url = 'https://example.com/multi';
  const mk = (disciplineId: 'finance' | 'strategy' | 'corporate-finance', discipline: string) => ({
    id: h(url), type: 'article' as const, title: 't', description: 'd', url,
    source: 'Reuters', publishedAt: '2026-05-22T09:00:00Z',
    discipline, disciplineId, aiRelevant: false, sponsorId: null,
  });
  const out = dedupeByIdAndDiscipline([
    mk('finance', 'Finance'),
    mk('strategy', 'Strategy'),
    mk('corporate-finance', 'Corporate Finance'),
  ]);
  assert.equal(out.length, 3);
  assert.deepEqual(out.map((i) => i.disciplineId).sort(), ['corporate-finance', 'finance', 'strategy']);
  // Same story throughout — only the discipline differs.
  assert.equal(new Set(out.map((i) => i.id)).size, 1);
});

test('a repeat within ONE discipline still collapses', () => {
  const url = 'https://example.com/dup';
  const mk = (disciplineId: 'finance' | 'strategy', publishedAt: string) => ({
    id: h(url), type: 'article' as const, title: 't', description: 'd', url,
    source: 'Reuters', publishedAt, discipline: 'x', disciplineId,
    aiRelevant: false, sponsorId: null,
  });
  const batch = [
    mk('finance', '2026-05-22T15:00:00Z'),
    mk('finance', '2026-05-22T09:00:00Z'),
    mk('strategy', '2026-05-22T15:00:00Z'),
  ];
  const out = dedupeByIdAndDiscipline(batch);
  assert.equal(out.length, 2);
  // Only the within-discipline repeat counts as a duplicate. A second
  // discipline is a second row, and must not inflate the run report.
  assert.equal(duplicateCount(batch), 1);
});

/* published_at and ai_relevant are facts about the URL, not about one
   discipline's copy, so they are resolved across every copy before the
   per-discipline rows are built. Otherwise the same headline could show two
   dates, or badge in finance and not in strategy. */
test('the earliest date and the AI flag apply across every discipline', () => {
  const url = 'https://example.com/wire';
  const mk = (disciplineId: 'finance' | 'strategy', publishedAt: string, aiRelevant: boolean) => ({
    id: h(url), type: 'article' as const, title: 't', description: 'd', url,
    source: 'Reuters', publishedAt, discipline: 'x', disciplineId, aiRelevant, sponsorId: null,
  });
  const out = dedupeByIdAndDiscipline([
    mk('finance', '2026-05-22T15:00:00Z', false),
    mk('strategy', '2026-05-22T09:00:00Z', true),
  ]);
  assert.equal(out.length, 2);
  for (const row of out) {
    assert.equal(row.publishedAt, '2026-05-22T09:00:00Z');
    assert.equal(row.aiRelevant, true);
  }
});

test('a deduped batch is safe to upsert — no (id, discipline) pair appears twice', () => {
  const mk = (u: string) => ({
    id: h(u), type: 'article' as const, title: 't', description: 'd', url: u,
    source: 'Reuters', publishedAt: '2026-05-22T09:00:00Z',
    discipline: 'Finance', disciplineId: 'finance' as const, aiRelevant: false, sponsorId: null,
  });
  const out = dedupeByIdAndDiscipline(['a', 'b', 'a', 'c', 'b', 'a'].map((x) => mk(`https://e.com/${x}`)));
  assert.equal(new Set(out.map((i) => `${i.id} ${i.disciplineId}`)).size, out.length);
  assert.equal(out.length, 3);
});
