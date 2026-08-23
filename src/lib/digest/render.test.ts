// ABOUTME: Pins email rendering — feed text is third-party, so escaping and href safety are the point.
// ABOUTME: renderDigest is pure, so these run with no database, no network, and no astro:env stub.

import { test, expect } from 'vitest';
import { renderDigest, escapeHtml, safeUrl, type DigestSection } from './render';
import type { FeedItem } from '../types';

const NOW = new Date('2026-08-24T13:00:00Z'); // a Monday, 09:00 EDT
const UNSUB = 'https://news.example.ca/api/digest/unsubscribe?token=abc';

function item(over: Partial<FeedItem> = {}): FeedItem {
  return {
    id: 'h1',
    type: 'article',
    title: 'Rates hold steady',
    description: 'A short summary.',
    url: 'https://example.com/a',
    source: 'Reuters',
    publishedAt: '2026-08-21T10:00:00Z',
    discipline: 'Finance',
    disciplineId: 'finance',
    aiRelevant: false,
    sponsorId: null,
    ...over,
  };
}

const section = (over: Partial<DigestSection> = {}): DigestSection => ({
  disciplineLabel: 'Finance',
  items: [item()],
  ...over,
});

test('escapes markup so a feed title cannot inject into the email', () => {
  expect(escapeHtml('<script>alert(1)</script>')).toBe(
    '&lt;script&gt;alert(1)&lt;/script&gt;',
  );
  expect(escapeHtml(`M&A "deals" don't stop`)).toBe('M&amp;A &quot;deals&quot; don&#39;t stop');
});

test('a hostile feed title reaches the email as text, not as HTML', () => {
  const evil = '<a href="https://phish.example">Click here</a>';
  const { html } = renderDigest([section({ items: [item({ title: evil })] })], UNSUB, NOW);

  expect(html).toContain('&lt;a href=&quot;https://phish.example&quot;&gt;');
  expect(html).not.toContain('<a href="https://phish.example"');
});

test('safeUrl passes http(s) and refuses every other scheme', () => {
  expect(safeUrl('https://example.com/a')).toBe('https://example.com/a');
  expect(safeUrl('http://example.com/a')).toBe('http://example.com/a');
  for (const bad of ['javascript:alert(1)', 'data:text/html,<b>', 'file:///etc/passwd', 'not a url', '']) {
    expect(safeUrl(bad), bad).toBeNull();
  }
});

test('an unsafe link renders the headline without an href rather than dropping it', () => {
  const { html, text } = renderDigest(
    [section({ items: [item({ url: 'javascript:alert(1)' })] })],
    UNSUB,
    NOW,
  );
  expect(html).toContain('Rates hold steady');
  expect(html).not.toContain('javascript:');
  expect(text).not.toContain('javascript:');
});

test('every email carries a working unsubscribe link in both parts', () => {
  // CASL wants one in every commercial message, and the text part is what a
  // plain-text client shows — a link only in the HTML half is not a link.
  const { html, text } = renderDigest([section()], UNSUB, NOW);
  expect(html).toContain(UNSUB);
  expect(text).toContain(UNSUB);
});

test('never ships the article body — title, source, date and link only', () => {
  const body = 'FULL ARTICLE TEXT THAT WOULD BE REPUBLICATION';
  const { html, text } = renderDigest(
    [section({ items: [item({ description: body })] })],
    UNSUB,
    NOW,
  );
  expect(html).not.toContain(body);
  expect(text).not.toContain(body);
  expect(html).toContain('Reuters');
});

test('the send time is derived, never hardcoded, so it survives the DST switch', () => {
  const summer = renderDigest([section()], UNSUB, new Date('2026-08-24T13:00:00Z'));
  const winter = renderDigest([section()], UNSUB, new Date('2026-01-05T13:00:00Z'));
  expect(summer.text).toContain('EDT');
  expect(winter.text).toContain('EST');
});

test('renders each discipline it is given, and nothing it is not', () => {
  const { html } = renderDigest(
    [section(), section({ disciplineLabel: 'Tax', items: [item({ title: 'Budget lands' })] })],
    UNSUB,
    NOW,
  );
  expect(html).toContain('Finance');
  expect(html).toContain('Tax');
  expect(html).toContain('Budget lands');
  expect(html).not.toContain('Sustainability');
});

test('the subject carries the run date', () => {
  expect(renderDigest([section()], UNSUB, NOW).subject).toContain('2026');
});
