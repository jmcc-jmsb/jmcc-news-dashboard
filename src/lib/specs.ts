// ABOUTME: zod schema and loader for src/content/specs.json — validated at build time, not at render.
// ABOUTME: Only 'published' disciplines render; if none are, the Technical Specs tab hides itself.

import { z } from 'zod';
import specsJson from '../content/specs.json';
import { DISCIPLINE_IDS } from './disciplines';
import type { DisciplineId, DisciplineSpec } from './types';

/* Three sections. Overview and glossary were cut deliberately (brief §3c) and
   the schema is strict, so re-adding one to the JSON fails the build rather
   than silently rendering a section the design does not have. */
const disciplineSpecSchema = z
  .object({
    status: z.enum(['draft', 'review', 'published']),
    frameworks: z.array(z.string()),
    metrics: z.array(z.string()),
    sources: z.array(z.string()),
  })
  .strict();

/* Keyed by exactly the 11 canonical ids — no more, no fewer. A typo'd key or a
   missing discipline is a build error, which is the whole point of putting the
   content in a validated file rather than in code. */
const specsSchema = z.object(
  Object.fromEntries(DISCIPLINE_IDS.map((id) => [id, disciplineSpecSchema])),
).strict();

const parsed = specsSchema.safeParse(specsJson);

if (!parsed.success) {
  // Thrown at module load, which during `astro build` means the build fails.
  // The owner edits this file by hand (docs/EDITING_SPECS.md), so the message
  // has to say what is wrong in terms of the file, not of zod.
  throw new Error(
    'src/content/specs.json is invalid. Every one of the 11 disciplines needs a ' +
      'status of draft | review | published and three string arrays ' +
      '(frameworks, metrics, sources).\n\n' +
      z.prettifyError(parsed.error),
  );
}

export const SPECS = parsed.data as Record<DisciplineId, DisciplineSpec>;

export function specFor(id: string): DisciplineSpec | undefined {
  return SPECS[id as DisciplineId];
}

/** True only for 'published'. draft/review render an in-development empty
 *  state — never placeholder bullets (AGENTS.md). */
export function isPublished(id: string): boolean {
  return specFor(id)?.status === 'published';
}

/** Drives whether the Technical Specs tab exists at all (brief §3c). At launch
 *  this is 0 and the tab is absent; it appears on its own as the owner promotes
 *  disciplines, with no code change. */
export const PUBLISHED_COUNT = Object.values(SPECS).filter(
  (s) => s.status === 'published',
).length;

export const HAS_ANY_PUBLISHED_SPECS = PUBLISHED_COUNT > 0;
