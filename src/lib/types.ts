// ABOUTME: Shared data models — PRD §7, extended with sponsor_id and ai_relevant.
// ABOUTME: Feed items are read-only; Bookmark/HistoryItem are user state that maps 1:1 onto Supabase.

/** One of the 11 canonical discipline ids. Never a free string. */
export type DisciplineId =
  | 'finance'
  | 'accounting'
  | 'tax'
  | 'marketing'
  | 'strategy'
  | 'digital-strategy'
  | 'entrepreneurship'
  | 'hr'
  | 'pom'
  | 'sustainability'
  | 'international';

export type ItemType = 'article' | 'report';

/** A feed item. Title, description and URL only — never full article bodies
 *  (brief §10, Copyright). `discipline` is the human label; `disciplineId` is
 *  the key. Both are carried because bookmarks display the label after the
 *  source item is gone. */
export interface FeedItem {
  id: string; // h(url) — the ingest dedupe key
  type: ItemType;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string; // ISO 8601
  discipline: string;
  disciplineId: DisciplineId;
  /** Set at ingest by keyword match, never guessed at render time (brief §3f). */
  aiRelevant: boolean;
  /** Null for everything that is not sponsor-sourced (brief §3d). */
  sponsorId: string | null;
  pinned?: boolean;
  pinnedNote?: string;
  ingestedAt?: string;
}

/** Persisted to localStorage in v1 and to Supabase in v2. The shape is the
 *  contract between the two — do not change it without changing the schema. */
export interface Bookmark {
  id: string;
  type: ItemType;
  title: string;
  source: string;
  url: string;
  discipline: string;
  savedAt: string;
  notes: string;
  tags: string[];
}

/** A bookmark promoted into case-prep material. Same shape plus the user's own
 *  notes and tags, which is why HistoryItem is a Bookmark rather than a subset. */
export type HistoryItem = Bookmark;

export type Theme = 'light' | 'dark';
export type Tab = 'news' | 'specs' | 'saved';

/** Technical Specs, loaded from src/content/specs.json (brief §3c).
 *  Three sections only — overview and glossary were cut deliberately. */
export type SpecStatus = 'draft' | 'review' | 'published';

export interface DisciplineSpec {
  status: SpecStatus;
  frameworks: string[];
  metrics: string[];
  sources: string[];
}
