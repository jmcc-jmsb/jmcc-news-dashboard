// ABOUTME: The Saved tab — bookmarks and case history, with a debounced local search.
// ABOUTME: Everything here is localStorage-backed in v1 and Supabase-backed in v2.

import { useEffect, useMemo, useState } from 'react';
import type { Bookmark, HistoryItem } from '../../lib/types';
import { Icon } from './ui/Icon';
import { BookmarksSection } from './BookmarksSection';
import { HistorySection } from './HistorySection';

interface Props {
  bookmarks: Bookmark[];
  history: HistoryItem[];
  toggleBookmark: (item: Bookmark) => void;
  addToCaseHistory: (bm: Bookmark, fields: Partial<HistoryItem>) => void;
  removeFromCaseHistory: (id: string) => void;
  updateCaseHistory: (id: string, fields: Partial<HistoryItem>) => void;
}

/** Matches across every field a delegate might remember — title, source,
 *  discipline, their own notes, and their own tags. Module scope, so it is a
 *  stable reference and the useMemo deps below are honest. */
function matches(item: Bookmark, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    (item.title || '').toLowerCase().includes(needle) ||
    (item.source || '').toLowerCase().includes(needle) ||
    (item.discipline || '').toLowerCase().includes(needle) ||
    (item.notes || '').toLowerCase().includes(needle) ||
    (item.tags || []).join(',').toLowerCase().includes(needle)
  );
}

export function SavedView({
  bookmarks,
  history,
  toggleBookmark,
  addToCaseHistory,
  removeFromCaseHistory,
  updateCaseHistory,
}: Props) {
  const [sub, setSub] = useState<'bookmarks' | 'history'>('bookmarks');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const filteredBookmarks = useMemo(
    () => bookmarks.filter((b) => matches(b, debounced)),
    [bookmarks, debounced],
  );
  const filteredHistory = useMemo(
    () => history.filter((h) => matches(h, debounced)),
    [history, debounced],
  );

  const historyIds = useMemo(() => new Set(history.map((h) => h.id)), [history]);

  return (
    <div className="saved-layout">
      <header className="saved-head">
        <div>
          <div className="kicker meta">YOUR LIBRARY</div>
          <h2 className="section-title">Saved</h2>
          <p className="section-sub">
            Bookmarks &amp; case-prep notes · stored on this device · syncs to the Delegate
            Portal in v2.0
          </p>
        </div>
        <div className="search-bar">
          <span className="search-icon">{Icon.search}</span>
          <input
            type="search"
            placeholder="Search title, source, discipline, notes, tags…"
            aria-label="Search saved items"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="clear" onClick={() => setQuery('')} aria-label="Clear search">
              {Icon.close}
            </button>
          )}
        </div>
      </header>

      <div className="sub-tabs">
        <button
          className={'sub-tab ' + (sub === 'bookmarks' ? 'active' : '')}
          onClick={() => setSub('bookmarks')}
          aria-current={sub === 'bookmarks' ? 'true' : undefined}
        >
          <span>Bookmarks</span>
          <span className="meta count">
            {filteredBookmarks.length}
            {debounced && ` / ${bookmarks.length}`}
          </span>
        </button>
        <button
          className={'sub-tab ' + (sub === 'history' ? 'active' : '')}
          onClick={() => setSub('history')}
          aria-current={sub === 'history' ? 'true' : undefined}
        >
          <span>Case History</span>
          <span className="meta count">
            {filteredHistory.length}
            {debounced && ` / ${history.length}`}
          </span>
        </button>
      </div>

      {sub === 'bookmarks' && (
        <BookmarksSection
          list={filteredBookmarks}
          total={bookmarks.length}
          q={debounced}
          toggleBookmark={toggleBookmark}
          addToCaseHistory={addToCaseHistory}
          historyIds={historyIds}
        />
      )}
      {sub === 'history' && (
        <HistorySection
          list={filteredHistory}
          total={history.length}
          q={debounced}
          remove={removeFromCaseHistory}
          update={updateCaseHistory}
        />
      )}
    </div>
  );
}
