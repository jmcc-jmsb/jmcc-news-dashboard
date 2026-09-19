// ABOUTME: The news feed — reads /api/news and /api/reports, renders the rail, paginates locally.
// ABOUTME: Timestamps are honest: they come from ingested_at, never from a Date created on render.

import { useEffect, useState } from 'react';
import type { DisciplineId, FeedItem } from '../../lib/types';
import { labelFor } from '../../lib/disciplines';
import { relTime } from '../../lib/format';
import { useFeed } from '../../lib/use-feed';
import { ArticleCard } from './ui/ArticleCard';
import { Skeleton } from './ui/Skeleton';
import { SampleDataBanner } from './ui/SampleDataBanner';
import { Icon } from './ui/Icon';
import { ReportsPanel } from './ReportsPanel';
import { SponsorWatch } from './SponsorWatch';

const PAGE_SIZE = 12;

interface Props {
  discipline: DisciplineId;
  aiOnly: boolean;
  setAiOnly: (v: boolean) => void;
  isBookmarked: (id: string) => boolean;
  toggleBookmark: (item: FeedItem) => void;
}

/**
 * The prototype rendered `cached 30 min · last updated {relTime(now)}` from a
 * Date set on mount, so it always said "just now" no matter how stale the data
 * was. Freshness now comes from the newest ingested_at in the response, and
 * says nothing at all when there is none.
 */
function freshnessLine(lastIngestedAt: string | null): string | null {
  if (!lastIngestedAt) return null;
  return `Updated daily · last refresh ${relTime(lastIngestedAt)}`;
}

export function NewsView({
  discipline,
  aiOnly,
  setAiOnly,
  isBookmarked,
  toggleBookmark,
}: Props) {
  const disciplineLabel = labelFor(discipline);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh re-queries OUR API, which reads Supabase. It never hits NewsData
  // or Marketaux — the browser makes no external calls at all (brief §10).
  const feed = useFeed({ endpoint: '/api/news', discipline, aiOnly, limit: 60, refreshKey });
  const rail = useFeed({ endpoint: '/api/reports', discipline, limit: 8, refreshKey });

  useEffect(() => setVisible(PAGE_SIZE), [discipline, aiOnly, refreshKey]);

  const articles = feed.status === 'ready' ? feed.items : [];
  const articleCount = articles.length;

  // With the filter on, every loaded row matches by definition; with it off,
  // count the badged ones. Either way the number describes what is on screen,
  // so the toggle is never a blind guess that lands on an empty feed.
  const aiCount = aiOnly ? articleCount : articles.filter((a) => a.aiRelevant).length;

  const shown = articles.slice(0, visible);
  const canLoadMore = visible < articleCount;
  const freshness = feed.status === 'ready' ? freshnessLine(feed.lastIngestedAt) : null;

  const subline = (() => {
    if (feed.status === 'loading') return 'Loading articles…';
    if (feed.status === 'unavailable') return 'Feed unavailable';
    return `${articleCount} article${articleCount !== 1 ? 's' : ''}${
      aiOnly ? ' with an AI angle' : ''
    }${freshness ? ` · ${freshness}` : ''}`;
  })();

  return (
    <div className="grid-2col">
      <section className="col-primary">
        {feed.status === 'ready' && feed.origin === 'sample' && <SampleDataBanner />}

        <div className="section-head">
          <div>
            <div className="kicker meta">LIVE FEED</div>
            <h2 className="section-title">{disciplineLabel}</h2>
            <p className="section-sub" aria-live="polite">
              {subline}
            </p>
          </div>
          {/* Sits with Refresh, next to the discipline title, rather than at
              the far end of the discipline bar where it read as a 12th
              discipline and was easy to miss. It filters — it does NOT reorder
              (brief §3f); recency stays the primary sort in every case. */}
          <div className="section-actions">
            <button
              className={'ghost-btn ' + (aiOnly ? 'active' : '')}
              onClick={() => setAiOnly(!aiOnly)}
              disabled={aiCount === 0 && !aiOnly}
              aria-pressed={aiOnly}
              title={
                aiCount === 0
                  ? 'No articles with an AI angle in this discipline'
                  : `${aiCount} article${aiCount !== 1 ? 's' : ''} with an AI angle`
              }
            >
              <span>AI Angle</span>
              {aiCount > 0 && <span className="count">{aiCount}</span>}
            </button>
            <button className="ghost-btn" onClick={() => setRefreshKey((k) => k + 1)}>
              {Icon.refresh}
              <span>Refresh</span>
            </button>
            {/* Below 981px the rail stacks under the whole feed and "Load
                more", thousands of pixels down on a phone. CSS hides this
                link while the rail sits beside the feed. */}
            <a className="ghost-btn reports-link" href="#reports">
              <span>Reports</span>
              {rail.status === 'ready' && <span className="count">{rail.items.length}</span>}
            </a>
          </div>
        </div>

        <div className="article-list">
          {feed.status === 'loading' &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)}

          {/* An outage says so. Conflating it with "no articles today" is how a
              broken feed goes unnoticed until someone complains. */}
          {feed.status === 'unavailable' && (
            <div className="empty empty-large">
              <h4>The news feed is unavailable</h4>
              <p>{feed.reason}</p>
              <button className="ghost-btn" onClick={() => setRefreshKey((k) => k + 1)}>
                {Icon.refresh}
                <span>Try again</span>
              </button>
            </div>
          )}

          {feed.status === 'ready' &&
            shown.length === 0 &&
            (aiOnly ? (
              <div className="empty">
                <p>No {disciplineLabel} articles have an AI angle right now.</p>
                <button className="ghost-btn" onClick={() => setAiOnly(false)}>
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
            ))}

          {feed.status === 'ready' &&
            shown.map((a) => (
              <ArticleCard
                key={a.id}
                item={a}
                saved={isBookmarked(a.id)}
                onToggle={() => toggleBookmark(a)}
              />
            ))}
        </div>

        {canLoadMore && (
          <div className="load-more-wrap">
            <button className="load-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Load more articles
              <span className="meta">({articleCount - visible} remaining)</span>
            </button>
          </div>
        )}
      </section>

      <aside className="col-rail">
        <SponsorWatch
          articles={articles}
          isBookmarked={isBookmarked}
          toggleBookmark={toggleBookmark}
        />
        <ReportsPanel
          reports={rail.status === 'ready' ? rail.items : []}
          discipline={disciplineLabel}
          status={rail.status}
          isBookmarked={isBookmarked}
          toggleBookmark={toggleBookmark}
        />
      </aside>
    </div>
  );
}
