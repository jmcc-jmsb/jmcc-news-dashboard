// ABOUTME: zod schema and loader for src/content/sponsors.json — validated at build time, not at render.
// ABOUTME: Only 'published' sponsors render; if none are, the Sponsor Tracker tab hides itself.

import { z } from 'zod';
import { PUBLIC_USE_FIXTURES } from 'astro:env/client';
import sponsorsJson from '../content/sponsors.json';
import sampleSponsorsJson from '../content/sponsors.sample.json';

/* One number a delegate can cite, with the page it came from.
   `source` is required and `asOf` sits on the sponsor: a revenue figure with no
   date and no link is the kind of thing that gets repeated in a case pitch and
   then falls apart under a judge's question. */
const metricSchema = z
  .object({
    label: z.string().min(1),
    value: z.number(),
    /** Omitted for plain counts — headcount, offices, locations. */
    unit: z.string().min(1).optional(),
    source: z.url(),
    note: z.string().min(1).optional(),
  })
  .strict();

/* Unlike specs.json this is an OPEN set — sponsors are not a fixed list of 11,
   they arrive as sponsorship closes. So it is a record, not a fixed-key object,
   and adding one is a content edit rather than a code change. */
const sponsorSchema = z
  .object({
    status: z.enum(['draft', 'review', 'published']),
    name: z.string().min(1),
    legalName: z.string().min(1).optional(),
    sector: z.string().min(1),
    hq: z.string().min(1),
    /* Not a metric. A bar drawn from zero to 1988 would say a company founded
       in 1988 is "twice" one founded in 994, which is not a fact about
       anything — so the one obvious non-magnitude gets its own field and
       everything in `metrics` stays safe to chart and safe to group-format. */
    founded: z.number().int().min(1000).max(2999).optional(),
    website: z.url(),
    /** Which JMCC competitions this company sponsors, as free text. */
    competitions: z.array(z.string().min(1)),
    /** YYYY-MM-DD. Every figure on the card is "as of" this date. */
    asOf: z.iso.date(),
    summary: z.string().min(1),
    metrics: z.array(metricSchema),
    goals: z.array(z.string().min(1)),
    values: z.array(z.string().min(1)),
    sources: z.array(z.url()),
  })
  .strict();

const sponsorsSchema = z.record(z.string().min(1), sponsorSchema);

export type SponsorMetric = z.infer<typeof metricSchema>;
export type SponsorProfile = z.infer<typeof sponsorSchema>;

/* Sample profiles are invented companies with example.com sources, kept in a
   separate file so the real one can sit empty without a placeholder in it. The
   flag is the same one the feed uses and is false by default; when it is on,
   the view banners itself (AGENTS.md, The read path). */
const source = PUBLIC_USE_FIXTURES ? sampleSponsorsJson : sponsorsJson;
const parsed = sponsorsSchema.safeParse(source);

if (!parsed.success) {
  // Thrown at module load, so `astro build` fails rather than rendering a
  // half-valid sponsor. The owner edits this file by hand, so the message
  // describes the file rather than the zod error shape.
  throw new Error(
    'src/content/sponsors.json is invalid. Each sponsor needs a status of ' +
      'draft | review | published, a name, sector, hq, website, asOf date, ' +
      'summary, and the competitions / metrics / goals / values / sources ' +
      'arrays. Every metric needs a source URL.\n\n' +
      z.prettifyError(parsed.error),
  );
}

export const SPONSORS = parsed.data;

export const USING_SAMPLE_SPONSORS = PUBLIC_USE_FIXTURES;

/** Published only. draft/review are counted but never rendered as content —
 *  the same rule Technical Specs follows (AGENTS.md). */
export const PUBLISHED_SPONSORS: Array<SponsorProfile & { id: string }> = Object.entries(SPONSORS)
  .filter(([, s]) => s.status === 'published')
  .map(([id, s]) => ({ ...s, id }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en-CA'));

/** Sponsors the owner has started but not published, for the "in development"
 *  line. A count, never their names — an unannounced sponsor is confidential. */
export const IN_DEVELOPMENT_COUNT = Object.values(SPONSORS).filter(
  (s) => s.status !== 'published',
).length;

/** Drives whether the Sponsor Tracker tab exists at all. Ships false: the tab
 *  appears on its own once the owner publishes a sponsor, with no code change. */
export const HAS_ANY_PUBLISHED_SPONSORS = PUBLISHED_SPONSORS.length > 0;

/**
 * Metrics worth charting side by side: a label two or more published sponsors
 * both report, in the same unit.
 *
 * Deriving this from the content rather than configuring it means adding a
 * sponsor that reports "Revenue" puts it on the revenue chart automatically,
 * and a metric only one sponsor reports stays on that sponsor's own card
 * instead of becoming a one-bar chart.
 *
 * A label reported in two different units (B CAD and B USD) is NOT comparable,
 * so those bars would be a lie — the unit is part of the grouping key.
 *
 * Everything in `metrics` is a magnitude by construction (see `founded`), so
 * every group here is safe to draw as a bar from zero.
 */
export interface MetricComparison {
  label: string;
  unit?: string;
  bars: Array<{ id: string; name: string; value: number }>;
}

export function metricComparisons(
  sponsors: Array<SponsorProfile & { id: string }> = PUBLISHED_SPONSORS,
): MetricComparison[] {
  const groups = new Map<string, MetricComparison>();

  for (const s of sponsors) {
    for (const m of s.metrics) {
      const key = `${m.label} ${m.unit ?? ''}`;
      const group = groups.get(key) ?? { label: m.label, unit: m.unit, bars: [] };
      group.bars.push({ id: s.id, name: s.name, value: m.value });
      groups.set(key, group);
    }
  }

  return [...groups.values()]
    .filter((g) => g.bars.length > 1)
    .map((g) => ({ ...g, bars: [...g.bars].sort((a, b) => b.value - a.value) }));
}
