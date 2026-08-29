// ABOUTME: The 33 discipline ids and labels across the four competition sections.
// ABOUTME: Ingest keywords deliberately live in Supabase (news_discipline_topics), not here.

/**
 * Every discipline belongs to exactly ONE competition. That is not a
 * simplification — it falls out of the source data. The website's registry
 * already distinguishes each competition's variant by slug (JDC's `tax` vs
 * FO's `taxation`, `accounting` vs `financial-accounting`, `marketing` vs
 * HM's `strategic-marketing`), so the 33 ids below are disjoint.
 *
 * That disjointness is what keeps this change cheap. Because an id names its
 * competition unambiguously, `competition` is DERIVED here rather than stored
 * alongside every article — no competition column, no composite key, no
 * migration, and every existing row keeps meaning what it meant.
 *
 * The first 11 are the original ids and are frozen (AGENTS.md): they key the
 * article table, the specs file, and the bookmark records. They are exactly
 * JDC/JDCC's news disciplines, which is why adding the other three sections is
 * additive rather than a renumbering.
 *
 * There is no keyword map here on purpose — it lives in the
 * `news_discipline_topics` Supabase table so coaches can retune a discipline's
 * feed without a deploy (brief §3e).
 */
export const DISCIPLINES = [
  // ── JDC / JDCC — the original eleven, unchanged ──
  { id: 'finance', label: 'Finance', competition: 'jdc' },
  { id: 'accounting', label: 'Accounting', competition: 'jdc' },
  { id: 'tax', label: 'Tax', competition: 'jdc' },
  { id: 'marketing', label: 'Marketing', competition: 'jdc' },
  { id: 'strategy', label: 'Strategy', competition: 'jdc' },
  { id: 'digital-strategy', label: 'Digital Strategy', competition: 'jdc' },
  { id: 'entrepreneurship', label: 'Entrepreneurship', competition: 'jdc' },
  { id: 'hr', label: 'Human Resources', competition: 'jdc' },
  { id: 'pom', label: 'POM', competition: 'jdc' },
  { id: 'sustainability', label: 'Sustainability', competition: 'jdc' },
  { id: 'international', label: 'International Business', competition: 'jdc' },

  // ── SMNG — Symposium en Management ──
  { id: 'change-management', label: 'Change Management', competition: 'smng' },
  { id: 'digital-transformation', label: 'Digital Transformation', competition: 'smng' },
  { id: 'human-resource-management', label: 'Human Resource Management', competition: 'smng' },
  { id: 'management-of-smes', label: 'SME Management', competition: 'smng' },
  { id: 'market-targeting', label: 'Market Targeting', competition: 'smng' },
  { id: 'mergers-acquisitions', label: 'Mergers & Acquisitions', competition: 'smng' },
  { id: 'project-management', label: 'Project Management', competition: 'smng' },

  // ── FO — Omnium Financier ──
  { id: 'cfa-ethics-challenge', label: 'CFA Ethics Challenge', competition: 'fo' },
  { id: 'corporate-finance', label: 'Corporate Finance', competition: 'fo' },
  { id: 'financial-accounting', label: 'Financial Accounting', competition: 'fo' },
  { id: 'financial-markets', label: 'Financial Markets', competition: 'fo' },
  { id: 'management-accounting', label: 'Management Accounting', competition: 'fo' },
  { id: 'personal-finance', label: 'Personal Finance', competition: 'fo' },
  { id: 'stock-market-simulation', label: 'Stock Market Simulation', competition: 'fo' },
  { id: 'taxation', label: 'Taxation', competition: 'fo' },

  // ── HM — Happening Marketing ──
  { id: 'b2b-marketing', label: 'B2B Marketing', competition: 'hm' },
  { id: 'digital-marketing', label: 'Digital Marketing', competition: 'hm' },
  { id: 'experiential-marketing', label: 'Experiential Marketing', competition: 'hm' },
  { id: 'hr-marketing', label: 'HR Marketing', competition: 'hm' },
  { id: 'international-marketing', label: 'International Marketing', competition: 'hm' },
  { id: 'request-for-agency-proposal', label: 'Request for Agency Proposal', competition: 'hm' },
  { id: 'strategic-marketing', label: 'Strategic Marketing', competition: 'hm' },
] as const;

/* Derived from the array rather than hand-written beside it. The two used to be
   maintained in lockstep — the union lived in types.ts — which meant adding a
   discipline was a compile error until someone remembered the second file.
   Note the array carries no type annotation: annotating it `readonly
   Discipline[]` would erase the literal types this depends on. */
export type DisciplineId = (typeof DISCIPLINES)[number]['id'];
export type CompetitionId = (typeof DISCIPLINES)[number]['competition'];

export interface Discipline {
  id: DisciplineId;
  label: string;
  competition: CompetitionId;
}

export const DISCIPLINE_IDS: readonly DisciplineId[] = DISCIPLINES.map((d) => d.id);

export function labelFor(id: string): string {
  return DISCIPLINES.find((d) => d.id === id)?.label ?? '';
}

export function isDisciplineId(value: string): value is DisciplineId {
  return DISCIPLINES.some((d) => d.id === value);
}

/** The competition a discipline belongs to. Total, because ids are disjoint. */
export function competitionOf(id: string): CompetitionId | undefined {
  return DISCIPLINES.find((d) => d.id === id)?.competition;
}

/** The pills for one section. Registration order, not alphabetical — the
 *  original eleven keep the order the dashboard has always shown them in. */
export function disciplinesIn(competition: string): readonly Discipline[] {
  return DISCIPLINES.filter((d) => d.competition === competition);
}
