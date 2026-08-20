// ABOUTME: The 11 canonical disciplines — ids and display labels only.
// ABOUTME: Ingest keywords deliberately live in Supabase (news_discipline_topics), not here.

import type { DisciplineId } from './types';

export interface Discipline {
  id: DisciplineId;
  label: string;
}

/**
 * The 11 ids are frozen (AGENTS.md "Do not change") — they key the article
 * table, the specs file, the bookmark records, and the digest preferences.
 *
 * There is no keyword map here on purpose. The prototype's query terms move to
 * the `news_discipline_topics` Supabase table in Sprint 2 so coaches can retune
 * a discipline's feed without a deploy (brief §3e). Adding keywords back to
 * this file would put ingest behind a code change again.
 */
export const DISCIPLINES: readonly Discipline[] = [
  { id: 'finance', label: 'Finance' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'tax', label: 'Tax' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'digital-strategy', label: 'Digital Strategy' },
  { id: 'entrepreneurship', label: 'Entrepreneurship' },
  { id: 'hr', label: 'Human Resources' },
  { id: 'pom', label: 'POM' },
  { id: 'sustainability', label: 'Sustainability' },
  { id: 'international', label: 'International Business' },
] as const;

export const DISCIPLINE_IDS = DISCIPLINES.map((d) => d.id);

export function labelFor(id: string): string {
  return DISCIPLINES.find((d) => d.id === id)?.label ?? '';
}

export function isDisciplineId(value: string): value is DisciplineId {
  return DISCIPLINES.some((d) => d.id === value);
}
