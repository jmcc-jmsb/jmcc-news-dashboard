// ABOUTME: Pins the shipped discipline keywords against real trade-press headlines and substring landmines.
// ABOUTME: Reads the arrays out of both topic migrations, so editing that SQL is what this test guards.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { matchDisciplines } from './rss';
import { DISCIPLINES } from '../disciplines';
import type { RawItem } from './normalize';

/**
 * The keywords live in Postgres, not in a constant — news_discipline_topics is
 * shared with jmcc-portal and a coach can retune it without a deploy. So this
 * reads the migration that ships the defaults rather than restating them, which
 * would drift the moment someone edited one and not the other.
 */
const MIGRATIONS = [
  '20260828000004_news_topics_retune.sql',        // the 11 JDC/JDCC disciplines
  '20260829000006_competition_discipline_topics.sql', // SMNG, FO and HM
  '20260919000008_international_competition_topics.sql', // the six international competitions
];

function shippedTopics(): { discipline: string; keywords: string[] }[] {
  const topics: { discipline: string; keywords: string[] }[] = [];
  for (const file of MIGRATIONS) {
    const sql = readFileSync(
      new URL(`../../../supabase/migrations/${file}`, import.meta.url),
      'utf8',
    );
    /* [a-z0-9-], not [a-z-]. The narrower class silently SKIPPED b2b-marketing
       — the only id with a digit — and the test still went green, which is the
       worst failure a pinning test can have: it stops pinning and says
       nothing. Any future id with a digit is covered now. */
    for (const [, discipline, body] of sql.matchAll(
      /\('([a-z0-9-]+)',\s*array\[([\s\S]*?)\],\s*'seed'\)/g,
    )) {
      topics.push({ discipline, keywords: [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]) });
    }
  }
  return topics;
}

const TOPICS = shippedTopics();

function item(title: string, description = ''): RawItem {
  return { title, description, url: 'https://example.test/x', source: 'Test', publishedAt: '2026-08-28' };
}

describe('shipped discipline keywords', () => {
  /* Checked against the registry rather than a copied list, so adding a
     discipline without shipping its keywords fails here instead of shipping a
     pill that renders a permanently empty feed. */
  it('ships keywords for every registered discipline', () => {
    expect(TOPICS.map((t) => t.discipline).sort()).toEqual(
      DISCIPLINES.map((d) => d.id as string).sort(),
    );
  });

  it('gives every discipline a non-empty keyword set', () => {
    for (const t of TOPICS) expect(t.keywords.length, t.discipline).toBeGreaterThan(0);
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

    // ── SMNG ──
    ['human-resource-management', 'Grocer and union reach a collective agreement after nine months', ''],
    ['change-management', 'Insurer announces a reorganization of its claims division', ''],
    ['digital-transformation', 'Retailer finishes an ERP implementation four years in the making', ''],
    ['project-management', 'Transit extension runs over budget again as the timeline slips', ''],
    ['mergers-acquisitions', 'Telecom announces the acquisition of a regional fibre operator', ''],
    ['management-of-smes', 'Small business owners say credit is tightening across the province', ''],
    ['market-targeting', 'Brewer narrows its target market after a segmentation study', ''],

    // ── FO ──
    ['personal-finance', 'Household debt hits a record as mortgage rates reset', ''],
    ['corporate-finance', 'Miner refinances a term loan and renegotiates a covenant', ''],
    ['financial-markets', 'The TSX closes higher as bond yields retreat', ''],
    ['taxation', 'Ottawa tightens transfer pricing rules ahead of tax season', ''],
    ['financial-accounting', 'Regulator questions revenue recognition in a restated income statement', ''],
    ['management-accounting', 'Manufacturer overhauls cost allocation after a variance analysis', ''],
    ['stock-market-simulation', 'Pension fund shifts asset allocation and trims its derivatives book', ''],
    ['cfa-ethics-challenge', 'Regulator settles an insider trading case over material nonpublic information', ''],

    // ── HM ──
    ['strategic-marketing', 'Airline reworks its brand positioning ahead of a product launch', ''],
    ['experiential-marketing', 'Retailer opens a pop-up shop as its main brand activation this year', ''],
    ['digital-marketing', 'Advertisers shift budget to retail media and programmatic buying', ''],
    ['b2b-marketing', 'Software vendor leans on account-based marketing to fill its sales pipeline', ''],
    ['international-marketing', 'Coffee chain plans a market entry into three emerging markets', ''],
    ['hr-marketing', 'Bank rebuilds its employer brand and career site to attract candidates', ''],
    ['request-for-agency-proposal', 'Automaker launches an agency review and issues an RFP', ''],

    // ── International — the strategy register, plus Eller's ethics one ──
    ['tubc', 'Conglomerate plans a market entry into two emerging markets', ''],
    ['hicc', 'Retail chain names a turnaround plan after a weak quarterly results print', ''],
    ['micc', 'Streaming firm rewrites its business model as the technology sector consolidates', ''],
    ['unicc', 'European commission clears a cross-border joint venture', ''],
    ['bbicc', 'Government revives a privatization of the state telecom operator', ''],
    ['eller', 'Board of directors opens an ethics investigation after a whistleblower complaint', ''],
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
