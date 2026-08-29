// ABOUTME: Root React island — owns theme, tab, discipline, bookmarks, and case history.
// ABOUTME: Mounted client:only, so reading localStorage and window during render is safe here.

import { useCallback, useEffect, useState } from 'react';
import type { Bookmark, DisciplineId, FeedItem, HistoryItem, Tab, Theme } from '../../lib/types';
import { isDisciplineId } from '../../lib/disciplines';
import { HAS_ANY_PUBLISHED_SPECS } from '../../lib/specs';
import { HAS_ANY_PUBLISHED_SPONSORS } from '../../lib/sponsors';
import { storage } from '../../lib/storage';
import { DashboardBar } from './DashboardBar';
import { DisciplineBar } from './DisciplineBar';
import { NewsView } from './NewsView';
import { SavedView } from './SavedView';
import { SpecsView } from './SpecsView';
import { SponsorsView } from './SponsorsView';

/* The prototype read window.location during render, which crashes on the
   server. This component is mounted with client:only="react" (brief §12), so
   there is no server render to crash — and no hydration mismatch from the
   localStorage initialisers below either. That directive is doing real work;
   do not swap it for client:load. */
function readQuery(): { discipline: DisciplineId; tab: Tab; aiOnly: boolean } {
  const p = new URLSearchParams(window.location.search);
  const d = p.get('discipline') ?? '';
  const t = p.get('tab') ?? '';
  return {
    discipline: isDisciplineId(d) ? d : 'finance',
    tab: t === 'specs' || t === 'sponsors' || t === 'saved' ? t : 'news',
    // In the URL so a filtered feed can be shared or bookmarked, the same way
    // the discipline already is.
    aiOnly: p.get('ai') === '1',
  };
}

function writeQuery(next: Record<string, string | null>) {
  const p = new URLSearchParams(window.location.search);
  Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
  const qs = p.toString();
  window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
}

export default function Dashboard() {
  const initial = readQuery();
  const [discipline, setDiscipline] = useState<DisciplineId>(initial.discipline);
  const [tab, setTab] = useState<Tab>(initial.tab);
  const [aiOnly, setAiOnly] = useState(initial.aiOnly);
  const [theme, setTheme] = useState<Theme>(() => storage.readTheme());
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => storage.readBookmarks());
  const [history, setHistory] = useState<HistoryItem[]>(() => storage.readHistory());

  useEffect(() => {
    storage.writeTheme(theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => storage.writeBookmarks(bookmarks), [bookmarks]);
  useEffect(() => storage.writeHistory(history), [history]);
  useEffect(() => {
    writeQuery({
      discipline,
      tab: tab === 'news' ? null : tab,
      ai: aiOnly ? '1' : null,
    });
  }, [discipline, tab, aiOnly]);

  /* With zero disciplines published the Technical Specs tab does not exist
     (brief §3c). A stale ?tab=specs URL would otherwise strand a reader on a
     tab with no way back, so it falls through to the feed. */
  useEffect(() => {
    if (tab === 'specs' && !HAS_ANY_PUBLISHED_SPECS) setTab('news');
    if (tab === 'sponsors' && !HAS_ANY_PUBLISHED_SPONSORS) setTab('news');
  }, [tab]);

  const isBookmarked = useCallback(
    (id: string) => bookmarks.some((b) => b.id === id),
    [bookmarks],
  );

  /* Accepts a FeedItem when saving and a Bookmark when un-saving from the Saved
     tab. Only the fields below are persisted — the shape maps 1:1 onto the
     Supabase table (AGENTS.md "Do not change"). */
  const toggleBookmark = useCallback((item: FeedItem | Bookmark) => {
    setBookmarks((curr) => {
      if (curr.some((b) => b.id === item.id)) return curr.filter((b) => b.id !== item.id);
      return [
        {
          id: item.id,
          type: item.type,
          title: item.title,
          source: item.source,
          url: item.url,
          discipline: item.discipline,
          savedAt: new Date().toISOString(),
          notes: '',
          tags: [],
        },
        ...curr,
      ];
    });
  }, []);

  const addToCaseHistory = useCallback((bm: Bookmark, fields: Partial<HistoryItem>) => {
    setHistory((curr) => [
      { ...bm, ...fields, savedAt: new Date().toISOString() },
      ...curr.filter((h) => h.id !== bm.id),
    ]);
  }, []);

  const removeFromCaseHistory = useCallback((id: string) => {
    setHistory((curr) => curr.filter((h) => h.id !== id));
  }, []);

  const updateCaseHistory = useCallback((id: string, fields: Partial<HistoryItem>) => {
    setHistory((curr) => curr.map((h) => (h.id === id ? { ...h, ...fields } : h)));
  }, []);

  /* Filtering happens in the database, not here: /api/news takes ?ai=1 and
     adds `where ai_relevant`. It is still a FILTER and not a sort — §3f's
     default is badge-don't-reorder, so the read query keeps published_at desc
     as the ordering in every case.

     The toggle itself lives in NewsView, beside Refresh: only the fetch knows
     how many articles matched, and the filter only ever affects the feed. */

  // Client-side so the date is the reader's, not the build machine's.
  const now = new Date();
  const edition = {
    label: String(
      Math.ceil(
        ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 +
          new Date(now.getFullYear(), 0, 1).getDay() +
          1) /
          7,
      ),
    ).padStart(2, '0'),
    dateStr: now.toLocaleDateString('en-CA', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  };

  return (
    <div className="app">
      <DashboardBar
        theme={theme}
        setTheme={setTheme}
        tab={tab}
        setTab={setTab}
        bookmarksCount={bookmarks.length}
        showSpecsTab={HAS_ANY_PUBLISHED_SPECS}
        showSponsorsTab={HAS_ANY_PUBLISHED_SPONSORS}
        edition={edition}
      />
      <DisciplineBar
        discipline={discipline}
        setDiscipline={(d) => {
          setDiscipline(d);
          // Both of these are whole-dashboard views rather than per-discipline
          // ones, so picking a discipline means the reader wants the feed.
          if (tab === 'saved' || tab === 'sponsors') setTab('news');
        }}
        disabled={tab === 'saved' || tab === 'sponsors'}
      />
      <main className="main">
        {tab === 'news' && (
          <NewsView
            discipline={discipline}
            aiOnly={aiOnly}
            setAiOnly={setAiOnly}
            isBookmarked={isBookmarked}
            toggleBookmark={toggleBookmark}
          />
        )}
        {tab === 'specs' && <SpecsView discipline={discipline} />}
        {tab === 'sponsors' && <SponsorsView />}
        {tab === 'saved' && (
          <SavedView
            bookmarks={bookmarks}
            history={history}
            toggleBookmark={toggleBookmark}
            addToCaseHistory={addToCaseHistory}
            removeFromCaseHistory={removeFromCaseHistory}
            updateCaseHistory={updateCaseHistory}
          />
        )}
      </main>
    </div>
  );
}
