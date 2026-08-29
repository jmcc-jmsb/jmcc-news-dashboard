// ABOUTME: Pins the shipped discipline keywords against real trade-press headlines and substring landmines.
// ABOUTME: Reads the arrays out of the retune migration, so editing that SQL is what this test guards.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { matchDisciplines } from './rss';
import type { RawItem } from './normalize';

/**
 * The keywords live in Postgres, not in a constant — news_discipline_topics is
 * shared with jmcc-portal and a coach can retune it without a deploy. So this
 * reads the migration that ships the defaults rather than restating them, which
 * would drift the moment someone edited one and not the other.
 */
function shippedTopics(): { discipline: string; keywords: string[] }[] {
  const sql = readFileSync(
    new URL('../../../supabase/migrations/20260828000004_news_topics_retune.sql', import.meta.url),
    'utf8',
  );
  const topics: { discipline: string; keywords: string[] }[] = [];
  for (const [, discipline, body] of sql.matchAll(
    /\('([a-z-]+)',\s*array\[([\s\S]*?)\],\s*'seed'\)/g,
  )) {
    topics.push({ discipline, keywords: [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]) });
  }
  return topics;
}

const TOPICS = shippedTopics();

function item(title: string, description = ''): RawItem {
  return { title, description, url: 'https://example.test/x', source: 'Test', publishedAt: '2026-08-28' };
}

describe('shipped discipline keywords', () => {
  it('covers all 11 disciplines', () => {
    expect(TOPICS.map((t) => t.discipline).sort()).toEqual([
      'accounting', 'digital-strategy', 'entrepreneurship', 'finance', 'hr',
      'international', 'marketing', 'pom', 'strategy', 'sustainability', 'tax',
    ]);
  });

  // One real headline per discipline, in the register the registered sources
  // actually write in — not the consulting-report phrasing the first seed
  // assumed. If a retune stops matching these, the feed goes quiet again.
  const HEADLINES: [string, string, string][] = [
    ['finance', 'Regional lender posts weaker quarterly results as interest rates bite', ''],
    ['accounting', 'Regulator proposes tighter internal controls after a string of restatements', ''],
    ['tax', 'Ottawa floats a higher capital gains inclusion rate for corporations', 'The Canada Revenue Agency would administer the change.'],
    ['marketing', 'Retailer shifts ad spend to influencer campaigns after loyalty program revamp', ''],
    ['strategy', 'Grocer to spin off its pharmacy arm in a bid to defend market share', 'The divestiture follows two years of restructuring.'],
    ['digital-strategy', 'Insurer finishes a four-year cloud migration off its legacy systems', ''],
    ['entrepreneurship', 'Montreal startup closes a seed round led by an angel investor', ''],
    ['hr', 'Manufacturer softens its return to office rule after a spike in turnover', ''],
    ['pom', 'Port congestion stretches lead times as freight rates climb again', ''],
    ['sustainability', 'Miner publishes scope 3 emissions for the first time under new climate disclosure rules', ''],
    ['international', 'New tariffs on steel imports reopen the trade war with two partners', ''],
  ];

  it.each(HEADLINES)('matches %s on a real headline', (discipline, title, description) => {
    expect(matchDisciplines(item(title, description), TOPICS)).toContain(discipline);
  });

  // matchDisciplines is a plain substring test, so a short keyword matches
  // inside unrelated words. The first seed shipped 'CRA', which fires on
  // "aircraft". These are the traps that were live or nearly so.
  const LANDMINES: [string, string][] = [
    ['tax', 'Aircraft maker lands a craft engine order'],
    ['tax', 'A taxonomy for classifying suppliers'],
    ['international', 'It is important to file on time'],
    ['hr', 'Costs fell through the quarter'],
    ['entrepreneurship', 'The series and the sequel both shipped'],
  ];

  it.each(LANDMINES)('does not match %s on "%s"', (discipline, title) => {
    expect(matchDisciplines(item(title), TOPICS)).not.toContain(discipline);
  });
});
