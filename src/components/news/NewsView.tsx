// ABOUTME: The news feed — paginated article list plus the reports/subscribe rail.
// ABOUTME: Timestamps are honest: they come from ingested_at, never from a new Date() on mount.

import { useEffect, useState } from 'react';
import type { DisciplineId, FeedItem } from '../../lib/types';
import { labelFor } from '../../lib/disciplines';
import { relTime } from '../../lib/format';
import { ArticleCard } from './ui/ArticleCard';
import { Skeleton } from './ui/Skeleton';
import { Icon } from './ui/Icon';
import { ReportsPanel } from './ReportsPanel';
import { SubscribePanel } from './SubscribePanel';

const PAGE_SIZE = 12;

interface Props {
  discipline: DisciplineId;
  /** Already filtered by the AI toggle — this component does not re-filter. */
  articles: FeedItem[];
  aiOnly: boolean;
  clearAiFilter: () => void;
  reports: FeedItem[];
  isBookmarked: (id: string) => boolean;
  toggleBookmark: (item: FeedItem) => void;
}

/**
 * The prototype rendered `cached 30 min · last updated {relTime(now)}`, where
 * `now` was a new Date() set on mount — so it always said "just now" no matter
 * how stale the data was.
 *
 * Ingest actually runs once a day (see AGENTS.md — the Vercel Hobby plan
 * permits one cron run daily) and the free NewsData tier is on a 12-hour delay
 * on top of that, so this reads the newest ingested_at off the rows themselves. Until Sprint 2 the fixtures carry no ingested_at, and the honest
 * answer then is to say nothing about freshness rather than to invent it.
 */
function freshnessLine(articles: FeedItem[]): string | null {
  const stamps = articles.map((a) => a.ingestedAt).filter((s): s is string => Boolean(s));
  if (stamps.length === 0) return null;
  const newest = stamps.reduce((a, b) => (a > b ? a : b));
  return `Updated daily · last refresh ${relTime(newest)}`;
}

export function NewsView({
  discipline,
  articles,
  aiOnly,
  clearAiFilter,
  reports,
  isBookmarked,
  toggleBookmark,
}: Props) {
  const disciplineLabel = labelFor(discipline);

  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [refreshKey, setRefreshKey] = useState(0);

  // Sprint 0 runs on fixtures, so this is the prototype's simulated fetch. In
  // Sprint 3 it becomes a real query against Supabase — the refresh button
  // re-queries the database rather than hitting any external API (brief §10).
  useEffect(() => {
    setLoading(true);
    setVisible(PAGE_SIZE);
    const t = setTimeout(() => setLoading(false), 380);
    return () => clearTimeout(t);
  }, [discipline, refreshKey]);

  // Toggling the filter changes the list length, so paging restarts. It does
  // not re-trigger the fetch above — nothing was fetched.
  useEffect(() => setVisible(PAGE_SIZE), [aiOnly]);

  const shown = articles.slice(0, visible);
  const canLoadMore = visible < articles.length;
  const freshness = freshnessLine(articles);

  return (
    <div className="grid-2col">
      <section className="col-primary">
        <div className="section-head">
          <div>
            <div className="kicker meta">LIVE FEED</div>
            <h2 className="section-title">{disciplineLabel}</h2>
            <p className="section-sub" aria-live="polite">
              {loading
                ? 'Loading articles…'
                : `${articles.length} article${articles.length !== 1 ? 's' : ''}${aiOnly ? ' with an AI angle' : ''}${freshness ? ` · ${freshness}` : ''}`}
            </p>
          </div>
          <button className="ghost-btn" onClick={() => setRefreshKey((k) => k + 1)}>
            {Icon.refresh}
            <span>Refresh</span>
          </button>
        </div>

        <div className="article-list">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
          ) : shown.length === 0 ? (
            /* Two different problems, two different ways out: an empty
               discipline is worth retrying, an over-narrow filter is not. */
            aiOnly ? (
              <div className="empty">
                <p>No {disciplineLabel} articles have an AI angle right now.</p>
                <button className="ghost-btn" onClick={clearAiFilter}>
                  <span>Show all {disciplineLabel} articles</span>
                </button>
              </div>
            ) : (
              <div className="empty">
                <p>No recent articles found for {disciplineLabel}.</p>
                <button className="ghost-btn" onClick={() => setRefreshKey((k) => k + 1)}>
                  {Icon.refresh}
                  <span>Check again</span>
                </button>
              </div>
            )
          ) : (
            shown.map((a) => (
              <ArticleCard
                key={a.id}
                item={a}
                saved={isBookmarked(a.id)}
                onToggle={() => toggleBookmark(a)}
              />
            ))
          )}
        </div>

        {!loading && canLoadMore && (
          <div className="load-more-wrap">
            <button className="load-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Load more articles
              <span className="meta">({articles.length - visible} remaining)</span>
            </button>
          </div>
        )}
      </section>

      <aside className="col-rail">
        <ReportsPanel
          reports={reports}
          discipline={disciplineLabel}
          isBookmarked={isBookmarked}
          toggleBookmark={toggleBookmark}
        />
        <SubscribePanel />
      </aside>
    </div>
  );
}
