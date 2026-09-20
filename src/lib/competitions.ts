// ABOUTME: zod schema and loader for src/content/competitions.json — the four competition sections.
// ABOUTME: A section owns a discipline list; the discipline registry itself lives in disciplines.ts.

import { z } from 'zod';
import competitionsJson from '../content/competitions.json';

/* One event within a section — an actual competition a delegation travels to.
   JDC and JDCC are two events in one section; the REFAEC three are one each. */
const eventSchema = z
  .object({
    slug: z.string().min(1),
    name: z.string().min(1),
    location: z.string().min(1),
    /** Nullable: BBICC has no public site in the website's registry yet, and
     *  inventing one would be worse than a name with no link. */
    url: z.url().nullable(),
    /** This event's own news disciplines. May be a subset of the section's. */
    disciplines: z.array(z.string().min(1)),
  })
  .strict();

const sectionSchema = z
  .object({
    label: z.string().min(1),
    blurb: z.string().min(1),
    events: z.array(eventSchema).min(1),
    /** The union of the section's events, sorted. What the pills render from. */
    disciplines: z.array(z.string().min(1)).min(1),
  })
  .strict();

const competitionsSchema = z.record(z.string().min(1), sectionSchema);

export type CompetitionEvent = z.infer<typeof eventSchema>;
export type CompetitionSection = z.infer<typeof sectionSchema> & { id: string };

const parsed = competitionsSchema.safeParse(competitionsJson);

if (!parsed.success) {
  throw new Error(
    'src/content/competitions.json is invalid. Each section needs a label, a ' +
      'blurb, at least one event, and a discipline list.\n\n' +
      z.prettifyError(parsed.error),
  );
}

export const COMPETITIONS: CompetitionSection[] = Object.entries(parsed.data).map(
  ([id, section]) => ({ ...section, id }),
);

export const COMPETITION_IDS = COMPETITIONS.map((c) => c.id);

/* JDC/JDCC is the default because it is the broadest section and the one the
   dashboard shipped as before competitions existed — its eleven disciplines
   are exactly the original eleven, which is why this change is additive rather
   than a renumbering. */
export const DEFAULT_COMPETITION = 'jdc';

export function isCompetitionId(value: string): boolean {
  return COMPETITION_IDS.includes(value);
}

export function competitionFor(id: string): CompetitionSection | undefined {
  return COMPETITIONS.find((c) => c.id === id);
}

/**
 * Which events in a section actually cover a discipline.
 *
 * JDCC runs nine of JDC's eleven — it has no tax, operations or sustainability
 * case. Rather than hide that or average it away, the UI can say which of the
 * two events a discipline belongs to, so a delegate heading to St. Catharines
 * is not preparing for a case that is not on their schedule.
 */
export function eventsCovering(section: CompetitionSection, discipline: string): CompetitionEvent[] {
  return section.events.filter((e) => e.disciplines.includes(discipline));
}

/** Every discipline id referenced by any section, deduped. */
export const ALL_COMPETITION_DISCIPLINE_IDS = [
  ...new Set(COMPETITIONS.flatMap((c) => c.disciplines)),
];
