// ABOUTME: Pins metricComparisons() — the grouping rule behind the sponsor comparison charts.
// ABOUTME: Guards the two ways a bar chart can lie: mismatched units, and non-magnitude figures.

import { test, beforeEach, vi } from 'vitest';
import assert from 'node:assert/strict';
import type { MetricComparison, SponsorProfile } from './sponsors';

// astro:env/client is a virtual module supplied by Astro's build; under vitest
// there is no build. False means the loader validates the real (empty)
// sponsors.json, which is also what production does.
vi.mock('astro:env/client', () => ({ PUBLIC_USE_FIXTURES: false }));

let metricComparisons: (s: Array<SponsorProfile & { id: string }>) => MetricComparison[];

beforeEach(async () => {
  ({ metricComparisons } = await import('./sponsors'));
});

function sponsor(id: string, metrics: SponsorProfile['metrics']) {
  return {
    id,
    status: 'published' as const,
    name: id,
    sector: 'x',
    hq: 'x',
    website: 'https://example.com',
    competitions: [],
    asOf: '2026-08-29',
    summary: 'x',
    metrics,
    goals: [],
    values: [],
    sources: [],
  };
}

const SRC = 'https://example.com/s';

test('a metric only one sponsor reports never becomes a one-bar chart', () => {
  const out = metricComparisons([
    sponsor('a', [{ label: 'Revenue', value: 1, unit: 'B CAD', source: SRC }]),
    sponsor('b', [{ label: 'Backlog', value: 2, unit: 'B CAD', source: SRC }]),
  ]);
  assert.deepEqual(out, []);
});

test('a shared label in a shared unit charts, sorted high to low', () => {
  const out = metricComparisons([
    sponsor('small', [{ label: 'Revenue', value: 0.9, unit: 'B CAD', source: SRC }]),
    sponsor('big', [{ label: 'Revenue', value: 4.1, unit: 'B CAD', source: SRC }]),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].label, 'Revenue');
  assert.equal(out[0].unit, 'B CAD');
  assert.deepEqual(
    out[0].bars.map((b) => b.name),
    ['big', 'small'],
  );
});

/* The same label in two currencies is not one chart. Plotting 4.1 B CAD beside
   3.9 B USD as if the taller bar were the bigger company is a wrong answer
   presented as a picture, which is worse than no picture. */
test('the same label in different units does not chart together', () => {
  const out = metricComparisons([
    sponsor('a', [{ label: 'Revenue', value: 4.1, unit: 'B CAD', source: SRC }]),
    sponsor('b', [{ label: 'Revenue', value: 3.9, unit: 'B USD', source: SRC }]),
  ]);
  assert.deepEqual(out, []);
});

test('unitless counts still chart when two sponsors share the label', () => {
  const out = metricComparisons([
    sponsor('a', [{ label: 'Headcount', value: 2100, source: SRC }]),
    sponsor('b', [{ label: 'Headcount', value: 12400, source: SRC }]),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].unit, undefined);
  assert.equal(out[0].bars[0].value, 12400);
});
