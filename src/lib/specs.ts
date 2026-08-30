// ABOUTME: zod schema and loader for src/content/specs.json — validated at build time, not at render.
// ABOUTME: Only 'published' disciplines render; if none are, the Technical Specs tab hides itself.

import { z } from 'zod';
import { PUBLIC_USE_FIXTURES } from 'astro:env/client';
import specsJson from '../content/specs.json';
import sampleSpecsJson from '../content/specs.sample.json';
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

/* A record, not a fixed-key object — the same call sponsors.ts makes, and for
   the same reason. It was `z.object(fromEntries(DISCIPLINE_IDS...))`, which
   makes every id REQUIRED; with the registry at 33 that would have demanded 22
   new stub entries in specs.json purely to satisfy a type. specs.json is owner
   content (AGENTS.md), and bulk-inserting empty stubs to make a schema pass is
   exactly what that rule forbids.

   Keys are still validated — an unknown key is a typo and fails the build —
   but a MISSING one is legitimate and means "not written yet". specFor() and
   isPublished() already return undefined/false for it and SpecsView already
   renders the in-development state, so an absent discipline degrades correctly
   with no component change. */
const specsSchema = z.record(z.string(), disciplineSpecSchema).superRefine((val, ctx) => {
  for (const key of Object.keys(val)) {
    if (!DISCIPLINE_IDS.includes(key as DisciplineId)) {
      ctx.addIssue({
        code: 'custom',
        message: `"${key}" is not a discipline id. Valid ids: ${DISCIPLINE_IDS.join(', ')}`,
      });
    }
  }
});

const parsed = specsSchema.safeParse(PUBLIC_USE_FIXTURES ? sampleSpecsJson : specsJson);

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

export const SPECS: Partial<Record<DisciplineId, DisciplineSpec>> = parsed.data;

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
  (s) => s?.status === 'published',
).length;

export const HAS_ANY_PUBLISHED_SPECS = PUBLISHED_COUNT > 0;

export const USING_SAMPLE_SPECS = PUBLIC_USE_FIXTURES;
