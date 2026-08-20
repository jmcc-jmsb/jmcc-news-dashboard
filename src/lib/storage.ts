// ABOUTME: localStorage persistence for theme, bookmarks, and case history.
// ABOUTME: The only module that touches localStorage — v2 swaps this for Supabase without touching components.

import type { Bookmark, HistoryItem, Theme } from './types';

/** Frozen keys (AGENTS.md "Do not change") — renaming one silently orphans
 *  every delegate's existing bookmarks. */
export const KEYS = {
  theme: 'jmcc_theme',
  bookmarks: 'jmcc_bookmarks',
  history: 'jmcc_case_history',
} as const;

/**
 * Every read is guarded. localStorage throws in Safari private mode and when a
 * quota is exhausted, and JSON.parse throws on anything a previous version (or
 * a user with devtools open) left behind. A dashboard that renders with default
 * state beats one that white-screens on a corrupt bookmark list.
 */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private mode. The in-memory state is still correct for this
    // session, so failing silently is better than interrupting the reader.
  }
}

export const storage = {
  readTheme: (): Theme => (read<Theme>(KEYS.theme, 'light') === 'dark' ? 'dark' : 'light'),
  writeTheme: (t: Theme) => write(KEYS.theme, t),

  readBookmarks: (): Bookmark[] => {
    const v = read<Bookmark[]>(KEYS.bookmarks, []);
    return Array.isArray(v) ? v : [];
  },
  writeBookmarks: (b: Bookmark[]) => write(KEYS.bookmarks, b),

  readHistory: (): HistoryItem[] => {
    const v = read<HistoryItem[]>(KEYS.history, []);
    return Array.isArray(v) ? v : [];
  },
  writeHistory: (h: HistoryItem[]) => write(KEYS.history, h),
};
