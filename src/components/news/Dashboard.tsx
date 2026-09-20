// ABOUTME: Root React island — owns theme, tab, discipline, bookmarks, and case history.
// ABOUTME: Mounted client:only, so reading localStorage and window during render is safe here.

import { useCallback, useEffect, useState } from 'react';
import type { Bookmark, DisciplineId, FeedItem, HistoryItem, Tab, Theme } from '../../lib/types';
import { competitionOf, disciplinesIn, isDisciplineId } from '../../lib/disciplines';
import { DEFAULT_COMPETITION, isCompetitionId } from '../../lib/competitions';
import { HAS_ANY_PUBLISHED_SPECS } from '../../lib/specs';
import { HAS_ANY_PUBLISHED_SPONSORS } from '../../lib/sponsors';
import { storage } from '../../lib/storage';
import { DashboardBar } from './DashboardBar';
import { CompetitionBar } from './CompetitionBar';
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
function readQuery(): {
  competition: string;
  discipline: DisciplineId;
  tab: Tab;
  aiOnly: boolean;
} {
  const p = new URLSearchParams(window.location.search);
  const d = p.get('discipline') ?? '';
  const c = p.get('competition') ?? '';
  const t = p.get('tab') ?? '';

  /* The discipline decides the competition, not the other way round: ids are
     disjoint across sections, so a discipline names its section unambiguously
     and a shared link cannot open with the two out of sync. An explicit
     ?competition is only consulted when the discipline is missing or unknown. */
  const discipline: DisciplineId = isDisciplineId(d) ? d : 'finance';
  const competition = isDisciplineId(d)
    ? (competitionOf(d) as string)
    : isCompetitionId(c)
      ? c
      : DEFAULT_COMPETITION;

  return {
    competition,
    discipline: isDisciplineId(d) ? discipline : (disciplinesIn(competition)[0].id as DisciplineId),
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

interface Props {
  /** Built URL of the JMCC shield. Passed in rather than imported so the
      optimised asset is chosen by the host page — the Portal copy of this
      island hands over its own. */
  logoSrc: string;
}

export default function Dashboard({ logoSrc }: Props) {
  const initial = readQuery();
  const [competition, setCompetition] = useState<string>(initial.competition);
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
      // Derivable from the discipline, so it stays out of the URL — one source
      // of truth, and no way to share a link whose two halves disagree.
      discipline,
      tab: tab === 'news' ? null : tab,
      ai: aiOnly ? '1' : null,
    });
  }, [discipline, tab, aiOnly]);

  /* Switching section moves to that section's first discipline. Sections share
     no disciplines, so the current one is never valid in the new section and
     leaving it would query a discipline the pills no longer show. */
  const changeCompetition = useCallback((next: string) => {
    setCompetition(next);
    setDiscipline(disciplinesIn(next)[0].id as DisciplineId);
    if (tab === 'saved') setTab('news');
  }, [tab]);

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

  return (
    <div className="app">
      <DashboardBar
        logoSrc={logoSrc}
        theme={theme}
        setTheme={setTheme}
        tab={tab}
        setTab={setTab}
        bookmarksCount={bookmarks.length}
        showSpecsTab={HAS_ANY_PUBLISHED_SPECS}
        showSponsorsTab={HAS_ANY_PUBLISHED_SPONSORS}
      />
      {/* Both bars are absent on Sponsors, not greyed out: sponsor profiles
          are not scoped to a competition or a discipline, so a disabled filter
          there is a control that could never have applied. Saved keeps its
          disabled bars — saved items ARE per-discipline, so the filter is
          meaningful, just not live. */}
      {tab !== 'sponsors' && (
        <>
          <CompetitionBar
            competition={competition}
            setCompetition={changeCompetition}
            discipline={discipline}
            disabled={tab === 'saved'}
          />
          <DisciplineBar
            discipline={discipline}
            setDiscipline={(d) => {
              setDiscipline(d);
              if (tab === 'saved') setTab('news');
            }}
            competition={competition}
            disabled={tab === 'saved'}
          />
        </>
      )}
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
